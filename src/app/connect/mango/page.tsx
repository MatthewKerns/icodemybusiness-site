import type { Metadata } from "next";
import { ConnectorSetup } from "@/components/shared/ConnectorSetup";

export const metadata: Metadata = {
  title: "Add Mango to Claude — free Claude Connector | iCodeMyBusiness",
  description:
    "Connect Mango to Claude in under a minute. Step-by-step instructions to add the Mango Claude Connector — no account, no login, no credit card.",
  openGraph: {
    title: "Add Mango to Claude — free Claude Connector",
    description:
      "Add the Mango Claude Connector and use its tools in any Claude chat. No account, no login, no credit card.",
    type: "website",
  },
};

export default function ConnectMangoPage() {
  return (
    <ConnectorSetup
      eyebrow="Free Claude Connector"
      title="Add Mango to Claude"
      intro="Mango becomes a connector inside Claude — its tools show up in any chat, ready to use. Adding it takes about a minute, and there's nothing to sign up for."
      connectorName="Mango"
      mcpUrl="https://mango.icodemybusiness.com/mcp"
      urlLabel="Connector link"
      claudeCodeId="mango"
      noLoginNote="No account, no login, no credit card."
      steps={[
        {
          title: "Open your Claude settings",
          body: "In Claude — the desktop app or claude.ai in your browser — click your name in the bottom-left corner and choose Settings.",
        },
        {
          title: "Go to Connectors",
          body: "Open Connectors, then click the + and choose Add custom connector. In some versions of Claude this lives under a Customize button — either way, you're looking for “custom connector.”",
        },
        {
          title: "Name it and paste the link",
          body: "Name it Mango, paste the connector link below, and click Add. There's nothing to log into.",
        },
        {
          title: "You're connected",
          body: "Mango now appears in your connectors with its full set of tools. Start a new chat and just ask — Claude will use Mango automatically.",
        },
      ]}
      closingTitle="That's it — you're set"
      closingBody="No account, no credit card, nothing to install. If anything looks different in your version of Claude, the step you want is always “add a custom connector” — then paste the link above."
    />
  );
}
