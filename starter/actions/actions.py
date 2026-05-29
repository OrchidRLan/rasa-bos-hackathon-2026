"""Custom actions for the AI coworker.

Principle (from the Rasa playbook): flows own the *conversation logic*; actions do
the *raw work* and hand results back as slots for the flow to branch on.
"""

from typing import Any, Dict, List, Text

from rasa_sdk import Action, Tracker
from rasa_sdk.events import SlotSet
from rasa_sdk.executor import CollectingDispatcher

from actions.tickets import (
    load_tickets,
    new_ticket_id,
    normalise_ticket_id,
    save_tickets,
    utc_now,
)


class ActionCreateTicket(Action):
    def name(self) -> Text:
        return "action_create_ticket"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        tickets = load_tickets()
        ticket_id = new_ticket_id(tickets)
        tickets[ticket_id] = {
            "summary": tracker.get_slot("issue_summary"),
            "category": tracker.get_slot("issue_category"),
            "priority": tracker.get_slot("issue_priority"),
            "email": tracker.get_slot("contact_email"),
            "status": "open",
            "created_at": utc_now(),
        }
        save_tickets(tickets)
        return [SlotSet("ticket_id", ticket_id)]


class ActionLookupTicket(Action):
    def name(self) -> Text:
        return "action_lookup_ticket"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        ticket_id = normalise_ticket_id(tracker.get_slot("lookup_ticket_id"))
        ticket = load_tickets().get(ticket_id)
        if not ticket:
            return [
                SlotSet("ticket_found", False),
                SlotSet("lookup_ticket_id", ticket_id),
            ]
        return [
            SlotSet("ticket_found", True),
            SlotSet("lookup_ticket_id", ticket_id),
            SlotSet("ticket_status", ticket.get("status", "open")),
            SlotSet("ticket_summary", ticket.get("summary", "")),
        ]
