import { NextResponse } from "next/server";
import Retell from "retell-sdk";
import { withErrorHandler, InternalError } from "@/lib/api-error-handler";

export const POST = withErrorHandler(async () => {
  const apiKey = process.env.RETELL_API_KEY;
  const agentId = process.env.RETELL_AGENT_ID;

  if (!apiKey || !agentId) {
    throw new InternalError("Retell API not configured");
  }

  const client = new Retell({ apiKey });

  const { access_token } = await client.call.createWebCall({
    agent_id: agentId,
  });

  return NextResponse.json({ access_token });
});
