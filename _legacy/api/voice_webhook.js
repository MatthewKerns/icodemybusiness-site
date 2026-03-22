/**
 * Voice webhook handler for Vapi events.
 * Processes incoming call events and triggers appropriate actions.
 */

import express from 'express';
import { ConvexHttpClient } from "convex/browser";
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const convex = new ConvexHttpClient(process.env.CONVEX_URL);

/**
 * POST /api/voice/webhook
 * Handles incoming Vapi webhook events
 */
router.post('/webhook', async (req, res) => {
  try {
    const event = req.body;

    // Verify webhook signature (if configured)
    const signature = req.headers['x-vapi-signature'];
    if (process.env.VAPI_WEBHOOK_SECRET) {
      // TODO: Implement signature verification
      // const isValid = verifyWebhookSignature(signature, req.body, process.env.VAPI_WEBHOOK_SECRET);
      // if (!isValid) {
      //   return res.status(401).json({ error: 'Invalid signature' });
      // }
    }

    console.log(`Received voice event: ${event.type}`, event);

    // Process different event types
    switch (event.type) {
      case 'call-started':
        await handleCallStart(event);
        break;

      case 'call-ended':
        await handleCallEnd(event);
        break;

      case 'transcript-ready':
        await handleTranscript(event);
        break;

      case 'function-call':
        const result = await handleFunctionCall(event);
        return res.json(result);

      case 'transfer-initiated':
        await handleTransfer(event);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Handle call start event
 */
async function handleCallStart(event) {
  const { callId, direction, from, to, timestamp } = event;

  // Check if caller exists in leads
  const existingLead = await convex.query("leads:getByPhone", { phone: from });

  // Create or update lead
  let leadId;
  if (existingLead) {
    leadId = existingLead._id;
    await convex.mutation("leads:update", {
      id: leadId,
      lastContactDate: timestamp,
      metadata: {
        ...existingLead.metadata,
        lastCallId: callId
      }
    });
  } else {
    // Create new lead
    const newLead = await convex.mutation("leads:create", {
      phone: from,
      source: "voice_agent",
      status: "new",
      createdAt: Date.now(),
      metadata: {
        voiceCallId: callId
      }
    });
    leadId = newLead._id;
  }

  // Log call start
  await convex.mutation("voiceCalls:create", {
    callId,
    direction,
    from,
    to,
    startTime: Date.now(),
    status: "in_progress",
    leadId,
    createdAt: Date.now()
  });
}

/**
 * Handle call end event
 */
async function handleCallEnd(event) {
  const { callId, duration, recordingUrl, timestamp } = event;

  // Update call record
  await convex.mutation("voiceCalls:update", {
    callId,
    endTime: Date.now(),
    duration,
    status: "completed",
    recordingUrl,
    updatedAt: Date.now()
  });

  // Trigger post-call analysis (async)
  triggerPostCallAnalysis(callId);
}

/**
 * Handle transcript ready event
 */
async function handleTranscript(event) {
  const { callId, transcript, summary, sentiment, painPoints, nextSteps } = event;

  // Update call with analysis
  await convex.mutation("voiceCalls:update", {
    callId,
    transcription: transcript,
    summary,
    sentiment,
    aiNotes: {
      keyPoints: painPoints || [],
      nextSteps: nextSteps || [],
      concerns: event.objections || [],
      opportunities: event.opportunities || []
    },
    updatedAt: Date.now()
  });

  // Update lead score if available
  if (event.leadScore) {
    const call = await convex.query("voiceCalls:get", { callId });
    if (call?.leadId) {
      await convex.mutation("leads:updateScore", {
        id: call.leadId,
        score: event.leadScore,
        updatedAt: Date.now()
      });
    }
  }
}

/**
 * Handle function calls from voice agent
 */
async function handleFunctionCall(event) {
  const { function: functionName, parameters, callId } = event;

  switch (functionName) {
    case 'scheduleDiscoveryCall':
      return await scheduleDiscoveryCall(parameters, callId);

    case 'checkAvailability':
      return await checkCalendarAvailability(parameters);

    case 'createLeadNote':
      return await createLeadNote(parameters, callId);

    case 'transferCall':
      return await initiateCallTransfer(parameters, callId);

    default:
      return { error: `Unknown function: ${functionName}` };
  }
}

/**
 * Schedule a discovery call
 */
async function scheduleDiscoveryCall(params, callId) {
  const { customerName, companyName, preferredTime, mainPainPoint } = params;

  try {
    // Create appointment
    const appointment = await convex.mutation("appointments:create", {
      type: "discovery",
      customerName,
      companyName,
      scheduledTime: parsePreferredTime(preferredTime),
      notes: `Main pain point: ${mainPainPoint}`,
      sourceCallId: callId,
      createdAt: Date.now()
    });

    // TODO: Send calendar invite
    // await sendCalendarInvite(appointment);

    return {
      success: true,
      message: `Discovery call scheduled for ${preferredTime}`,
      appointmentId: appointment._id
    };
  } catch (error) {
    console.error('Failed to schedule discovery call:', error);
    return {
      success: false,
      error: 'Failed to schedule call'
    };
  }
}

/**
 * Check calendar availability
 */
async function checkCalendarAvailability(params) {
  const { dateRange } = params;

  // TODO: Integrate with actual calendar system
  // For now, return mock availability
  const mockSlots = [
    "Thursday at 2:00 PM PST",
    "Friday at 10:00 AM PST",
    "Monday at 3:00 PM PST",
    "Tuesday at 11:00 AM PST"
  ];

  return {
    available: true,
    slots: mockSlots,
    message: "I have several slots available"
  };
}

/**
 * Create a lead note
 */
async function createLeadNote(params, callId) {
  const { painPoints, qualificationScore, notes } = params;

  try {
    // Get call record to find lead
    const call = await convex.query("voiceCalls:get", { callId });

    if (call?.leadId) {
      // Add note to lead
      await convex.mutation("leads:addNote", {
        leadId: call.leadId,
        note: {
          content: notes,
          painPoints,
          qualificationScore,
          sourceCallId: callId,
          createdAt: Date.now()
        }
      });

      return {
        success: true,
        message: "Note added successfully"
      };
    }

    return {
      success: false,
      error: "Lead not found"
    };
  } catch (error) {
    console.error('Failed to create lead note:', error);
    return {
      success: false,
      error: 'Failed to create note'
    };
  }
}

/**
 * Initiate call transfer
 */
async function initiateCallTransfer(params, callId) {
  const { reason, transferTo } = params;

  // Log transfer request
  await convex.mutation("voiceCalls:addTransferEvent", {
    callId,
    transferTo: transferTo || 'matthew',
    reason,
    timestamp: Date.now()
  });

  // Return transfer instructions for Vapi
  return {
    action: 'transfer',
    destination: process.env.TRANSFER_PHONE_NUMBER,
    whisperMessage: `Incoming transfer. Reason: ${reason}`,
    warmTransfer: true
  };
}

/**
 * Handle transfer initiated event
 */
async function handleTransfer(event) {
  const { callId, transferTo, reason, timestamp } = event;

  await convex.mutation("voiceCalls:update", {
    callId,
    status: "transferred",
    transferDetails: {
      to: transferTo,
      reason,
      timestamp
    },
    updatedAt: Date.now()
  });
}

/**
 * Trigger post-call analysis (async)
 */
async function triggerPostCallAnalysis(callId) {
  // This would typically trigger a background job
  // For now, just log
  console.log(`Post-call analysis triggered for ${callId}`);

  // TODO: Implement actual analysis pipeline
  // - Fetch recording
  // - Run enhanced transcription
  // - Perform sentiment analysis
  // - Calculate lead score
  // - Generate coaching recommendations
}

/**
 * Parse preferred time string to timestamp
 */
function parsePreferredTime(timeStr) {
  // Simple parsing - would need more robust implementation
  const now = new Date();

  if (timeStr.includes('Thursday')) {
    // Set to next Thursday
    const daysUntilThursday = (4 - now.getDay() + 7) % 7 || 7;
    now.setDate(now.getDate() + daysUntilThursday);
  } else if (timeStr.includes('Friday')) {
    const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
    now.setDate(now.getDate() + daysUntilFriday);
  }

  // Parse time
  if (timeStr.includes('2:00 PM') || timeStr.includes('2 PM')) {
    now.setHours(14, 0, 0, 0);
  } else if (timeStr.includes('10:00 AM') || timeStr.includes('10 AM')) {
    now.setHours(10, 0, 0, 0);
  }

  return now.getTime();
}

export default router;