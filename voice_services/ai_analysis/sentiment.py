"""
Sentiment analysis for voice calls.
Analyzes emotional tone, engagement, and conversation dynamics.
"""

import re
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
import statistics


@dataclass
class CallSentiment:
    """Call sentiment analysis results."""
    overall: str  # positive, negative, neutral
    confidence: float
    score: float  # 0-1 scale
    emotional_moments: List[str] = field(default_factory=list)
    concerns: List[str] = field(default_factory=list)
    enthusiasm_indicators: List[str] = field(default_factory=list)
    progression: List[Dict[str, Any]] = field(default_factory=list)


class SentimentAnalyzer:
    """Analyze sentiment and emotional dynamics in voice calls."""

    def __init__(self):
        """Initialize sentiment analyzer."""
        self.positive_words = {
            "strong_positive": [
                "excellent", "fantastic", "amazing", "perfect", "love",
                "excited", "thrilled", "definitely", "absolutely"
            ],
            "moderate_positive": [
                "good", "great", "nice", "interested", "helpful",
                "useful", "sounds good", "makes sense", "appreciate"
            ],
            "mild_positive": [
                "okay", "fine", "alright", "sure", "yes",
                "agree", "understand", "see"
            ]
        }

        self.negative_words = {
            "strong_negative": [
                "terrible", "awful", "hate", "angry", "frustrated",
                "unacceptable", "ridiculous", "waste", "never"
            ],
            "moderate_negative": [
                "bad", "poor", "disappointed", "concerned", "worried",
                "problem", "issue", "difficult", "confused"
            ],
            "mild_negative": [
                "not sure", "maybe not", "unsure", "hesitant",
                "uncertain", "don't know", "possibly"
            ]
        }

        self.engagement_indicators = {
            "high": [
                "tell me more", "how does", "what about", "can you explain",
                "interesting", "curious", "want to know", "please continue"
            ],
            "medium": [
                "i see", "okay", "go on", "uh huh", "right",
                "understood", "got it"
            ],
            "low": [
                "not interested", "don't need", "no thanks", "goodbye",
                "have to go", "call me later", "send email"
            ]
        }

    def analyze(self, transcript: str) -> CallSentiment:
        """Analyze sentiment of entire call.

        Args:
            transcript: Call transcript

        Returns:
            Sentiment analysis results
        """
        # Calculate sentiment score
        score = self._calculate_sentiment_score(transcript)

        # Determine overall sentiment
        if score >= 0.7:
            overall = "positive"
        elif score <= 0.3:
            overall = "negative"
        else:
            overall = "neutral"

        # Calculate confidence based on signal strength
        confidence = self._calculate_confidence(transcript)

        # Extract emotional moments
        emotional_moments = self._extract_emotional_moments(transcript)

        # Extract concerns
        concerns = self._extract_concerns(transcript)

        # Extract enthusiasm indicators
        enthusiasm = self._extract_enthusiasm_indicators(transcript)

        # Track sentiment progression
        progression = self._track_sentiment_progression(transcript)

        return CallSentiment(
            overall=overall,
            confidence=confidence,
            score=score,
            emotional_moments=emotional_moments,
            concerns=concerns,
            enthusiasm_indicators=enthusiasm,
            progression=progression
        )

    def _calculate_sentiment_score(self, transcript: str) -> float:
        """Calculate numerical sentiment score.

        Args:
            transcript: Call transcript

        Returns:
            Sentiment score (0-1 scale)
        """
        transcript_lower = transcript.lower()

        positive_score = 0
        negative_score = 0

        # Score positive words with weights
        for strength, words in self.positive_words.items():
            weight = {"strong_positive": 3, "moderate_positive": 2, "mild_positive": 1}[strength]
            for word in words:
                count = transcript_lower.count(word)
                positive_score += count * weight

        # Score negative words with weights
        for strength, words in self.negative_words.items():
            weight = {"strong_negative": 3, "moderate_negative": 2, "mild_negative": 1}[strength]
            for word in words:
                count = transcript_lower.count(word)
                negative_score += count * weight

        # Calculate final score
        total = positive_score + negative_score
        if total == 0:
            return 0.5  # Neutral if no sentiment words

        score = positive_score / total
        return round(score, 2)

    def _calculate_confidence(self, transcript: str) -> float:
        """Calculate confidence in sentiment assessment.

        Args:
            transcript: Call transcript

        Returns:
            Confidence score (0-1)
        """
        transcript_lower = transcript.lower()

        # Count total sentiment indicators
        indicator_count = 0

        for words_dict in [self.positive_words, self.negative_words]:
            for words_list in words_dict.values():
                for word in words_list:
                    if word in transcript_lower:
                        indicator_count += 1

        # More indicators = higher confidence
        # Normalize to 0-1 scale (10+ indicators = high confidence)
        confidence = min(indicator_count / 10, 1.0)

        # Adjust for transcript length
        word_count = len(transcript.split())
        if word_count < 50:
            confidence *= 0.7  # Lower confidence for short conversations

        return round(confidence, 2)

    def _extract_emotional_moments(self, transcript: str) -> List[str]:
        """Extract emotionally charged moments.

        Args:
            transcript: Call transcript

        Returns:
            List of emotional moments
        """
        moments = []
        lines = transcript.split('\n')

        emotional_triggers = [
            "excited", "frustrated", "disappointed", "happy",
            "worried", "concerned", "impressed", "confused",
            "overwhelmed", "confident", "hesitant", "eager"
        ]

        for line in lines:
            line_lower = line.lower()
            for trigger in emotional_triggers:
                if trigger in line_lower:
                    # Clean and add the line
                    clean_line = line.strip()
                    if len(clean_line) > 20:  # Meaningful content
                        moments.append(clean_line)
                    break

        return moments[:5]  # Return top 5 moments

    def _extract_concerns(self, transcript: str) -> List[str]:
        """Extract customer concerns.

        Args:
            transcript: Call transcript

        Returns:
            List of concerns
        """
        concerns = []
        lines = transcript.split('\n')

        concern_patterns = [
            r"concerned about (.*?)(?:\.|,|$)",
            r"worried about (.*?)(?:\.|,|$)",
            r"not sure (?:about|if) (.*?)(?:\.|,|$)",
            r"problem (?:is|with) (.*?)(?:\.|,|$)",
            r"issue (?:is|with) (.*?)(?:\.|,|$)"
        ]

        for line in lines:
            if "customer:" in line.lower():
                for pattern in concern_patterns:
                    matches = re.findall(pattern, line.lower())
                    for match in matches:
                        if len(match) > 5:  # Meaningful concern
                            concerns.append(match.strip())

        # Also check for implicit concerns
        concern_keywords = ["expensive", "complex", "difficult", "time", "resources"]
        for line in lines:
            if "customer:" in line.lower():
                for keyword in concern_keywords:
                    if keyword in line.lower() and line not in concerns:
                        concerns.append(line.replace("Customer:", "").strip())
                        break

        return list(dict.fromkeys(concerns))[:5]  # Deduplicate and limit

    def _extract_enthusiasm_indicators(self, transcript: str) -> List[str]:
        """Extract indicators of customer enthusiasm.

        Args:
            transcript: Call transcript

        Returns:
            List of enthusiasm indicators
        """
        indicators = []
        transcript_lower = transcript.lower()

        enthusiasm_phrases = [
            "love to", "excited about", "can't wait", "looking forward",
            "sounds amazing", "exactly what we need", "perfect",
            "when can we start", "sign us up", "definitely interested"
        ]

        for phrase in enthusiasm_phrases:
            if phrase in transcript_lower:
                # Find context around the phrase
                pattern = rf"([^.]*{phrase}[^.]*)"
                matches = re.findall(pattern, transcript_lower)
                for match in matches:
                    indicators.append(match.strip())

        # Check for exclamation points as enthusiasm
        lines = transcript.split('\n')
        for line in lines:
            if "!" in line and "customer:" in line.lower():
                clean_line = line.replace("Customer:", "").strip()
                if len(clean_line) > 10:
                    indicators.append(clean_line)

        return list(dict.fromkeys(indicators))[:5]

    def _track_sentiment_progression(self, transcript: str) -> List[Dict[str, Any]]:
        """Track how sentiment changes throughout the call.

        Args:
            transcript: Call transcript

        Returns:
            Sentiment progression timeline
        """
        lines = transcript.split('\n')
        if len(lines) < 4:
            return []

        # Divide into quarters
        quarter_size = len(lines) // 4
        quarters = [
            lines[:quarter_size],
            lines[quarter_size:quarter_size*2],
            lines[quarter_size*2:quarter_size*3],
            lines[quarter_size*3:]
        ]

        progression = []
        for i, quarter_lines in enumerate(quarters):
            quarter_text = '\n'.join(quarter_lines)
            if quarter_text.strip():
                score = self._calculate_sentiment_score(quarter_text)

                if score >= 0.6:
                    sentiment = "positive"
                elif score <= 0.4:
                    sentiment = "negative"
                else:
                    sentiment = "neutral"

                progression.append({
                    "quarter": i + 1,
                    "sentiment": sentiment,
                    "score": score
                })

        return progression

    def calculate_engagement(self, transcript: str) -> Dict[str, Any]:
        """Calculate customer engagement level.

        Args:
            transcript: Call transcript

        Returns:
            Engagement analysis
        """
        transcript_lower = transcript.lower()

        # Count engagement indicators
        high_count = sum(1 for phrase in self.engagement_indicators["high"]
                        if phrase in transcript_lower)
        medium_count = sum(1 for phrase in self.engagement_indicators["medium"]
                          if phrase in transcript_lower)
        low_count = sum(1 for phrase in self.engagement_indicators["low"]
                       if phrase in transcript_lower)

        # Calculate weighted score
        total_weight = (high_count * 3) + (medium_count * 2) + (low_count * -2)
        max_possible = (high_count + medium_count + abs(low_count)) * 3

        if max_possible == 0:
            score = 0.5
        else:
            score = (total_weight + max_possible) / (2 * max_possible)

        # Determine level
        if score >= 0.7:
            level = "high"
        elif score >= 0.4:
            level = "medium"
        else:
            level = "low"

        # Count questions as engagement indicator
        question_count = transcript.count("?")

        return {
            "level": level,
            "score": round(score, 2),
            "indicators": {
                "high_engagement_phrases": high_count,
                "medium_engagement_phrases": medium_count,
                "low_engagement_phrases": low_count,
                "questions_asked": question_count
            }
        }

    def identify_buying_signals(self, transcript: str) -> List[Dict[str, str]]:
        """Identify buying signals in conversation.

        Args:
            transcript: Call transcript

        Returns:
            List of buying signals
        """
        signals = []
        transcript_lower = transcript.lower()

        buying_patterns = {
            "urgency": [
                "need.*quickly", "asap", "urgent", "time sensitive",
                "as soon as possible", "right away", "immediately"
            ],
            "process": [
                "next step", "how.*proceed", "get started", "move forward",
                "begin", "kick.*off", "implementation", "timeline"
            ],
            "stakeholder": [
                "team", "partner", "colleague", "boss", "decision maker",
                "get.*approval", "discuss.*with", "loop in"
            ],
            "commitment": [
                "ready to", "prepared to", "want to move", "let's do",
                "sign up", "commit", "go ahead", "approve"
            ],
            "budget": [
                "budget", "investment", "cost", "pricing", "afford",
                "allocate", "funds", "payment"
            ]
        }

        for signal_type, patterns in buying_patterns.items():
            for pattern in patterns:
                if re.search(pattern, transcript_lower):
                    # Extract context
                    matches = re.findall(rf"([^.]*{pattern}[^.]*)", transcript_lower)
                    for match in matches:
                        if len(match) > 20:  # Meaningful context
                            signals.append({
                                "type": signal_type,
                                "signal": match.strip()[:100]  # Limit length
                            })
                            break  # One signal per type

        return signals

    def analyze_competitor_mentions(self, transcript: str) -> Dict[str, Any]:
        """Analyze competitor mentions and context.

        Args:
            transcript: Call transcript

        Returns:
            Competitor analysis
        """
        transcript_lower = transcript.lower()

        competitors = [
            "zapier", "airtable", "bubble", "webflow", "make", "integromat",
            "n8n", "retool", "outsystems", "mendix", "appian", "microsoft power",
            "salesforce", "hubspot", "monday", "asana", "notion"
        ]

        mentioned_competitors = []
        for competitor in competitors:
            if competitor in transcript_lower:
                mentioned_competitors.append(competitor)

        # Analyze context around competitor mentions
        dissatisfaction_indicators = [
            "didn't work", "couldn't", "limitations", "problems",
            "issues", "expensive", "complex", "slow", "buggy"
        ]

        satisfaction_indicators = [
            "works well", "happy with", "good", "effective",
            "useful", "helps", "solves"
        ]

        dissatisfaction_count = 0
        satisfaction_count = 0

        for competitor in mentioned_competitors:
            # Find sentences mentioning competitor
            pattern = rf"([^.]*{competitor}[^.]*\.)"
            matches = re.findall(pattern, transcript_lower)

            for match in matches:
                for indicator in dissatisfaction_indicators:
                    if indicator in match:
                        dissatisfaction_count += 1
                for indicator in satisfaction_indicators:
                    if indicator in match:
                        satisfaction_count += 1

        # Determine dissatisfaction level
        if dissatisfaction_count > satisfaction_count * 2:
            dissatisfaction_level = "high"
        elif dissatisfaction_count > satisfaction_count:
            dissatisfaction_level = "moderate"
        elif satisfaction_count > dissatisfaction_count:
            dissatisfaction_level = "low"
        else:
            dissatisfaction_level = "neutral"

        return {
            "competitors": mentioned_competitors,
            "count": len(mentioned_competitors),
            "dissatisfaction_level": dissatisfaction_level,
            "dissatisfaction_signals": dissatisfaction_count,
            "satisfaction_signals": satisfaction_count
        }

    def extract_emotional_keywords(self, transcript: str) -> Dict[str, List[str]]:
        """Extract emotional keywords categorized by type.

        Args:
            transcript: Call transcript

        Returns:
            Categorized emotional keywords
        """
        transcript_lower = transcript.lower()

        emotional_categories = {
            "positive": [
                "happy", "excited", "pleased", "satisfied", "confident",
                "optimistic", "enthusiastic", "hopeful", "impressed", "delighted"
            ],
            "negative": [
                "frustrated", "disappointed", "angry", "upset", "worried",
                "concerned", "anxious", "stressed", "overwhelmed", "confused"
            ],
            "neutral": [
                "curious", "interested", "considering", "thinking", "evaluating",
                "wondering", "questioning", "exploring"
            ]
        }

        found_keywords = {"positive": [], "negative": [], "neutral": []}

        for category, keywords in emotional_categories.items():
            for keyword in keywords:
                if keyword in transcript_lower:
                    found_keywords[category].append(keyword)

        return found_keywords

    def analyze_tone_shifts(self, transcript: str) -> List[Dict[str, Any]]:
        """Analyze significant tone shifts in conversation.

        Args:
            transcript: Call transcript

        Returns:
            List of tone shift events
        """
        lines = transcript.split('\n')
        shifts = []

        if len(lines) < 10:
            return shifts

        # Analyze in windows of 5 lines
        window_size = 5
        previous_sentiment = None

        for i in range(0, len(lines) - window_size, window_size // 2):
            window = lines[i:i + window_size]
            window_text = '\n'.join(window)

            if window_text.strip():
                score = self._calculate_sentiment_score(window_text)

                if score >= 0.6:
                    current_sentiment = "positive"
                elif score <= 0.4:
                    current_sentiment = "negative"
                else:
                    current_sentiment = "neutral"

                # Detect shift
                if previous_sentiment and previous_sentiment != current_sentiment:
                    shift_magnitude = abs(score - (0.7 if previous_sentiment == "positive"
                                                  else 0.3 if previous_sentiment == "negative"
                                                  else 0.5))

                    if shift_magnitude >= 0.3:  # Significant shift
                        shifts.append({
                            "position": f"Line {i}",
                            "from": previous_sentiment,
                            "to": current_sentiment,
                            "magnitude": round(shift_magnitude, 2),
                            "context": window[0][:100] if window else ""
                        })

                previous_sentiment = current_sentiment

        return shifts

    def calculate_conversation_quality(self, transcript: str,
                                     metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Calculate overall conversation quality metrics.

        Args:
            transcript: Call transcript
            metadata: Optional call metadata (duration, talk ratio, etc.)

        Returns:
            Quality assessment
        """
        # Sentiment score
        sentiment = self.analyze(transcript)

        # Engagement score
        engagement = self.calculate_engagement(transcript)

        # Extract key metrics
        lines = transcript.split('\n')
        customer_lines = [l for l in lines if "customer:" in l.lower()]
        agent_lines = [l for l in lines if "alex:" in l.lower()]

        # Calculate talk ratio
        total_lines = len(customer_lines) + len(agent_lines)
        if total_lines > 0:
            customer_talk_ratio = len(customer_lines) / total_lines
        else:
            customer_talk_ratio = 0

        # Question effectiveness
        questions = transcript.count("?")
        questions_per_minute = 0
        if metadata and metadata.get("duration"):
            duration_minutes = metadata["duration"] / 60
            questions_per_minute = questions / max(duration_minutes, 1)

        # Calculate quality score
        quality_components = {
            "sentiment_score": sentiment.score * 30,  # 30% weight
            "engagement_score": engagement["score"] * 30,  # 30% weight
            "talk_ratio_score": min(customer_talk_ratio * 2, 1) * 20,  # 20% weight, ideal is 50%+
            "interaction_score": min(questions_per_minute / 3, 1) * 20  # 20% weight, 3 q/min is good
        }

        total_quality_score = sum(quality_components.values())

        # Determine rating
        if total_quality_score >= 80:
            rating = "excellent"
        elif total_quality_score >= 60:
            rating = "good"
        elif total_quality_score >= 40:
            rating = "fair"
        else:
            rating = "needs_improvement"

        return {
            "score": round(total_quality_score, 1),
            "rating": rating,
            "components": quality_components,
            "metrics": {
                "sentiment": sentiment.overall,
                "engagement": engagement["level"],
                "customer_talk_ratio": round(customer_talk_ratio, 2),
                "questions_per_minute": round(questions_per_minute, 1)
            }
        }