<div align="center">

<h1>🤖 Always-On AI Coworker Hackathon</h1>

<h3>Boston Tech Week 2026 · Hosted by <a href="https://rasa.com">Rasa</a> · Kendall Square</h3>

<p>
  <b>We're done with the 5-minute AI demo.</b><br/>
  Over two days we're building <b>persistent, long-term digital coworkers</b> — agents that handle real
  workflows, hold memory across long sessions, and integrate into a team's day without losing context or
  hallucinating under pressure.
</p>

<p>
  <a href="https://www.linkedin.com/in/profrodai/"><img src="https://img.shields.io/badge/Hosted_by-Rod-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" alt="Hosted by Rod"/></a>
  <a href="https://hello.rasa.ai"><img src="https://img.shields.io/badge/Try-Hello_Rasa-5A17EE?style=for-the-badge&logo=rasa&logoColor=white" alt="Try Hello Rasa"/></a>
  <a href="https://info.rasa.com/community"><img src="https://img.shields.io/badge/Join-Community-7C3AED?style=for-the-badge&logo=discourse&logoColor=white" alt="Join the Community"/></a>
  <a href="https://rasa.com/docs/"><img src="https://img.shields.io/badge/Read-Docs-1FA6A6?style=for-the-badge&logo=readthedocs&logoColor=white" alt="Read the Docs"/></a>
</p>

<p>
  <img src="https://img.shields.io/badge/Pitch_Deadline-Sat_05%2F30_·_4%3A00_PM-E11D48?style=for-the-badge" alt="Pitch deadline Saturday 5/30 4PM"/>
  <img src="https://img.shields.io/badge/Team_Size-Max_5-475569?style=for-the-badge" alt="Max team size 5"/>
</p>

<p>
  <a href="#-start-here">Quickstart</a> ·
  <a href="#-the-stack--resources">Stack</a> ·
  <a href="#-presentation--judging">Prizes</a> ·
  <a href="#-team-formation">Teams</a> ·
  <a href="starter/">Starter Template</a>
</p>

</div>

<hr/>

> [!IMPORTANT]
> **📶 Wi-Fi:** `TBD`  ·  **Password:** `TBD`
> **🗓️ Pitch submission deadline:** **Saturday 05/30, 4:00 PM**
> **💬 Community chat:** https://info.rasa.com/community

<a id="-start-here"></a>

## ⚡ Start Here — the Starter Template

> [!TIP]
> **Don't start from a blank repo.** We've shipped a best-of-breed scaffold in [`starter/`](starter/) —
> a working Rasa coworker with voice and agentic capabilities already wired up — so you can build
> *your* idea instead of boilerplate.

```bash
cd starter
cp .env.example .env      # paste your keys
make install
make verify               # full pre-flight: keys, deps, files, services
make train
# then, in three terminals:
make run-actions  |  make run-rasa  |  make demo-text
```

📖 **Full walkthrough:** [`starter/README.md`](starter/README.md)

### How it fits together

```
            ears                   brain                  voice
 user  ──▶  Speechmatics ASR  ──▶  Rasa CALM (agent)  ──▶  Rime TTS  ──▶  user
                                        │
                                        ├── Nebius Token Factory  (LLM inference)
                                        └── MCP tools (your APIs)  [Level 2: agentic]
```

The starter ships with deterministic flows (a support-ticket coworker), **cross-session memory**, a
**live voice loop**, and an optional **native Rasa ReAct sub-agent + MCP** level. Fork it and make it yours.

<hr/>

<a id="-the-stack--resources"></a>

## 🛠️ The Stack & Resources

To qualify for prizes, your continuous AI coworker should leverage **Rasa** alongside our partner ecosystem.

<div align="center">

<a href="https://rasa.com/docs/"><img src="https://img.shields.io/badge/Rasa-CALM-5A17EE?style=for-the-badge&logo=rasa&logoColor=white" alt="Rasa"/></a>
<a href="https://tokenfactory.nebius.com"><img src="https://img.shields.io/badge/Nebius-Token_Factory-1E293B?style=for-the-badge" alt="Nebius"/></a>
<a href="https://www.speechmatics.com"><img src="https://img.shields.io/badge/Speechmatics-ASR_+_TTS-00B4A0?style=for-the-badge" alt="Speechmatics"/></a>
<a href="https://rime.ai"><img src="https://img.shields.io/badge/Rime-TTS-FF5C39?style=for-the-badge" alt="Rime"/></a>
<a href="https://github.com/neuphonic/neutts"><img src="https://img.shields.io/badge/Neuphonic-Local_TTS-0EA5E9?style=for-the-badge" alt="Neuphonic"/></a>
<a href="https://github.com/arklexai/arksim"><img src="https://img.shields.io/badge/Arklex-arksim-64748B?style=for-the-badge" alt="Arklex"/></a>

</div>

### 🧠 Core framework — Rasa

Build conversational resilience and enterprise-grade context management with **CALM**.

| Resource | Link |
| :-- | :-- |
| 📚 Docs | https://rasa.com/docs/ |
| 🎮 Try Hello Rasa (no setup) | https://hello.rasa.ai |
| 🔑 Developer Edition license | https://rasa.com/rasa-pro-developer-edition-license-key-request |
| 🚀 Starter template | [`starter/`](starter/) |

### 🔌 LLM inference — Nebius Token Factory

All model inference in the starter runs on Nebius → https://tokenfactory.nebius.com
*Copy the exact model id / region from your console — names below are suggestions.*

| Role | Suggested models |
| :-- | :-- |
| **Command generator** (the agent's reasoning) | `Qwen3-235B-A22B-Instruct-2507` · `gpt-oss-120b` · `DeepSeek-V3.2` |
| **Agentic sub-agent** (tool calling) | `MiniMax-M2.5` · `Kimi-K2.6` · `GLM-5` |


<h3 align="center">
  <picture>
    <img alt="Rasa Banner" src="https://github.com/RasaHQ/.github/blob/readme/update-hello-rasa-community/assets/banner-rasa-1200x300.png?raw=true">
  </picture>
</h3>

### 🎙️ Voice & partner quickstarts

| Partner | Role | Link |
| :-- | :-- | :-- |
| **Speechmatics** | the coworker's *ears* (ASR + TTS) | https://www.speechmatics.com |
| **Rime** | the coworker's *voice* (TTS) | https://rime.ai |
| **Neuphonic** | free, local self-hosted TTS | https://github.com/neuphonic/neutts |
| **Arklex** | Simulation-based agent evals | https://github.com/arklexai/arksim |
| **Nebius** | State-of-the-art LLM Inference | https://tokenfactory.nebius.com/ |

> The starter wires Speechmatics + Rime + Nebius together for you. Swap in any partner.

<hr/>

<a id="-presentation--judging"></a>

## 🏆 Presentation & Judging

Your team gets **3 minutes** to pitch and demo tomorrow. **No slide decks** — we want to see live,
working (or spinning-up) code.

### Prizes

| 🏆 Prize | What wins it |
| :-- | :-- |
| **Most Resilient Long-Term Agent** | Retains memory and handles long context windows without hallucinating. |
| **Best Voice Coworker** | Clean audio, low latency, real triage / meetings. |
| **Most Creative Enterprise Use Case** | A genuinely practical back-office or operations workflow. |

### What to look for

- **🧠 Persistence & memory** — does it hold context across a long session?
- **🛡️ Resilience** — does it stay grounded instead of making things up under pressure?
- **🏢 Real workflow fit** — would a team actually use this?
- **⚙️ Built on Rasa** — projects on the Rasa stack get special consideration, especially for
  *Most Resilient Long-Term Agent*. The starter is the fast path here.

> The [starter README](starter/README.md) shows how each prize track maps to a concrete extension of the scaffold.

<hr/>

<a id="-team-formation"></a>

## 👥 Team Formation & Idea Board

Don't have a team?

1. Gather near the projector screen right after the keynote.
2. Post your ideas or skills in the [community chat](https://info.rasa.com/community).
3. Max team size: **5**.

<hr/>

## 📦 What's in This Repo

```
README.md     ← you are here (event source of truth)
starter/      ← the scaffold: clone it, fork it, ship it
  ├─ Rasa CALM flows + custom actions (+ persistent memory)
  ├─ voice/        Speechmatics ASR + Rime TTS over Rasa's REST API
  └─ agentic/      optional: native Rasa ReAct sub-agent + MCP tools
```

<div align="center">

<br/>

### Now go build something that lasts. 🚀

<a href="#-always-on-ai-coworker-hackathon"><img src="https://img.shields.io/badge/⬆-Back_to_top-475569?style=for-the-badge" alt="Back to top"/></a>

</div>