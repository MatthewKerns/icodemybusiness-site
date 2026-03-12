"""
Transcript processor for analyzing voice call conversations.
Extracts insights, pain points, and qualification signals from call transcripts.
"""

import re
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
import json


@dataclass
class CallAnalysis:
    """Call analysis result structure."""
    call_id: str
    summary: str = ""
    pain_points: List[str] = field(default_factory=list)
    next_steps: List[str] = field(default_factory=list)
    objections: List[str] = field(default_factory=list)
    opportunities: List[str] = field(default_factory=list)
    questions: List[str] = field(default_factory=list)
    sentiment: str = "neutral"
    intent_to_book: bool = False
    qualification_signals: Dict[str, Any] = field(default_factory=dict)
    keywords: List[str] = field(default_factory=list)
    engagement_score: float = 0.0


class TranscriptProcessor:
    """Process and analyze voice call transcripts."""

    def __init__(self):
        """Initialize transcript processor."""
        self.pain_point_keywords = [
            "manual", "time-consuming", "frustrating", "inefficient",
            "spreadsheet", "can't scale", "bottleneck", "outdated",
            "losing customers", "missing leads", "no automation",
            "repetitive", "waste time", "hours per week", "struggling"
        ]

        self.positive_signals = [
            "exactly what we need", "interested", "sounds great",
            "tell me more", "how does", "when can we start",
            "perfect", "love to learn", "excited", "definitely"
        ]

        self.negative_signals = [
            "not interested", "too expensive", "not right now",
            "don't need", "already have", "not a priority",
            "can't afford", "too complex", "not sure", "think about it"
        ]

        self.booking_signals = [
            "schedule", "calendar", "book", "when can we meet",
            "thursday works", "available", "discovery call",
            "speak with matthew", "next step", "set up"
        ]

        self.objection_patterns = [
            r"concern(?:ed)? about (.*?)(?:\.|,|$)",
            r"worried about (.*?)(?:\.|,|$)",
            r"problem is (.*?)(?:\.|,|$)",
            r"issue with (.*?)(?:\.|,|$)",
            r"can't .* because (.*?)(?:\.|,|$)",
            r"don't .* because (.*?)(?:\.|,|$)"
        ]

    def analyze_transcript(self, transcript: str) -> CallAnalysis:
        """Analyze complete transcript for insights.

        Args:
            transcript: Full call transcript

        Returns:
            Complete call analysis
        """
        analysis = CallAnalysis(
            call_id=self._generate_call_id(),
            summary=self._generate_summary(transcript),
            pain_points=self._extract_pain_points(transcript),
            next_steps=self._extract_next_steps(transcript),
            objections=self._extract_objections(transcript),
            opportunities=self._identify_opportunities(transcript),
            questions=self._extract_questions(transcript),
            sentiment=self._analyze_overall_sentiment(transcript),
            intent_to_book=self._detect_booking_intent(transcript),
            qualification_signals=self._extract_qualification_signals(transcript),
            keywords=self._extract_keywords(transcript),
            engagement_score=self._calculate_engagement_score(transcript)
        )

        return analysis

    def _generate_call_id(self) -> str:
        """Generate a call ID if not provided."""
        return f"call_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    def _generate_summary(self, transcript: str) -> str:
        """Generate executive summary of the call.

        Args:
            transcript: Call transcript

        Returns:
            Summary text
        """
        lines = transcript.strip().split('\n')
        if not lines:
            return "No conversation content available."

        # Extract key discussion points
        customer_lines = [l for l in lines if "Customer:" in l]
        if not customer_lines:
            return "Brief conversation with minimal customer input."

        # Find main topics discussed
        topics = []
        for line in customer_lines:
            content = line.replace("Customer:", "").strip()
            if len(content) > 20:  # Substantial statement
                # Extract topic indicators
                if any(keyword in content.lower() for keyword in ["spending", "hours", "time"]):
                    topics.append("time management challenges")
                if any(keyword in content.lower() for keyword in ["manual", "spreadsheet"]):
                    topics.append("manual process inefficiencies")
                if any(keyword in content.lower() for keyword in ["website", "online"]):
                    topics.append("web presence issues")
                if any(keyword in content.lower() for keyword in ["lead", "customer", "client"]):
                    topics.append("customer management needs")

        if topics:
            return f"Discussed {', '.join(set(topics[:3]))}. " + \
                   f"Customer expressed interest in solutions."
        else:
            return "General inquiry about services and capabilities."

    def _extract_pain_points(self, transcript: str) -> List[str]:
        """Extract business pain points from transcript.

        Args:
            transcript: Call transcript

        Returns:
            List of identified pain points
        """
        pain_points = []
        lines = transcript.lower().split('\n')

        for line in lines:
            if "customer:" in line:
                content = line.replace("customer:", "").strip()

                # Check for direct pain point mentions
                for keyword in self.pain_point_keywords:
                    if keyword in content:
                        # Extract the context around the keyword
                        pattern = rf"([^.]*{keyword}[^.]*)"
                        matches = re.findall(pattern, content)
                        for match in matches:
                            clean_match = match.strip()
                            if len(clean_match) > 10:  # Meaningful content
                                pain_points.append(clean_match)

                # Check for time-based pain points
                time_pattern = r"(\d+)\s*hours?\s*(?:per|a)\s*(?:week|day)"
                time_matches = re.findall(time_pattern, content)
                for hours in time_matches:
                    pain_points.append(f"Spending {hours} hours on manual tasks")

                # Check for business impact statements
                if "losing" in content and ("customer" in content or "client" in content):
                    pain_points.append("Losing customers due to current limitations")

                if "can't" in content or "unable" in content:
                    cant_pattern = r"(?:can't|unable to)\s+([^,.]+)"
                    cant_matches = re.findall(cant_pattern, content)
                    for match in cant_matches:
                        pain_points.append(f"Unable to {match.strip()}")

        # Deduplicate and clean
        unique_points = []
        for point in pain_points:
            if not any(existing in point for existing in unique_points):
                unique_points.append(point)

        return unique_points[:5]  # Return top 5 pain points

    def _extract_next_steps(self, transcript: str) -> List[str]:
        """Extract agreed next steps from conversation.

        Args:
            transcript: Call transcript

        Returns:
            List of next steps
        """
        next_steps = []
        lines = transcript.split('\n')

        for i, line in enumerate(lines):
            line_lower = line.lower()

            # Check for scheduling mentions
            if any(signal in line_lower for signal in ["schedule", "book", "calendar"]):
                next_steps.append("Schedule discovery call")

            # Check for follow-up actions
            if "i'll send" in line_lower or "i will send" in line_lower:
                send_pattern = r"i(?:'ll| will) send\s+(?:you\s+)?(.+?)(?:\.|,|$)"
                matches = re.findall(send_pattern, line_lower)
                for match in matches:
                    next_steps.append(f"Send {match.strip()}")

            # Check for preparation requests
            if "prepare" in line_lower or "think about" in line_lower:
                if i < len(lines) - 1:  # Check context
                    next_steps.append("Customer to prepare information for discovery call")

            # Check for specific day/time mentions
            day_pattern = r"(monday|tuesday|wednesday|thursday|friday|next week|this week|tomorrow)"
            day_matches = re.findall(day_pattern, line_lower)
            for day in day_matches:
                if "works" in line_lower or "good" in line_lower or "perfect" in line_lower:
                    next_steps.append(f"Discovery call scheduled for {day}")
                    break

        # Deduplicate
        return list(dict.fromkeys(next_steps))

    def _extract_objections(self, transcript: str) -> List[str]:
        """Extract customer objections from transcript.

        Args:
            transcript: Call transcript

        Returns:
            List of objections raised
        """
        objections = []
        lines = transcript.split('\n')

        for line in lines:
            if "customer:" in line.lower():
                content = line.lower().replace("customer:", "").strip()

                # Check for direct objection statements
                objection_keywords = [
                    "concerned about", "worried about", "not sure about",
                    "problem with", "issue with", "don't think",
                    "too expensive", "can't afford", "burned before",
                    "bad experience", "didn't work", "failed"
                ]

                for keyword in objection_keywords:
                    if keyword in content:
                        # Extract the full objection context
                        objections.append(content)
                        break

                # Check for comparison/alternative mentions
                if "already using" in content or "currently have" in content:
                    objections.append(f"Already has solution: {content}")

                # Check for delay tactics
                delay_phrases = ["need to think", "discuss with", "not right now", "maybe later"]
                for phrase in delay_phrases:
                    if phrase in content:
                        objections.append(f"Wants to delay: {content}")
                        break

        # Clean and deduplicate
        unique_objections = []
        for obj in objections:
            if len(obj) > 10 and obj not in unique_objections:
                unique_objections.append(obj)

        return unique_objections

    def _identify_opportunities(self, transcript: str) -> List[str]:
        """Identify sales opportunities from conversation.

        Args:
            transcript: Call transcript

        Returns:
            List of identified opportunities
        """
        opportunities = []

        # Check pain points for opportunity mapping
        pain_points = self._extract_pain_points(transcript)

        opportunity_map = {
            "manual": "Automation opportunity",
            "spreadsheet": "Database system opportunity",
            "lead": "CRM integration opportunity",
            "website": "Web development opportunity",
            "customer": "Customer management system opportunity",
            "time": "Workflow optimization opportunity",
            "scale": "Scalability solution opportunity"
        }

        for pain in pain_points:
            for keyword, opportunity in opportunity_map.items():
                if keyword in pain.lower():
                    opportunities.append(opportunity)

        # Check for expansion opportunities
        if "team" in transcript.lower() and re.search(r"\d+", transcript):
            opportunities.append("Multi-user system opportunity")

        if "grow" in transcript.lower() or "expansion" in transcript.lower():
            opportunities.append("Growth enablement opportunity")

        # Deduplicate
        return list(dict.fromkeys(opportunities))

    def _extract_questions(self, transcript: str) -> List[str]:
        """Extract customer questions from transcript.

        Args:
            transcript: Call transcript

        Returns:
            List of questions asked
        """
        questions = []
        lines = transcript.split('\n')

        for line in lines:
            if "customer:" in line.lower():
                content = line.replace("Customer:", "").replace("customer:", "").strip()

                # Check for question marks
                if "?" in content:
                    questions.append(content)
                # Check for question patterns without question marks
                elif any(q in content.lower() for q in ["how ", "what ", "when ", "where ",
                                                        "why ", "can you", "do you",
                                                        "will you", "is it"]):
                    questions.append(content)

        return questions

    def _analyze_overall_sentiment(self, transcript: str) -> str:
        """Analyze overall sentiment of the conversation.

        Args:
            transcript: Call transcript

        Returns:
            Sentiment classification
        """
        transcript_lower = transcript.lower()

        positive_count = sum(1 for signal in self.positive_signals
                           if signal in transcript_lower)
        negative_count = sum(1 for signal in self.negative_signals
                           if signal in transcript_lower)

        # Calculate sentiment ratio
        total_signals = positive_count + negative_count
        if total_signals == 0:
            return "neutral"

        positive_ratio = positive_count / total_signals

        if positive_ratio >= 0.7:
            return "positive"
        elif positive_ratio <= 0.3:
            return "negative"
        else:
            return "neutral"

    def analyze_sentiment(self, transcript: str) -> Dict[str, Any]:
        """Detailed sentiment analysis with confidence score.

        Args:
            transcript: Call transcript

        Returns:
            Sentiment analysis results
        """
        sentiment = self._analyze_overall_sentiment(transcript)

        # Calculate confidence
        transcript_lower = transcript.lower()
        signal_strength = 0

        for signal in self.positive_signals:
            if signal in transcript_lower:
                signal_strength += 1

        for signal in self.negative_signals:
            if signal in transcript_lower:
                signal_strength += 1

        # Normalize confidence (0-1 scale)
        max_possible_signals = len(self.positive_signals) + len(self.negative_signals)
        confidence = min(signal_strength / 10, 1.0)  # Cap at 10 signals for full confidence

        return {
            "sentiment": sentiment,
            "confidence": confidence
        }

    def _detect_booking_intent(self, transcript: str) -> bool:
        """Detect if customer intends to book a call.

        Args:
            transcript: Call transcript

        Returns:
            True if booking intent detected
        """
        transcript_lower = transcript.lower()

        for signal in self.booking_signals:
            if signal in transcript_lower:
                return True

        # Check for agreement to specific times
        if re.search(r"(works|perfect|good|great|yes).*?(thursday|friday|monday|tuesday|wednesday)",
                    transcript_lower):
            return True

        return False

    def _extract_qualification_signals(self, transcript: str) -> Dict[str, Any]:
        """Extract BANT and other qualification signals.

        Args:
            transcript: Call transcript

        Returns:
            Qualification signals dictionary
        """
        signals = {}
        transcript_lower = transcript.lower()

        # Budget signals
        if any(term in transcript_lower for term in ["budget", "afford", "cost", "price", "invest"]):
            signals["budget_awareness"] = True

        # Authority signals
        if any(term in transcript_lower for term in ["owner", "founder", "ceo", "decision", "my business"]):
            signals["authority_to_decide"] = True
        elif any(term in transcript_lower for term in ["team", "partner", "discuss with"]):
            signals["authority_to_decide"] = False

        # Need signals
        pain_count = len(self._extract_pain_points(transcript))
        if pain_count >= 3:
            signals["high_need"] = True
        elif pain_count >= 1:
            signals["moderate_need"] = True

        # Timeline signals
        timeline_patterns = {
            "this week": "immediate",
            "this month": "short_term",
            "next month": "short_term",
            "this quarter": "medium_term",
            "next quarter": "medium_term",
            "this year": "long_term",
            "not sure": "undefined"
        }

        for pattern, timeline in timeline_patterns.items():
            if pattern in transcript_lower:
                signals["timeline"] = timeline
                break

        # Team size extraction
        team_pattern = r"(\d+)[\s-]*(?:people|person|employee|team member)"
        team_matches = re.findall(team_pattern, transcript_lower)
        if team_matches:
            team_size = int(team_matches[0])
            if team_size <= 2:
                signals["team_size"] = "1-2"
            elif team_size <= 5:
                signals["team_size"] = "3-5"
            elif team_size <= 10:
                signals["team_size"] = "5-10"
            elif team_size <= 20:
                signals["team_size"] = "10-20"
            else:
                signals["team_size"] = "20+"

        # Industry detection
        industries = ["saas", "retail", "ecommerce", "consulting", "agency", "healthcare",
                     "manufacturing", "real estate", "finance", "education"]
        for industry in industries:
            if industry in transcript_lower:
                signals["industry"] = industry
                break

        # Previous solution attempts
        if any(term in transcript_lower for term in ["tried", "used", "looked at", "evaluated"]):
            signals["current_solution_inadequate"] = True

        return signals

    def _extract_keywords(self, transcript: str) -> List[str]:
        """Extract relevant keywords from transcript.

        Args:
            transcript: Call transcript

        Returns:
            List of keywords
        """
        keywords = []

        # Business-related keywords
        business_keywords = [
            "automation", "integration", "custom", "solution",
            "system", "workflow", "process", "efficiency",
            "scale", "growth", "productivity", "optimization"
        ]

        transcript_lower = transcript.lower()
        for keyword in business_keywords:
            if keyword in transcript_lower:
                keywords.append(keyword)

        # Tool/platform mentions
        tools = ["zapier", "airtable", "hubspot", "salesforce", "slack",
                "excel", "google sheets", "quickbooks", "shopify"]
        for tool in tools:
            if tool in transcript_lower:
                keywords.append(tool)

        return keywords

    def _calculate_engagement_score(self, transcript: str) -> float:
        """Calculate customer engagement score.

        Args:
            transcript: Call transcript

        Returns:
            Engagement score (0-1)
        """
        lines = transcript.split('\n')
        customer_lines = [l for l in lines if "customer:" in l.lower()]
        alex_lines = [l for l in lines if "alex:" in l.lower()]

        if not alex_lines:
            return 0.0

        # Talk ratio
        talk_ratio = len(customer_lines) / (len(customer_lines) + len(alex_lines))

        # Question engagement
        questions = self._extract_questions(transcript)
        question_score = min(len(questions) / 5, 1.0)  # Cap at 5 questions

        # Response length
        avg_response_length = sum(len(l) for l in customer_lines) / max(len(customer_lines), 1)
        length_score = min(avg_response_length / 100, 1.0)  # Cap at 100 chars

        # Positive signals
        positive_score = sum(1 for s in self.positive_signals if s in transcript.lower()) / 5

        # Weighted average
        engagement_score = (
            talk_ratio * 0.3 +
            question_score * 0.3 +
            length_score * 0.2 +
            positive_score * 0.2
        )

        return round(engagement_score, 2)

    def calculate_engagement(self, transcript: str) -> Dict[str, Any]:
        """Calculate detailed engagement metrics.

        Args:
            transcript: Call transcript

        Returns:
            Engagement analysis
        """
        score = self._calculate_engagement_score(transcript)

        if score >= 0.7:
            level = "high"
        elif score >= 0.4:
            level = "medium"
        else:
            level = "low"

        return {
            "score": score,
            "level": level
        }

    def should_transfer(self, analysis: CallAnalysis) -> Dict[str, Any]:
        """Determine if call should be transferred.

        Args:
            analysis: Call analysis results

        Returns:
            Transfer decision
        """
        # Check for technical complexity
        technical_keywords = ["architecture", "database", "api", "integration",
                            "deployment", "infrastructure", "security", "compliance"]

        technical_count = sum(1 for keyword in analysis.keywords
                             if keyword in technical_keywords)

        if technical_count >= 3:
            return {
                "should_transfer": True,
                "reason": "technical_complexity",
                "transfer_to": "matthew"
            }

        # Check for high-value opportunity
        if len(analysis.pain_points) >= 4 and analysis.sentiment == "positive":
            return {
                "should_transfer": True,
                "reason": "high_value_opportunity",
                "transfer_to": "matthew"
            }

        # Check for customer frustration
        if analysis.sentiment == "negative" and len(analysis.objections) >= 3:
            return {
                "should_transfer": True,
                "reason": "customer_escalation",
                "transfer_to": "matthew"
            }

        return {
            "should_transfer": False,
            "reason": None,
            "transfer_to": None
        }

    def track_progression(self, transcript_segments: List[str]) -> List[Dict[str, Any]]:
        """Track sentiment progression through conversation.

        Args:
            transcript_segments: List of transcript segments in order

        Returns:
            Progression analysis
        """
        progression = []

        for i, segment in enumerate(transcript_segments):
            sentiment_result = self.analyze_sentiment(segment)

            # Calculate numeric score for tracking
            if sentiment_result["sentiment"] == "positive":
                score = 0.7 + (0.3 * sentiment_result["confidence"])
            elif sentiment_result["sentiment"] == "negative":
                score = 0.3 - (0.3 * sentiment_result["confidence"])
            else:
                score = 0.5

            progression.append({
                "segment": i + 1,
                "sentiment": sentiment_result["sentiment"],
                "score": round(score, 2),
                "confidence": sentiment_result["confidence"]
            })

        return progression

    def extract_emotional_keywords(self, transcript: str) -> Dict[str, List[str]]:
        """Extract emotional keywords from transcript.

        Args:
            transcript: Call transcript

        Returns:
            Categorized emotional keywords
        """
        positive_emotions = [
            "excited", "happy", "impressed", "hopeful", "confident",
            "pleased", "satisfied", "enthusiastic", "interested"
        ]

        negative_emotions = [
            "frustrated", "disappointed", "concerned", "worried",
            "skeptical", "confused", "overwhelmed", "hesitant"
        ]

        keywords = {"positive": [], "negative": []}
        transcript_lower = transcript.lower()

        for emotion in positive_emotions:
            if emotion in transcript_lower:
                keywords["positive"].append(emotion)

        for emotion in negative_emotions:
            if emotion in transcript_lower:
                keywords["negative"].append(emotion)

        return keywords

    def identify_buying_signals(self, transcript: str) -> List[Dict[str, str]]:
        """Identify specific buying signals in conversation.

        Args:
            transcript: Call transcript

        Returns:
            List of buying signals with types
        """
        signals = []
        transcript_lower = transcript.lower()

        # Urgency signals
        urgency_phrases = ["need to solve quickly", "asap", "urgent", "immediately",
                          "this week", "right away", "time sensitive"]
        for phrase in urgency_phrases:
            if phrase in transcript_lower:
                signals.append({"type": "urgency", "signal": phrase})

        # Process interest signals
        process_phrases = ["what's the next step", "how do we proceed", "get started",
                          "move forward", "begin", "kick off"]
        for phrase in process_phrases:
            if phrase in transcript_lower:
                signals.append({"type": "process", "signal": phrase})

        # Stakeholder signals
        stakeholder_phrases = ["who else should", "bring my team", "include my partner",
                              "loop in", "get buy-in"]
        for phrase in stakeholder_phrases:
            if phrase in transcript_lower:
                signals.append({"type": "stakeholder", "signal": phrase})

        # Budget readiness signals
        budget_phrases = ["what's the investment", "pricing makes sense", "within budget",
                         "can afford", "allocate funds"]
        for phrase in budget_phrases:
            if phrase in transcript_lower:
                signals.append({"type": "budget", "signal": phrase})

        return signals

    def analyze_competitor_mentions(self, transcript: str) -> Dict[str, Any]:
        """Analyze mentions of competitors.

        Args:
            transcript: Call transcript

        Returns:
            Competitor analysis
        """
        competitors_mentioned = []
        transcript_lower = transcript.lower()

        known_competitors = [
            "zapier", "airtable", "bubble", "webflow", "make",
            "n8n", "retool", "outsystems", "mendix", "appian"
        ]

        for competitor in known_competitors:
            if competitor in transcript_lower:
                competitors_mentioned.append(competitor.capitalize())

        # Assess dissatisfaction with competitors
        dissatisfaction_level = "none"
        if competitors_mentioned:
            negative_context = ["couldn't", "can't", "didn't work", "limitations",
                              "problems with", "issues", "not enough", "missing"]

            negative_mentions = sum(1 for term in negative_context if term in transcript_lower)

            if negative_mentions >= 3:
                dissatisfaction_level = "high"
            elif negative_mentions >= 1:
                dissatisfaction_level = "moderate"
            else:
                dissatisfaction_level = "low"

        return {
            "competitors": competitors_mentioned,
            "dissatisfaction_level": dissatisfaction_level,
            "considering_switch": dissatisfaction_level in ["high", "moderate"]
        }