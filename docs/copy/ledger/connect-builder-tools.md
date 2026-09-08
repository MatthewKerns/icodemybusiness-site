# Ledger — `/connect/builder-tools`

Extracted from the live page 2026-09-08, document order (45 lines incl. shared header/footer, reviewed once in `shared.md`). Verdicts are the agent's; the `Matthew` column is his ruling, verbatim.

| # | Line | Verdict | Why | Matthew |
|---|---|---|---|---|
| 001 | Software Builder Tools MCP — run it in Claude \| iCodeMyBusiness | keep | No claim, no rule touched. | |
| 002 | iCodeMyBusiness | shared | Header/footer/banner/form — ruled once in shared.md. | |
| 003 | Academy | shared | Header/footer/banner/form — ruled once in shared.md. | |
| 004 | Free Intro Call | shared | Header/footer/banner/form — ruled once in shared.md. | |
| 005 | Consulting | shared | Header/footer/banner/form — ruled once in shared.md. | |
| 006 | Free Tools | shared | Header/footer/banner/form — ruled once in shared.md. | |
| 007 | Connect | shared | Header/footer/banner/form — ruled once in shared.md. | |
| 008 | Mango | shared | Header/footer/banner/form — ruled once in shared.md. | |
| 009 | Services | shared | Header/footer/banner/form — ruled once in shared.md. | |
| 010 | Book a Call | shared | Header/footer/banner/form — ruled once in shared.md. | |
| 011 | Free local MCP server | keep | No claim, no rule touched. | |
| 012 | Run the Software Builder Tools MCP | keep | No claim, no rule touched. | |
| 013 | My continuously-updated engineering best-practices guide — reference sections, skills, agents, and checklists — as callable tools inside Claude. It runs locally over stdio: clone the repo, point Claude at it, done. Open source (MIT) · needs Node 18+ and git · about 2 minutes | keep | No claim, no rule touched. | |
| 014 | Clone the repo | keep | No claim, no rule touched. | |
| 015 | Grab the open-source guide + MCP server from GitHub (MIT licensed). | keep | No claim, no rule touched. | |
| 016 | Terminal git clone https://github.com/MatthewKerns/software-development-best-practices-guide.git | keep | No claim, no rule touched. | |
| 017 | Install dependencies | keep | No claim, no rule touched. | |
| 018 | Step into the folder and install — just three small packages. | keep | No claim, no rule touched. | |
| 019 | Terminal cd software-development-best-practices-guide && npm install | keep | No claim, no rule touched. | |
| 020 | Add it to Claude Code | keep | No claim, no rule touched. | |
| 021 | Register the server over stdio. Run this from inside the cloned folder so the path resolves automatically. | keep | No claim, no rule touched. | |
| 022 | Terminal claude mcp add software-builder-tools -- node "$(pwd)/mcp/server.mjs" | keep | No claim, no rule touched. | |
| 023 | Verify it's connected | keep | No claim, no rule touched. | |
| 024 | Confirm the server is registered. After restarting Claude, its tools are available in any chat. | keep | No claim, no rule touched. | |
| 025 | Terminal claude mcp list | keep | No claim, no rule touched. | |
| 026 | Using Claude Desktop instead? | keep | No claim, no rule touched. | |
| 027 | Add this to your claude_desktop_config.json (swap in the absolute path to where you cloned the repo), then restart Claude Desktop. | keep | No claim, no rule touched. | |
| 028 | claude_desktop_config.json { "mcpServers": { "software-builder-tools": { "command": "node", "args": [ "/absolute/path/to/software-development-best-practices-guide/mcp/server.mjs" ] } } } | keep | No claim, no rule touched. | |
| 029 | What you get | keep | No claim, no rule touched. | |
| 030 | Six tools that read straight from the guide — so the answers reflect the latest version, not a snapshot. get_best_practice | keep | No claim, no rule touched. | |
| 031 | Search the guide by topic and get the best-matching doc back. read_guide | keep | No claim, no rule touched. | |
| 032 | Read any specific reference doc by its path. list_patterns | keep | No claim, no rule touched. | |
| 033 | Discover every section, skill, agent, and checklist available. get_checklist | keep | No claim, no rule touched. | |
| 034 | Pull a quick-reference checklist (code review, SOLID, TDD…). scaffold_agents_md | keep | No claim, no rule touched. | |
| 035 | Generate the AGENTS.md template for a repo. validate_flag_registry | keep | No claim, no rule touched. | |
| 036 | Lint a feature-flag registry against the guide's rules. | keep | No claim, no rule touched. | |
| 037 | Always current, by design | keep | No claim, no rule touched. | |
| 038 | The guide behind this server is the same one I maintain and update as my own practices evolve — pull the repo to get the latest. A one-click hosted connector is on the way; for now this local setup gives you the full toolset. | ask | 'A one-click hosted connector is on the…' (truncated: 'on the way'?) — a 'coming soon' promise; tools.icodemybusiness.com is NXDOMAIN (memory). Keep only if you intend to host it; otherwise cut the sentence. | |
| 039 | Browse all free tools | keep | No claim, no rule touched. | |
| 040 | View on GitHub | keep | No claim, no rule touched. | |
| 041 | Save time. Make money. Make a difference. | shared | Header/footer/banner/form — ruled once in shared.md. | |
| 042 | matthew@icodemybusiness.com | shared | Header/footer/banner/form — ruled once in shared.md. | |
| 043 | Pages | shared | Header/footer/banner/form — ruled once in shared.md. | |
| 044 | Join the Inner Circle | shared | Header/footer/banner/form — ruled once in shared.md. | |
| 045 | → © 2026 iCodeMyBusiness. All rights reserved. | shared | Header/footer/banner/form — ruled once in shared.md. | |
