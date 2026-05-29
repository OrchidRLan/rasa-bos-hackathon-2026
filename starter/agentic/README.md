# Level 2 — Agentic (native Rasa ReAct sub-agent + MCP)

This adds an autonomous **ops_assistant** sub-agent that answers open-ended
"how do I..." questions by calling MCP tools in a reason→act→observe loop. It's
100% native Rasa — no LangGraph.

What's here:
- `sub_agents/ops_assistant/config.yml` — the ReAct sub-agent (uses `nebius_agent_llm`)
- `flows/ops_help.yml` — a thin flow that hands control to the sub-agent
- `servers/ops_mcp_server/` — a tiny MCP server with mock "runbook" tools

## Run it (4 terminals)

```bash
make run-mcp            # 1) MCP tool server on :8000
make run-actions        # 2) action server
make run-rasa-agentic   # 3) Rasa, with the sub-agent loaded
make demo-text          # 4) chat
```

(Train first with `make train-agentic`.)

Then ask: *"How do I investigate wrong invoice totals?"* — the sub-agent will
search the runbooks, pull RB-002, and answer from it.

Swap the mock MCP tools for your real APIs (Jira, Notion, internal search) to make
the coworker genuinely useful.
