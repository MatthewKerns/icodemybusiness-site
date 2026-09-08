# Ledger — `/connect/builder-tools`

Extracted from the live page 2026-09-08, document order (45 lines incl. shared header/footer, reviewed once in `shared.md`). Verdicts are the agent's; the `Matthew` column is his ruling, verbatim.

| # | Line | Verdict | Why | Matthew |
|---|---|---|---|---|
| 001 | Software Builder Tools MCP — run it in Claude \| iCodeMyBusiness | | | |
| 002 | iCodeMyBusiness | | | |
| 003 | Academy | | | |
| 004 | Free Intro Call | | | |
| 005 | Consulting | | | |
| 006 | Free Tools | | | |
| 007 | Connect | | | |
| 008 | Mango | | | |
| 009 | Services | | | |
| 010 | Book a Call | | | |
| 011 | Free local MCP server | | | |
| 012 | Run the Software Builder Tools MCP | | | |
| 013 | My continuously-updated engineering best-practices guide — reference sections, skills, agents, and checklists — as callable tools inside Claude. It runs locally over stdio: clone the repo, point Claude at it, done. Open source (MIT) · needs Node 18+ and git · about 2 minutes | | | |
| 014 | Clone the repo | | | |
| 015 | Grab the open-source guide + MCP server from GitHub (MIT licensed). | | | |
| 016 | Terminal git clone https://github.com/MatthewKerns/software-development-best-practices-guide.git | | | |
| 017 | Install dependencies | | | |
| 018 | Step into the folder and install — just three small packages. | | | |
| 019 | Terminal cd software-development-best-practices-guide && npm install | | | |
| 020 | Add it to Claude Code | | | |
| 021 | Register the server over stdio. Run this from inside the cloned folder so the path resolves automatically. | | | |
| 022 | Terminal claude mcp add software-builder-tools -- node "$(pwd)/mcp/server.mjs" | | | |
| 023 | Verify it's connected | | | |
| 024 | Confirm the server is registered. After restarting Claude, its tools are available in any chat. | | | |
| 025 | Terminal claude mcp list | | | |
| 026 | Using Claude Desktop instead? | | | |
| 027 | Add this to your claude_desktop_config.json (swap in the absolute path to where you cloned the repo), then restart Claude Desktop. | | | |
| 028 | claude_desktop_config.json { "mcpServers": { "software-builder-tools": { "command": "node", "args": [ "/absolute/path/to/software-development-best-practices-guide/mcp/server.mjs" ] } } } | | | |
| 029 | What you get | | | |
| 030 | Six tools that read straight from the guide — so the answers reflect the latest version, not a snapshot. get_best_practice | | | |
| 031 | Search the guide by topic and get the best-matching doc back. read_guide | | | |
| 032 | Read any specific reference doc by its path. list_patterns | | | |
| 033 | Discover every section, skill, agent, and checklist available. get_checklist | | | |
| 034 | Pull a quick-reference checklist (code review, SOLID, TDD…). scaffold_agents_md | | | |
| 035 | Generate the AGENTS.md template for a repo. validate_flag_registry | | | |
| 036 | Lint a feature-flag registry against the guide's rules. | | | |
| 037 | Always current, by design | | | |
| 038 | The guide behind this server is the same one I maintain and update as my own practices evolve — pull the repo to get the latest. A one-click hosted connector is on the way; for now this local setup gives you the full toolset. | | | |
| 039 | Browse all free tools | | | |
| 040 | View on GitHub | | | |
| 041 | Save time. Make money. Make a difference. | | | |
| 042 | matthew@icodemybusiness.com | | | |
| 043 | Pages | | | |
| 044 | Join the Inner Circle | | | |
| 045 | → © 2026 iCodeMyBusiness. All rights reserved. | | | |
