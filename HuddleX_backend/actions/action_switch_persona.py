"""
action_switch_persona
─────────────────────
Called by:  switch_persona flow
Frontend:   VoiceCenter "Switch" button  →  POST /webhooks/rest/webhook
            {"sender": "<thread_id>", "message": "/switch_persona{\"target_persona_id\":\"elon_musk\"}"}
            ExpertsLibrary card click    →  same webhook with natural language
            "Switch to Elon" / "Talk to Sam Altman"

Returns a `custom` payload so the frontend can immediately update the active
expert avatar in VoiceCenter without waiting for a Rasa utter response.
"""

from typing import Any, Dict, List, Text

from rasa_sdk import Action, Tracker
from rasa_sdk.events import SlotSet
from rasa_sdk.executor import CollectingDispatcher

from actions.persona_store import get_persona_config, load_persona_data


class ActionSwitchPersona(Action):
    def name(self) -> Text:
        return "action_switch_persona"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        target = (tracker.get_slot("target_persona_id") or "").strip().lower().replace(" ", "_")

        cfg = get_persona_config(target)
        if cfg is None:
            # fuzzy: try matching display_name substring
            from actions.persona_store import load_persona_configs
            for p in load_persona_configs():
                if target in p["display_name"].lower() or target in p["id"]:
                    cfg = p
                    target = p["id"]
                    break

        if cfg is None:
            dispatcher.utter_message(text=f"I don't know an expert called '{target}'. "
                                     "Try one of: elon_musk, sam_altman, paul_graham, "
                                     "naval_ravikant, jensen_huang.")
            return []

        data = load_persona_data(cfg["id"]) or {}

        # Tell the frontend which expert is now active so VoiceCenter can update immediately
        dispatcher.utter_message(
            custom={
                "type": "persona_switched",
                "persona": {
                    "id": cfg["id"],
                    "display_name": cfg["display_name"],
                    "initials": cfg.get("initials", ""),
                    "avatar_color": cfg.get("avatar_color", ""),
                    "briefing": data.get("briefing", {}).get("text", ""),
                    "rime_voice_id": cfg.get("rime_voice_id", ""),
                },
            }
        )

        return [
            SlotSet("active_persona_id", cfg["id"]),
            SlotSet("target_persona_id", None),
        ]
