import type { Metadata } from "next";
import { ConnectorSetup } from "@/components/shared/ConnectorSetup";

export const metadata: Metadata = {
  title: "Add Mango to Claude — free Claude Connector | iCodeMyBusiness",
  description:
    "Add Mango to Claude as a custom connector and drive your whole workspace from any chat — ranked to-dos, time, meetings, invoices, and planning. Step-by-step, with the MCP URL and suggested name.",
  openGraph: {
    title: "Add Mango to Claude — free Claude Connector",
    description:
      "Add the Mango connector to Claude and ask “What should I focus on today?” Grounded in your own data, scoped to you.",
    type: "website",
  },
};

export default function ConnectMangoPage() {
  return (
    <ConnectorSetup
      eyebrow="Free Claude Connector"
      title="Add Mango to Claude"
      intro="Mango becomes a connector inside Claude — your objectives, to-dos, time, meetings, and planning show up as tools in any chat. You sign in once so the connection acts as you, and only ever sees your data."
      connectorName="Mango"
      mcpUrl="https://mango.icodemybusiness.com/mcp"
      urlLabel="Remote MCP server URL"
      claudeCodeCommand={
        'claude mcp add --transport http mango https://mango.icodemybusiness.com/mcp --header "Authorization: Bearer mps_your_key_here"'
      }
      claudeCodeNote="Your push key comes from your Mango account — it scopes every tool to your own data, exactly like the connector flow."
      note="Sign in once to authorize — Claude only ever sees your data, scoped to you."
      steps={[
        {
          title: "Open Settings → Connectors",
          body: "In claude.ai (or Claude Desktop), go to Settings → Connectors, then click Add custom connector. On some plans this lives under a Customize button.",
          image: "/img/connector/step-1-settings.svg",
          imageAlt:
            "Claude Settings on the Connectors tab, with the Add custom connector button highlighted.",
        },
        {
          title: "Paste the MCP URL",
          body: "Name it Mango, paste the remote MCP server URL below into the server-URL field, and click Add.",
          image: "/img/connector/step-2-add-connector.svg",
          imageAlt:
            "The Add custom connector dialog with the name Mango and the Mango MCP server URL pasted in.",
        },
        {
          title: "Sign in to authorize",
          body: "Claude opens Mango in a popup. Sign in and click Authorize — this binds the connector to your account. No data is shared until you do.",
          image: "/img/connector/step-3-authorize.svg",
          imageAlt:
            "The Mango sign-in and authorize screen granting Claude access to your data.",
        },
        {
          title: "Connected — start using it",
          body: "Mango's tools are now available in every chat. Try “What should I focus on today?” or “What am I building toward in 3 years?”",
          image: "/img/connector/step-4-connected.svg",
          imageAlt:
            "Mango connected in Claude, with its tools available inside a chat.",
        },
      ]}
      asksTitle="What you can ask"
      asksLede="Mango exposes your whole workspace as tools — objectives, to-dos, time, meetings, and planning across every horizon."
      asks={[
        {
          title: "Plan the day",
          ask: "What should I focus on today?",
          detail: "Your ranked cross-client to-do, with sources.",
        },
        {
          title: "Catch up fast",
          ask: "Anything new since I looked?",
          detail: "Latest Slack DMs & meeting recaps, newest first.",
        },
        {
          title: "Check the week",
          ask: "Am I on pace this week?",
          detail: "Objective hours vs. your Sunday-locked plan.",
        },
        {
          title: "Think long-term",
          ask: "What am I building toward in 3 years?",
          detail: "Capture or check off goals across every horizon.",
        },
        {
          title: "Know the numbers",
          ask: "Where am I in the invoice cycle?",
          detail: "Hours, earnings, and projections.",
        },
        {
          title: "Stay grounded",
          ask: "What did we agree with this client?",
          detail: "Contracts, rocks, and meeting context.",
        },
      ]}
      advanced={{
        name: "The Anytime Status Agent",
        blurb:
          "Give a client an always-on agent that answers “are we on track?” from status you preview and publish — you control the narrative.",
        price: "Coming soon",
      }}
      closingTitle="Don't see “Add custom connector”?"
      closingBody="Custom connectors are rolling out across Claude plans. If it's not in your Settings yet, use the Claude Code command above — it works today — and check back. Either way, no credit card to start."
    />
  );
}
