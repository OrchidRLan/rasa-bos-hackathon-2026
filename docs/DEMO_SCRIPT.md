# HuddleX — Demo Script

---

## Opening (15 sec)

**HuddleX** is a voice-first AI advisor that lets you build your own personal board of experts — thinkers like Elon Musk, Paul Graham, or Naval Ravikant — and have real conversations with them, by voice or by text, grounded in their actual words, writings, and thinking style.

You don't just get generic AI answers.
You get Elon telling you to move faster. Paul telling you your idea is boring. Naval reminding you that leverage beats effort.

Let me show you how it works.

---

## Part 1 — User Profile (30 sec)

> *[Point to the User Info panel on the left sidebar]*

First, HuddleX learns who you are.

I'll click **Edit** and fill in my profile — my name, my role as a founder, and my interests: AI products, go-to-market, fundraising.

> *[Type in name: "Alex Chen", role: "Early-stage founder", interests: "AI, GTM, fundraising"]*

This profile is injected into every conversation. So when I ask Sam Altman about hiring, he already knows I'm building a small team with limited runway — he won't give me advice meant for a Fortune 500 company.

Every expert on this team knows exactly who they're advising.

---

## Part 2 — Expert Library (45 sec)

> *[Point to the Experts panel]*

On the left, here's my expert team. I've got Elon Musk, Sam Altman, Paul Graham, Naval Ravikant, and Jensen Huang — each one distilled from their public posts, Wikipedia, writings, and our own 6-dimension cognitive framework.

Every card shows you their latest briefing — what they've been focused on recently, pulled from live X posts every 6 hours.

I can **expand any card** to see their data sources: their X handle, their Wikipedia page, when they were last updated.

> *[Expand a card to show X source, Wikipedia, Last Updated]*

Now — what if I want to add someone new to my team?

> *[Click the "+" button to open AddExpertModal]*

Let's add **Richard Feynman** as my scientific thinking advisor.

I'll enter his name, his Wikipedia URL.

> *[Type: "Richard Feynman", paste Wikipedia URL]*

Watch what happens. HuddleX's distillation engine — we call it **Nüwa** — kicks off a 4-phase pipeline:

1. It fetches and reads Feynman's Wikipedia page
2. It runs **6 parallel LLM analyses** — his writings, his conversational style, his decision patterns, his expression DNA, how others describe him, his life arc
3. It synthesizes all of that into a **cognitive framework**: his mental models, signature phrases, how he structures arguments, what he'd never say
4. It embeds everything into a vector database so his answers are grounded in what he actually said

> *[Show the 3-step progress UI: Fetching → Analyzing → Done]*

About 35 seconds. And now Feynman is on my team — ready to talk, fully in character.

---

## Part 3 — Voice Conversation (60 sec)

> *[Switch to ChatPanel, select Elon Musk from the expert dropdown]*

Now let's have a real conversation.

I'm going to open a new chat — **"Fundraising strategy"** — and ask Elon something specific.

> *[Create a new thread, title it "Fundraising strategy"]*

I'll toggle on **voice mode**.

> *[Click the mic button to enable voice mode — show the "Listening…" badge]*

**[Speak:]** *"Elon, I'm raising a seed round. Investors keep asking me to wait until I have more traction. Should I wait, or push to close now?"*

> *[Wait for VAD to auto-submit — show "Transcribing…" → "Sending…" → reply appears]*

Watch the chat bubble.

Elon replies — and notice these **context badges** under his answer:
- **5 knowledge chunks** — specific posts and framework excerpts he used
- **Profile loaded** — he factored in that I'm an early-stage founder with limited runway
- **No team context yet** — because this is the only expert in this thread so far

> *[Point to Brain / Users / UserCircle icons]*

When voice mode is on, his reply is also **read aloud** — using his own ElevenLabs voice profile. The mic automatically mutes while he speaks so there's no echo, then opens back up when he's done. Fully hands-free.

Now I want a second opinion. I'll switch to **Paul Graham** in the dropdown.

> *[Switch expert in dropdown to Paul Graham]*

**[Speak:]** *"Paul, same question — close the round now or wait for more traction?"*

> *[Reply appears with a different voice]*

Now Paul's bubble shows **1 team exchange** — he can see what Elon just said, and he can agree, push back, or build on it. That's the power of having a team, not just a chatbot.

---

## Part 4 — File Upload (30 sec)

> *[Stay in ChatPanel, switch to Naval Ravikant]*

One more thing. Let's say I have a pitch deck I want Naval to review.

> *[Click the 📎 paperclip button, attach a PDF]*

I'll attach my one-pager — Naval pulls the text from the PDF directly.

> *[Show file preview chip: "pitch_deck.pdf (42.3 KB)"]*

**[Type:]** *"Naval, read this and tell me if the business model makes sense from a leverage standpoint."*

> *[Send — show context badges: "4 chunks · profile loaded · no team context"]*

Naval answers with his actual thinking style — direct, philosophical, focused on leverage and compounding — but grounded in the document I just gave him.

---

## Closing (15 sec)

So: HuddleX gives you a personal board of advisors that know who you are, remember your conversations, and stay current on what each expert is actually saying in the world.

Add any expert in 35 seconds. Ask by voice or text. Keep each topic in its own thread. Get answers grounded in real thinking, not hallucinated noise.

**Your expert team. Always on.**

---

## Demo Cheat Sheet

| Step | Action | What to highlight |
|------|--------|-------------------|
| Profile | Fill in name, role, interests | "Every expert knows who they're advising" |
| Expert Library | Expand a card | X source, Wikipedia, Last Updated, System Prompt |
| Add Expert | Type Feynman + Wikipedia URL | 4-phase Nüwa pipeline, ~35s |
| Voice chat | Enable mic, ask Elon about fundraising | VAD auto-submit, context badges, voice reply |
| Team context | Switch to Paul Graham, ask same Q | "1 team exchange" badge |
| File upload | Attach PDF, ask Naval | File extraction → injected into prompt |

**Time budget:** ~3 minutes end-to-end for a tight demo; 5 minutes with audience questions after each step.
