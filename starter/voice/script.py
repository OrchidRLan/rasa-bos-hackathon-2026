"""The scripted user turns for the demo.

We pre-generate these as audio (Speechmatics TTS, 16 kHz) so the demo is
deterministic and never depends on a flaky live microphone on stage. Each line is
written so the Command Generator can naturally fill the support-ticket slots.
"""

USER_TURNS = [
    "Hi, I need to open a support ticket for my team.",
    "Our billing dashboard has been showing the wrong invoice totals for enterprise "
    "customers since this morning.",
    "Yes, it's a billing problem and it's urgent — finance can't close the books.",
    "Great, you can send updates to rod@example.com.",
]
