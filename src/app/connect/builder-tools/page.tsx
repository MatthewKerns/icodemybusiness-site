import type { Metadata } from "next";
import { LocalMcpInstall } from "@/components/shared/LocalMcpInstall";

export const metadata: Metadata = {
  title: "Software Builder Tools MCP — run it in Claude | iCodeMyBusiness",
  description:
    "Install the Software Builder Tools MCP server for Claude. A continuously-updated software-engineering best-practices guide — reference docs, skills, agents, and checklists — as tools. Open source, runs locally over stdio.",
  openGraph: {
    title: "Software Builder Tools MCP — run it in Claude",
    description:
      "Clone the open-source repo and point Claude at it: my continuously-updated best-practices guide as MCP tools. Runs locally over stdio.",
    type: "website",
  },
};

export default function ConnectBuilderToolsPage() {
  return <LocalMcpInstall />;
}
