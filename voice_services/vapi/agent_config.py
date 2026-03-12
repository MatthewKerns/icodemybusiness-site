"""
Vapi voice agent configuration for iCodeMyBusiness sales discovery calls.
Configures the AI personality, conversation flow, and guardrails.
"""

import json
from typing import Dict, List, Any
from dataclasses import dataclass, asdict


@dataclass
class SalesPersonality:
    """Sales agent personality configuration."""
    name: str = "Alex"
    role: str = "sales discovery agent"
    company: str = "iCodeMyBusiness"
    tone: str = "warm, confident, conversational"
    objective: str = "qualify leads and book discovery calls"

    founder: str = "Matthew Kerns"
    founder_background: str = "Amazon-trained software engineer"

    def get_context(self) -> str:
        """Get personality context for system message."""
        return f"""You are {self.name}, a professional {self.role} for {self.company}.

Company founded by {self.founder}, an {self.founder_background}.
Your tone is {self.tone} - like a knowledgeable colleague, not a pushy salesperson.
Your objective is to {self.objective}."""


class VapiAgentConfig:
    """Configure Vapi voice agent for sales discovery."""

    def __init__(self):
        """Initialize agent configuration."""
        self.personality = SalesPersonality()
        self.conversation_phases = self._init_conversation_phases()
        self.guardrails = self._init_guardrails()

    def _init_conversation_phases(self) -> List[Dict[str, Any]]:
        """Initialize conversation flow phases."""
        return [
            {
                "name": "greeting",
                "duration": "30-60 seconds",
                "objective": "Warm greeting and context setting",
                "example": "Hey [Name], thanks for reaching out! I'm Alex with iCodeMyBusiness..."
            },
            {
                "name": "pain_discovery",
                "duration": "2-4 minutes",
                "objective": "Uncover real business pain points",
                "questions": [
                    "What does a typical day look like for you running [their business]?",
                    "What's the one task you wish you could just make disappear?",
                    "How are you currently handling [their pain point]?",
                    "How much time per week would you estimate that costs you?",
                    "What would change for your business if that problem was just... solved?"
                ]
            },
            {
                "name": "value_bridge",
                "duration": "1-2 minutes",
                "objective": "Connect pain to iCodeMyBusiness solution",
                "approach": "Reference specific frustration and explain custom-coded solution"
            },
            {
                "name": "qualification",
                "duration": "1 minute",
                "objective": "Assess fit without being intrusive",
                "questions": [
                    "How many people are on your team right now?",
                    "Have you tried any other solutions for this?",
                    "If we could solve this, what kind of timeline are you thinking?"
                ]
            },
            {
                "name": "booking",
                "duration": "1 minute",
                "objective": "Schedule discovery call with Matthew",
                "approach": "Position as natural next step, low-pressure, valuable in itself"
            }
        ]

    def _init_guardrails(self) -> Dict[str, str]:
        """Initialize conversation guardrails and responses."""
        return {
            "pricing_deflection": """Great question. Because every system is custom-built for the specific business,
                pricing depends on scope. That's actually one of the things Matthew covers in the discovery call.""",

            "technical_redirect": """I love that you're thinking about the technical side. Matthew is the engineer -
                he built systems at Amazon scale and can really dig into the architecture with you.""",

            "tangent_handling": """That's really interesting - I appreciate you sharing that.
                I want to make sure I respect your time though. Coming back to [their business pain]...""",

            "competitor_response": """Smart to evaluate your options. What makes us different is we're not selling
                you a platform or subscription. We build you a system YOU own - custom code, designed for your business.""",

            "free_work_boundary": """I totally understand wanting to get a sense of how this works.
                The discovery call with Matthew is actually designed for exactly that.""",

            "ai_disclosure": """Yes, I'm an AI assistant working with iCodeMyBusiness to help qualify leads
                and ensure Matthew speaks with businesses that are a great fit for our services."""
        }

    def create_agent(self) -> Dict[str, Any]:
        """Create Vapi agent configuration."""
        return {
            "name": self.personality.name,
            "model": {
                "provider": "anthropic",
                "model": "claude-3-sonnet-20240229",
                "temperature": 0.7,
                "maxTokens": 500,
                "systemMessage": self._get_system_message(),
                "tools": self._get_tools()
            },
            "voice": {
                "provider": "elevenlabs",
                "voiceId": "professional-sales",  # Configure specific voice
                "stability": 0.8,
                "similarityBoost": 0.9,
                "style": "conversational",
                "speakingRate": 1.0
            },
            "firstMessage": self._get_first_message(),
            "functions": self._get_functions(),
            "endCallFunctionName": "endCall",
            "transferPhoneNumber": "+14155555678",  # Matthew's number
            "silenceTimeoutSeconds": 30,
            "responseDelaySeconds": 0.4,
            "llmRequestDelaySeconds": 0.1,
            "numWordsToInterruptAssistant": 3,
            "maxDurationSeconds": 1800,  # 30 minutes max
            "backgroundSound": "office",
            "modelOutputInMessages": True,
            "transportOptions": {
                "provider": "twilio",
                "timeout": 60,
                "record": True,
                "recordingChannels": "dual"
            }
        }

    def _get_system_message(self) -> str:
        """Get complete system message for agent."""
        return f"""{self.personality.get_context()}

## Core Service Knowledge

iCodeMyBusiness builds REAL, custom-coded business systems for SMBs using AI-accelerated development
combined with Amazon-level engineering rigor. We deliver in weeks, not quarters, at SMB-appropriate pricing.

NOT consulting, NOT templates, NOT no-code tools - actual production code that runs business operations.

## Service Areas
- Sales generation through content and lead management
- Authority positioning - establishing business owners as experts
- Internal productivity - automating repetitive tasks
- Website functionality improvements - custom solutions beyond templates
- Business system integration - connecting tools and processes

## Conversation Flow
1. Warm greeting (30-60 seconds)
2. Pain discovery (2-4 minutes)
3. Value bridge (1-2 minutes)
4. Qualification check (1 minute)
5. Book discovery call (1 minute)

## Qualifying Signals to Listen For
- Manual processes consuming significant time
- Frustration with current tools or no-code limitations
- Growth constrained by operational bottlenecks
- Desire for system integration or automation
- Content creation, lead management, or sales pipeline gaps

## Hard Boundaries
- NEVER quote specific pricing - defer to discovery call
- NEVER make guarantees about timelines or ROI
- NEVER disparage competitors by name
- NEVER agree to scope or start work - discovery call is always next step
- NEVER pretend to be human if asked directly

## Objection Responses
Use the configured guardrails for common objections about pricing, technical questions, competitors, etc.

Transfer to Matthew if: customer is upset, has complex technical questions, explicitly asks for a person,
is an existing client, or conversation exceeds 8 minutes without progress."""

    def _get_first_message(self) -> str:
        """Get the first message when call connects."""
        return "Hey there! Thanks for calling iCodeMyBusiness. I'm Alex. I'd love to learn about your business and what's eating up your time right now. What brings you to us today?"

    def _get_tools(self) -> List[Dict[str, Any]]:
        """Get AI tools/functions available to agent."""
        return [
            {
                "type": "function",
                "function": {
                    "name": "lookupCalendar",
                    "description": "Check Matthew's availability for discovery calls",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "dateRange": {"type": "string"}
                        }
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "createLeadNote",
                    "description": "Create a note about the lead's pain points and qualification",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "painPoints": {"type": "array", "items": {"type": "string"}},
                            "qualificationScore": {"type": "number"},
                            "notes": {"type": "string"}
                        }
                    }
                }
            }
        ]

    def _get_functions(self) -> List[Dict[str, Any]]:
        """Get Vapi-specific functions for call control."""
        return [
            {
                "name": "transferCall",
                "description": "Transfer call to Matthew for complex technical questions",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "reason": {
                            "type": "string",
                            "description": "Reason for transfer"
                        }
                    },
                    "required": ["reason"]
                }
            },
            {
                "name": "endCall",
                "description": "End the call after booking or determining no fit",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "outcome": {
                            "type": "string",
                            "enum": ["booked", "not_qualified", "follow_up_needed", "transferred"]
                        },
                        "notes": {
                            "type": "string"
                        }
                    },
                    "required": ["outcome"]
                }
            },
            {
                "name": "scheduleDiscoveryCall",
                "description": "Schedule a discovery call with Matthew",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "preferredTime": {
                            "type": "string",
                            "description": "Customer's preferred time"
                        },
                        "customerName": {
                            "type": "string"
                        },
                        "companyName": {
                            "type": "string"
                        },
                        "mainPainPoint": {
                            "type": "string"
                        }
                    },
                    "required": ["preferredTime", "customerName"]
                }
            },
            {
                "name": "checkAvailability",
                "description": "Check Matthew's calendar availability",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "dateRange": {
                            "type": "string",
                            "description": "Date range to check (e.g., 'this week', 'next week')"
                        }
                    },
                    "required": ["dateRange"]
                }
            }
        ]

    def get_conversation_phases(self) -> List[Dict[str, Any]]:
        """Get conversation phases."""
        return self.conversation_phases

    def get_guardrails(self) -> Dict[str, str]:
        """Get conversation guardrails."""
        return self.guardrails

    def export_config(self, filepath: str) -> None:
        """Export configuration to JSON file."""
        config = {
            "agent": self.create_agent(),
            "personality": asdict(self.personality),
            "phases": self.conversation_phases,
            "guardrails": self.guardrails
        }

        with open(filepath, 'w') as f:
            json.dump(config, f, indent=2)

    def validate_config(self) -> Dict[str, bool]:
        """Validate agent configuration completeness."""
        agent = self.create_agent()

        return {
            "has_name": bool(agent.get("name")),
            "has_model": bool(agent.get("model")),
            "has_voice": bool(agent.get("voice")),
            "has_first_message": bool(agent.get("firstMessage")),
            "has_functions": len(agent.get("functions", [])) > 0,
            "has_system_message": bool(agent.get("model", {}).get("systemMessage")),
            "has_transfer_number": bool(agent.get("transferPhoneNumber")),
            "all_phases_defined": len(self.conversation_phases) == 5,
            "guardrails_complete": len(self.guardrails) >= 6
        }


if __name__ == "__main__":
    # Example usage
    config = VapiAgentConfig()

    # Validate configuration
    validation = config.validate_config()
    print("Configuration validation:", validation)

    # Export configuration
    config.export_config("vapi_agent_config.json")
    print("Configuration exported to vapi_agent_config.json")