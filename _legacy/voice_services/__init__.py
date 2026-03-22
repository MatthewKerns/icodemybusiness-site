"""
Voice services package for iCodeMyBusiness.
Provides Vapi integration and AI-powered call analysis.
"""

from .vapi.agent_config import VapiAgentConfig, SalesPersonality
from .vapi.call_handler import CallEventHandler, CallEvent, CallStatus
from .vapi.transcript_processor import TranscriptProcessor, CallAnalysis
from .ai_analysis.sentiment import SentimentAnalyzer, CallSentiment
from .ai_analysis.lead_scoring import LeadScoringEngine, LeadScore, QualificationFactors

__version__ = "1.0.0"
__all__ = [
    "VapiAgentConfig",
    "SalesPersonality",
    "CallEventHandler",
    "CallEvent",
    "CallStatus",
    "TranscriptProcessor",
    "CallAnalysis",
    "SentimentAnalyzer",
    "CallSentiment",
    "LeadScoringEngine",
    "LeadScore",
    "QualificationFactors"
]