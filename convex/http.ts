import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, api } from "./_generated/api";

const http = httpRouter();

// --- Helper functions ---

function mapRetellOutcome(
  analysis: Record<string, unknown> | undefined
): string | undefined {
  if (!analysis) return undefined;
  const customData = analysis.custom_analysis_data as
    | Record<string, unknown>
    | undefined;
  if (!customData) return undefined;

  const outcome = customData.outcome as string | undefined;
  const validOutcomes = [
    "booked",
    "roadmap_requested",
    "free_tools",
    "low_intent",
    "abandoned",
    "error",
  ];
  if (outcome && validOutcomes.includes(outcome)) {
    return outcome;
  }

  // Infer from flags if outcome not explicitly set
  if (customData.roadmap_requested === true) return "roadmap_requested";
  if (customData.booking_confirmed === true) return "booked";
  return "low_intent";
}

interface TranscriptItem {
  role: string;
  content: string;
  words?: Array<{ word: string; start: number; end: number }>;
}

function parseTranscript(
  transcriptObject: TranscriptItem[] | undefined
): Array<{ role: string; content: string; timestamp: number }> {
  if (!transcriptObject || !Array.isArray(transcriptObject)) return [];

  return transcriptObject.map((item) => ({
    role: item.role === "agent" ? "agent" : "visitor",
    content: item.content ?? "",
    timestamp: item.words?.[0]?.start ?? 0,
  }));
}

async function verifyRetellSignature(
  body: string,
  signatureHeader: string,
  apiKey: string
): Promise<boolean> {
  // Header format: v={timestamp_ms},d={hex_digest}
  const parts: Record<string, string> = {};
  for (const part of signatureHeader.split(",")) {
    const [key, ...valueParts] = part.split("=");
    parts[key] = valueParts.join("=");
  }

  const timestamp = parts["v"];
  const digest = parts["d"];
  if (!timestamp || !digest) return false;

  // Freshness check: reject if older than 5 minutes
  const timestampMs = parseInt(timestamp, 10);
  if (isNaN(timestampMs) || Date.now() - timestampMs > 300_000) return false;

  // Compute HMAC-SHA256
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(apiKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(body + timestamp)
  );

  // Convert to hex
  const computedHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computedHex === digest;
}

// --- Retell webhook endpoint ---

http.route({
  path: "/webhooks/retell",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    // 1. Extract signature header
    const signatureHeader = req.headers.get("x-retell-signature");
    if (!signatureHeader) {
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { status: 401 }
      );
    }

    // 2. Read body
    const body = await req.text();

    // 3. Verify signature
    const apiKey = process.env.RETELL_API_KEY;
    if (!apiKey) {
      console.error("RETELL_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500 }
      );
    }

    const isValid = await verifyRetellSignature(body, signatureHeader, apiKey);
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401 }
      );
    }

    // 4. Parse body
    const data = JSON.parse(body) as {
      event: string;
      call: Record<string, unknown>;
    };
    const { event, call } = data;
    const callId = call.call_id as string;
    const agentId = (call.agent_id as string) ?? "unknown";
    const metadata = call.metadata as Record<string, unknown> | undefined;
    const callAnalysis = call.call_analysis as Record<string, unknown> | undefined;
    const transcriptObject = call.transcript_object as TranscriptItem[] | undefined;

    // 5. Handle events — both call_* (voice) and chat_* (text)
    switch (event) {
      case "call_started":
      case "chat_started": {
        await ctx.runMutation(internal.conversations.startConversation, {
          retellCallId: callId,
          modality: event.startsWith("chat") ? "text" : "voice",
          agentId,
          source: (metadata?.source as string) ?? undefined,
        });
        break;
      }

      case "call_ended":
      case "chat_ended": {
        const startTimestamp = call.start_timestamp as number | undefined;
        const endTimestamp = call.end_timestamp as number | undefined;
        const durationSeconds =
          endTimestamp && startTimestamp
            ? Math.round((endTimestamp - startTimestamp) / 1000)
            : undefined;

        await ctx.runMutation(internal.conversations.completeConversation, {
          retellCallId: callId,
          summary: (callAnalysis?.call_summary as string) ?? undefined,
          durationSeconds,
          recordingUrl: (call.recording_url as string) ?? undefined,
          publicLogUrl: (call.public_log_url as string) ?? undefined,
        });

        // Store transcript messages
        const messages = parseTranscript(transcriptObject);
        if (messages.length > 0) {
          await ctx.runMutation(internal.conversationMessages.storeMessages, {
            retellCallId: callId,
            messages,
          });
        }
        break;
      }

      case "call_analyzed":
      case "chat_analyzed": {
        const customData = (callAnalysis?.custom_analysis_data as Record<string, unknown>) ?? {};
        const visitorEmail = (customData.visitor_email as string) ?? undefined;
        const visitorName = (customData.visitor_name as string) ?? undefined;
        const painPoints = customData.pain_points as string[] | undefined;
        const qualificationScore = customData.qualification_score as number | undefined;
        const roadmapRequested = customData.roadmap_requested === true;
        const outcome = mapRetellOutcome(callAnalysis);

        await ctx.runMutation(internal.conversations.updateConversationOutcome, {
          retellCallId: callId,
          summary: (callAnalysis?.call_summary as string) ?? undefined,
          visitorEmail,
          visitorName,
          painPoints,
          qualificationScore,
          outcome,
          roadmapRequested,
        });

        // Schedule emails via scheduler (non-blocking)
        if (roadmapRequested) {
          ctx.scheduler.runAfter(
            0,
            internal.emails.sendRoadmapNotification,
            {
              visitorEmail: visitorEmail ?? "unknown",
              visitorName,
              summary: (callAnalysis?.call_summary as string) ?? undefined,
              painPoints,
              qualificationScore,
              durationSeconds: undefined,
              conversationId: callId,
              adminUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://icodemybusiness.com"}/admin/conversations`,
            }
          );
        }

        // HUBSPOT INTEGRATION POINT: after sending booking email, sync deal stage to "discovery_call_scheduled"
        if (outcome === "booked" && visitorEmail) {
          ctx.scheduler.runAfter(
            0,
            internal.emails.sendCalendlyBookingEmail,
            {
              email: visitorEmail,
              name: visitorName,
              painPoints,
              calendlyUrl:
                process.env.CALENDLY_URL ??
                "https://calendly.com/icodemybusiness/discovery",
            }
          );
        }
        break;
      }

      default:
        // Unknown event type — log but don't fail
        console.log(`Unhandled Retell event: ${event}`);
    }

    // 6. Log to audit log
    await ctx.runMutation(api.auditLog.logAuditEvent, {
      eventType: "retell." + event,
      actorId: "retell-webhook",
      details: JSON.stringify({ retellCallId: callId }),
      severity: "info",
    });

    // 7. Return success
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }),
});

export default http;
