"""
AI-based lead scoring engine for voice calls.
Scores leads based on BANT criteria and conversation signals.
"""

from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
import statistics


class LeadCategory(Enum):
    """Lead temperature categories."""
    HOT = "hot"
    WARM = "warm"
    COLD = "cold"


class Recommendation(Enum):
    """Follow-up action recommendations."""
    IMMEDIATE_FOLLOW_UP = "immediate_follow_up"
    SCHEDULE_DEMO = "schedule_demo"
    NURTURE = "nurture"
    LONG_TERM_NURTURE = "long_term_nurture"
    DISQUALIFY = "disqualify"


@dataclass
class QualificationFactors:
    """Factors used for lead qualification."""
    # Pain and need
    pain_points: List[str] = field(default_factory=list)
    current_solution_inadequate: bool = False

    # Budget
    budget_mentioned: bool = False
    budget_range: Optional[str] = None

    # Authority
    authority_to_decide: bool = False
    decision_maker_role: Optional[str] = None

    # Timeline
    timeline: Optional[str] = None
    urgency_level: Optional[str] = None

    # Company info
    team_size: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None

    # Engagement
    engagement_level: str = "medium"
    questions_asked: int = 0
    sentiment: str = "neutral"

    # Objections
    objections_raised: int = 0
    objection_types: List[str] = field(default_factory=list)

    # Intent
    booking_intent: bool = False
    competitor_mentioned: bool = False
    referral_source: Optional[str] = None


@dataclass
class LeadScore:
    """Lead score calculation result."""
    total: int  # 0-100
    category: str  # hot, warm, cold
    recommendation: str
    breakdown: Dict[str, float] = field(default_factory=dict)
    confidence: float = 0.0
    industry_modifier: float = 1.0


class LeadScoringEngine:
    """Calculate lead scores based on multiple factors."""

    def __init__(self):
        """Initialize lead scoring engine."""
        self.scoring_weights = {
            "pain_severity": 0.25,
            "budget_awareness": 0.20,
            "authority": 0.15,
            "timeline_urgency": 0.15,
            "engagement": 0.15,
            "company_fit": 0.10
        }

        self.industry_multipliers = {
            "saas": 1.2,
            "technology": 1.2,
            "ecommerce": 1.15,
            "consulting": 1.1,
            "retail": 1.05,
            "manufacturing": 1.0,
            "healthcare": 0.95,
            "education": 0.9
        }

        self.timeline_scores = {
            "immediate": 100,
            "this week": 90,
            "this month": 80,
            "short_term": 70,
            "this quarter": 60,
            "medium_term": 50,
            "next quarter": 40,
            "long_term": 30,
            "this year": 20,
            "undefined": 10,
            "not sure": 5
        }

    def calculate_score(self, factors: QualificationFactors) -> LeadScore:
        """Calculate comprehensive lead score.

        Args:
            factors: Qualification factors

        Returns:
            Lead score with breakdown
        """
        breakdown = {}

        # Calculate component scores
        breakdown["pain_severity"] = self._score_pain_severity(factors)
        breakdown["budget_awareness"] = self._score_budget(factors)
        breakdown["authority"] = self._score_authority(factors)
        breakdown["timeline_urgency"] = self._score_timeline(factors)
        breakdown["engagement"] = self._score_engagement(factors)
        breakdown["company_fit"] = self._score_company_fit(factors)

        # Apply weights
        weighted_total = sum(
            score * self.scoring_weights[component]
            for component, score in breakdown.items()
        )

        # Apply industry modifier
        industry_modifier = self.industry_multipliers.get(
            factors.industry, 1.0) if factors.industry else 1.0

        # Apply objection penalties
        objection_penalty = self._calculate_objection_penalty(factors)

        # Calculate final score
        total = int(weighted_total * industry_modifier * (1 - objection_penalty))
        total = max(0, min(100, total))  # Clamp to 0-100

        # Determine category
        if total >= 80:
            category = LeadCategory.HOT.value
        elif total >= 40:
            category = LeadCategory.WARM.value
        else:
            category = LeadCategory.COLD.value

        # Generate recommendation
        recommendation = self._generate_recommendation(total, factors)

        # Calculate confidence
        confidence = self._calculate_confidence(factors)

        return LeadScore(
            total=total,
            category=category,
            recommendation=recommendation,
            breakdown=breakdown,
            confidence=confidence,
            industry_modifier=industry_modifier
        )

    def _score_pain_severity(self, factors: QualificationFactors) -> float:
        """Score based on pain points and severity.

        Args:
            factors: Qualification factors

        Returns:
            Pain severity score (0-100)
        """
        if not factors.pain_points:
            return 0

        pain_count = len(factors.pain_points)
        base_score = min(pain_count * 25, 100)

        # Boost for critical pain keywords
        critical_keywords = ["losing customers", "can't scale", "hours per week",
                           "manual", "bottleneck", "urgent"]

        critical_count = sum(1 for pain in factors.pain_points
                           if any(keyword in pain.lower()
                                 for keyword in critical_keywords))

        boost = critical_count * 10
        return min(base_score + boost, 100)

    def _score_budget(self, factors: QualificationFactors) -> float:
        """Score based on budget awareness and fit.

        Args:
            factors: Qualification factors

        Returns:
            Budget score (0-100)
        """
        if not factors.budget_mentioned:
            return 25  # Unknown budget gets low score

        # Budget mentioned is positive
        score = 50

        # Add points for budget range if specified
        if factors.budget_range:
            budget_ranges = {
                "enterprise": 100,
                "mid-market": 80,
                "small-business": 60,
                "startup": 40
            }
            score = budget_ranges.get(factors.budget_range, 50)

        return score

    def _score_authority(self, factors: QualificationFactors) -> float:
        """Score based on decision-making authority.

        Args:
            factors: Qualification factors

        Returns:
            Authority score (0-100)
        """
        if factors.authority_to_decide:
            score = 75

            # Boost for specific roles
            if factors.decision_maker_role:
                role_scores = {
                    "owner": 100,
                    "founder": 100,
                    "ceo": 95,
                    "president": 90,
                    "director": 70,
                    "manager": 50,
                    "coordinator": 30
                }

                role_lower = factors.decision_maker_role.lower()
                for role, role_score in role_scores.items():
                    if role in role_lower:
                        score = role_score
                        break

            return score
        else:
            return 25  # Needs approval from others

    def _score_timeline(self, factors: QualificationFactors) -> float:
        """Score based on purchase timeline.

        Args:
            factors: Qualification factors

        Returns:
            Timeline score (0-100)
        """
        if factors.timeline:
            return self.timeline_scores.get(factors.timeline, 30)

        # Check urgency level as fallback
        if factors.urgency_level:
            urgency_scores = {
                "high": 80,
                "medium": 50,
                "low": 20
            }
            return urgency_scores.get(factors.urgency_level, 30)

        return 10  # No timeline specified

    def _score_engagement(self, factors: QualificationFactors) -> float:
        """Score based on engagement and sentiment.

        Args:
            factors: Qualification factors

        Returns:
            Engagement score (0-100)
        """
        # Base score from engagement level
        engagement_scores = {
            "high": 70,
            "medium": 40,
            "low": 10
        }
        base_score = engagement_scores.get(factors.engagement_level, 40)

        # Sentiment modifier
        sentiment_modifiers = {
            "positive": 1.3,
            "neutral": 1.0,
            "negative": 0.7
        }
        sentiment_modifier = sentiment_modifiers.get(factors.sentiment, 1.0)

        # Questions asked bonus
        question_bonus = min(factors.questions_asked * 5, 20)

        # Booking intent major bonus
        booking_bonus = 30 if factors.booking_intent else 0

        total = (base_score * sentiment_modifier) + question_bonus + booking_bonus
        return min(total, 100)

    def _score_company_fit(self, factors: QualificationFactors) -> float:
        """Score based on company characteristics fit.

        Args:
            factors: Qualification factors

        Returns:
            Company fit score (0-100)
        """
        score = 50  # Base score

        # Team size scoring
        if factors.team_size:
            team_scores = {
                "1-2": 30,
                "3-5": 50,
                "5-10": 70,
                "10-20": 85,
                "20+": 100
            }
            score = team_scores.get(factors.team_size, 50)

        # Industry boost
        if factors.industry in ["saas", "technology", "ecommerce"]:
            score = min(score + 20, 100)

        # Referral bonus
        if factors.referral_source:
            score = min(score + 15, 100)

        return score

    def _calculate_objection_penalty(self, factors: QualificationFactors) -> float:
        """Calculate penalty based on objections raised.

        Args:
            factors: Qualification factors

        Returns:
            Penalty factor (0-1, where 0 is no penalty)
        """
        if factors.objections_raised == 0:
            return 0

        # Base penalty per objection
        base_penalty = factors.objections_raised * 0.05

        # Additional penalty for critical objections
        critical_objections = ["not interested", "wrong fit", "too expensive",
                              "already have solution", "competitor"]

        critical_count = sum(1 for objection in factors.objection_types
                           if any(critical in objection.lower()
                                 for critical in critical_objections))

        critical_penalty = critical_count * 0.1

        total_penalty = base_penalty + critical_penalty
        return min(total_penalty, 0.5)  # Cap at 50% penalty

    def _generate_recommendation(self, score: int,
                                factors: QualificationFactors) -> str:
        """Generate follow-up recommendation.

        Args:
            score: Lead score
            factors: Qualification factors

        Returns:
            Action recommendation
        """
        if factors.booking_intent and score >= 60:
            return Recommendation.SCHEDULE_DEMO.value

        if score >= 80:
            return Recommendation.IMMEDIATE_FOLLOW_UP.value
        elif score >= 60:
            return Recommendation.SCHEDULE_DEMO.value
        elif score >= 40:
            return Recommendation.NURTURE.value
        elif score >= 20:
            return Recommendation.LONG_TERM_NURTURE.value
        else:
            return Recommendation.DISQUALIFY.value

    def _calculate_confidence(self, factors: QualificationFactors) -> float:
        """Calculate confidence in the scoring.

        Args:
            factors: Qualification factors

        Returns:
            Confidence score (0-1)
        """
        # Count how many data points we have
        data_points = 0
        total_possible = 11

        if factors.pain_points:
            data_points += 1
        if factors.budget_mentioned:
            data_points += 1
        if factors.authority_to_decide is not None:
            data_points += 1
        if factors.timeline:
            data_points += 1
        if factors.team_size:
            data_points += 1
        if factors.industry:
            data_points += 1
        if factors.engagement_level != "medium":  # Non-default
            data_points += 1
        if factors.questions_asked > 0:
            data_points += 1
        if factors.sentiment != "neutral":  # Non-default
            data_points += 1
        if factors.objections_raised > 0:
            data_points += 1
        if factors.booking_intent:
            data_points += 1

        confidence = data_points / total_possible
        return round(confidence, 2)

    def calculate_bant_score(self, bant_factors: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate traditional BANT score.

        Args:
            bant_factors: Budget, Authority, Need, Timeline factors

        Returns:
            BANT scoring breakdown
        """
        scores = {
            "budget_score": 0,
            "authority_score": 0,
            "need_score": 0,
            "timeline_score": 0
        }

        # Budget (25 points max)
        if bant_factors.get("budget"):
            scores["budget_score"] = 25

        # Authority (25 points max)
        if bant_factors.get("authority"):
            scores["authority_score"] = 25

        # Need (25 points max)
        needs = bant_factors.get("need", [])
        if isinstance(needs, list):
            need_strength = min(len(needs) * 8, 25)
        else:
            need_strength = 25 if needs else 0
        scores["need_score"] = need_strength

        # Timeline (25 points max)
        timeline = bant_factors.get("timeline")
        if timeline == "immediate":
            scores["timeline_score"] = 25
        elif timeline in ["this month", "short_term"]:
            scores["timeline_score"] = 20
        elif timeline in ["this quarter", "medium_term"]:
            scores["timeline_score"] = 15
        elif timeline in ["this year", "long_term"]:
            scores["timeline_score"] = 10
        else:
            scores["timeline_score"] = 5

        scores["total"] = sum(scores.values())
        return scores

    def predict_conversion_probability(self, factors: QualificationFactors,
                                      historical_data: Optional[List[Dict]] = None) -> Dict[str, Any]:
        """Predict probability of conversion based on patterns.

        Args:
            factors: Current lead factors
            historical_data: Optional historical conversion data

        Returns:
            Conversion probability and confidence
        """
        # Get historical patterns
        if not historical_data:
            historical_data = self.get_historical_conversions()

        # Find similar leads
        similar_patterns = []
        for historical in historical_data:
            similarity = self._calculate_similarity(factors, historical)
            if similarity > 0.7:  # 70% similarity threshold
                similar_patterns.append({
                    "similarity": similarity,
                    "conversion_rate": historical.get("conversion_rate", 0)
                })

        if not similar_patterns:
            # Fallback to score-based prediction
            score = self.calculate_score(factors)
            probability = score.total / 100
            confidence = 0.5  # Lower confidence without historical data
        else:
            # Weighted average of similar patterns
            total_weight = sum(p["similarity"] for p in similar_patterns)
            probability = sum(
                p["similarity"] * p["conversion_rate"] / total_weight
                for p in similar_patterns
            )
            confidence = min(len(similar_patterns) / 10, 1.0)  # More patterns = higher confidence

        return {
            "probability": round(probability, 2),
            "confidence": round(confidence, 2),
            "similar_patterns": similar_patterns[:5]  # Top 5 similar patterns
        }

    def _calculate_similarity(self, factors1: QualificationFactors,
                            factors2: Dict[str, Any]) -> float:
        """Calculate similarity between two lead profiles.

        Args:
            factors1: First lead factors
            factors2: Second lead factors (dict format)

        Returns:
            Similarity score (0-1)
        """
        similarities = []

        # Industry match
        if factors1.industry and factors2.get("industry"):
            similarities.append(1.0 if factors1.industry == factors2["industry"] else 0.0)

        # Team size similarity
        if factors1.team_size and factors2.get("team_size"):
            similarities.append(1.0 if factors1.team_size == factors2["team_size"] else 0.5)

        # Pain point overlap
        if factors1.pain_points and factors2.get("pain"):
            pain2 = factors2["pain"] if isinstance(factors2["pain"], list) else [factors2["pain"]]
            overlap = len(set(factors1.pain_points) & set(pain2))
            max_possible = max(len(factors1.pain_points), len(pain2))
            similarities.append(overlap / max_possible if max_possible > 0 else 0)

        # Timeline match
        if factors1.timeline and factors2.get("timeline"):
            similarities.append(1.0 if factors1.timeline == factors2["timeline"] else 0.3)

        if not similarities:
            return 0.0

        return sum(similarities) / len(similarities)

    def get_historical_conversions(self) -> List[Dict[str, Any]]:
        """Get historical conversion data (mock for testing).

        Returns:
            Historical conversion patterns
        """
        # In production, this would query actual historical data
        return [
            {"industry": "saas", "team_size": "10-20", "conversion_rate": 0.35,
             "pain": "manual processes"},
            {"industry": "ecommerce", "team_size": "5-10", "conversion_rate": 0.28,
             "pain": "inventory management"},
            {"industry": "technology", "team_size": "20+", "conversion_rate": 0.42,
             "pain": "scaling issues"},
            {"industry": "consulting", "team_size": "3-5", "conversion_rate": 0.25,
             "pain": "client management"},
            {"industry": "retail", "team_size": "10-20", "conversion_rate": 0.30,
             "pain": "customer tracking"}
        ]

    def get_breakdown(self, score: LeadScore) -> Dict[str, float]:
        """Get detailed score breakdown.

        Args:
            score: Lead score object

        Returns:
            Component breakdown
        """
        return score.breakdown

    def calculate_call_quality(self, call_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate call quality metrics.

        Args:
            call_data: Call metadata and metrics

        Returns:
            Quality assessment
        """
        quality_score = 50  # Base score

        # Duration scoring (optimal is 3-7 minutes)
        duration = call_data.get("duration", 0)
        if 180 <= duration <= 420:  # 3-7 minutes
            quality_score += 20
        elif 120 <= duration < 180:  # 2-3 minutes
            quality_score += 10
        elif duration > 420:  # Over 7 minutes
            quality_score += 5

        # Talk ratio scoring (optimal is 60-70% customer)
        talk_ratio = call_data.get("talk_ratio", 0.5)
        if 0.6 <= talk_ratio <= 0.7:
            quality_score += 20
        elif 0.5 <= talk_ratio < 0.6:
            quality_score += 10
        elif talk_ratio > 0.7:
            quality_score += 5

        # Interruption penalty
        interruptions = call_data.get("interruptions", 0)
        quality_score -= min(interruptions * 5, 20)

        # Dead air penalty
        dead_air = call_data.get("dead_air_seconds", 0)
        if dead_air > 30:
            quality_score -= 10
        elif dead_air > 20:
            quality_score -= 5

        # Clamp score
        quality_score = max(0, min(100, quality_score))

        # Determine rating
        if quality_score >= 80:
            rating = "excellent"
        elif quality_score >= 60:
            rating = "good"
        elif quality_score >= 40:
            rating = "fair"
        else:
            rating = "needs_improvement"

        return {
            "score": quality_score,
            "rating": rating,
            "metrics": {
                "duration": duration,
                "talk_ratio": talk_ratio,
                "interruptions": interruptions,
                "dead_air": dead_air
            }
        }

    def generate_coaching_points(self, call_data: Dict[str, Any]) -> List[str]:
        """Generate coaching recommendations based on call analysis.

        Args:
            call_data: Call data and metrics

        Returns:
            List of coaching recommendations
        """
        recommendations = []

        metrics = call_data.get("metrics", {})

        # Talk ratio coaching
        talk_ratio = metrics.get("talk_ratio", 0.5)
        if talk_ratio >= 0.8:
            recommendations.append("Agent dominated conversation - practice active listening and ask more questions")
        elif talk_ratio <= 0.2:
            recommendations.append("Customer barely spoke - work on engaging questions and conversation flow")

        # Question coaching
        questions = metrics.get("questions_asked", 0)
        if questions < 2:
            recommendations.append("Ask more discovery questions to understand customer needs")
        elif questions > 10:
            recommendations.append("Too many questions can feel like interrogation - balance with value statements")

        # Objection handling
        objections_handled = metrics.get("objections_handled", 0)
        if objections_handled == 0 and "objections" in call_data.get("transcript", "").lower():
            recommendations.append("Practice objection handling techniques")

        # Interruption coaching
        if metrics.get("interruptions", 0) >= 3:
            recommendations.append("Minimize interruptions - let customer complete their thoughts")

        # Engagement coaching
        if "not interested" in call_data.get("transcript", "").lower():
            recommendations.append("Work on creating urgency and demonstrating value early in conversation")

        # Closing coaching
        if not any(word in call_data.get("transcript", "").lower()
                  for word in ["next step", "schedule", "book", "meeting"]):
            recommendations.append("Always propose clear next steps before ending the call")

        return recommendations