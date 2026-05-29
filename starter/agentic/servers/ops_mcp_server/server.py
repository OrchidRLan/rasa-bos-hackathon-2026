"""A tiny MCP server exposing mock "internal runbooks" so the ops_assistant
sub-agent has something real to call. Replace these tools with your own APIs.

Run:  make run-mcp   ->  http://localhost:8000/mcp
"""

import json
from pathlib import Path

from fastmcp import FastMCP

RUNBOOKS = json.loads((Path(__file__).parent / "runbooks.json").read_text(encoding="utf-8"))
mcp = FastMCP("Ops Tools")


@mcp.tool()
def search_runbooks(query: str) -> str:
    """Search internal runbooks by keyword. Returns matching ids and titles."""
    q = query.lower()
    hits = [
        {"id": r["id"], "title": r["title"], "tags": r["tags"]}
        for r in RUNBOOKS
        if q in r["title"].lower() or any(q in t for t in r["tags"]) or any(t in q for t in r["tags"])
    ]
    return json.dumps({"results": hits or [{"note": "no exact match", "all": [r["id"] for r in RUNBOOKS]}]})


@mcp.tool()
def get_runbook(runbook_id: str) -> str:
    """Fetch the full body of a runbook by id, e.g. RB-002."""
    for r in RUNBOOKS:
        if r["id"].lower() == runbook_id.strip().lower():
            return json.dumps(r)
    return json.dumps({"error": f"Runbook {runbook_id} not found."})


if __name__ == "__main__":
    print("Ops Tools MCP server -> http://localhost:8000/mcp")
    mcp.run(transport="http", host="0.0.0.0", port=8000, path="/mcp")
