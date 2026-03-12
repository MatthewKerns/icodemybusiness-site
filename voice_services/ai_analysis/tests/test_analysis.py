"""
Test suite for AI analysis components.
Tests sentiment analysis, lead scoring, and conversation intelligence.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
import numpy as np

# Import modules to test
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from ai_analysis.sentiment import SentimentAnalyzer, CallSentiment
from ai_analysis.lead_scoring import LeadScoringEngine, LeadScore, QualificationFactors


class TestSentimentAnalyzer:
    """Test sentiment analysis for voice calls."""

    @pytest.fixture
    def analyzer(self):
        """Create a sentiment analyzer instance."""
        return SentimentAnalyzer()

    def test_analyze_positive_sentiment(self, analyzer):
        """Test analyzing positive sentiment in conversation."""
        transcript = """
        Customer: This is exactly what we've been looking for!
        Alex: I'm glad to hear that resonates with you.
        Customer: Yes, I'm really excited about the possibilities.
        Alex: Great! Let me tell you more about how we can help.
        Customer: Please do, this sounds fantastic.
        """

        sentiment = analyzer.analyze(transcript)

        assert sentiment.overall == "positive"
        assert sentiment.confidence >= 0.8
        assert sentiment.score >= 0.7
        assert len(sentiment.emotional_moments) > 0
        assert any("excited" in moment.lower() for moment in sentiment.emotional_moments)

    def test_analyze_negative_sentiment(self, analyzer):
        """Test analyzing negative sentiment in conversation."""
        transcript = """
        Customer: I'm not sure this is right for us.
        Alex: Can you tell me more about your concerns?
        Customer: It seems too complex and probably expensive.
        Alex: I understand your hesitation.
        Customer: We've had bad experiences with similar services.
        """

        sentiment = analyzer.analyze(transcript)

        assert sentiment.overall == "negative"
        assert sentiment.confidence >= 0.7
        assert sentiment.score <= 0.3
        assert len(sentiment.concerns) > 0
        assert any("complex" in concern.lower() or "expensive" in concern.lower()
                  for concern in sentiment.concerns)

    def test_analyze_neutral_sentiment(self, analyzer):
        """Test analyzing neutral/mixed sentiment."""
        transcript = """
        Customer: I see what you're saying.
        Alex: Do you have any questions about our approach?
        Customer: Maybe. I need to think about it.
        Alex: Of course, take your time.
        Customer: Can you send me some information?
        """

        sentiment = analyzer.analyze(transcript)

        assert sentiment.overall == "neutral"
        assert 0.4 <= sentiment.score <= 0.6
        assert sentiment.confidence >= 0.5

    def test_sentiment_progression(self, analyzer):
        """Test tracking sentiment changes throughout conversation."""
        transcript_segments = [
            "Customer: I don't know if we need this.",  # Negative start
            "Alex: Let me explain how it could help. Customer: Okay, I'm listening.",  # Neutral
            "Customer: That actually makes sense. Tell me more.",  # Warming up
            "Customer: This could really solve our problem! When can we start?"  # Positive end
        ]

        progression = analyzer.track_progression(transcript_segments)

        assert len(progression) == 4
        assert progression[0]["sentiment"] == "negative"
        assert progression[-1]["sentiment"] == "positive"
        assert progression[-1]["score"] > progression[0]["score"]

    def test_extract_emotional_keywords(self, analyzer):
        """Test extracting emotional keywords from transcript."""
        transcript = """
        Customer: I'm frustrated with our current system. It's disappointing.
        But I'm hopeful this could be the solution. I'm impressed by what you've shown.
        """

        keywords = analyzer.extract_emotional_keywords(transcript)

        assert "frustrated" in keywords["negative"]
        assert "disappointing" in keywords["negative"]
        assert "hopeful" in keywords["positive"]
        assert "impressed" in keywords["positive"]

    def test_calculate_engagement_level(self, analyzer):
        """Test calculating customer engagement level."""
        high_engagement = """
        Customer: That's interesting! Can you tell me more about that feature?
        Alex: Certainly! [explains]
        Customer: How does that integrate with our existing tools?
        Alex: Great question! [explains]
        Customer: What about reporting capabilities?
        """

        low_engagement = """
        Customer: Uh huh.
        Alex: [explains feature]
        Customer: Okay.
        Alex: [asks question]
        Customer: Not sure.
        """

        high_score = analyzer.calculate_engagement(high_engagement)
        low_score = analyzer.calculate_engagement(low_engagement)

        assert high_score["level"] == "high"
        assert high_score["score"] >= 0.7
        assert low_score["level"] == "low"
        assert low_score["score"] <= 0.3


class TestLeadScoringEngine:
    """Test AI-based lead scoring logic."""

    @pytest.fixture
    def engine(self):
        """Create a lead scoring engine instance."""
        return LeadScoringEngine()

    def test_score_high_quality_lead(self, engine):
        """Test scoring a high-quality lead."""
        factors = QualificationFactors(
            pain_points=["manual processes", "losing customers", "can't scale"],
            team_size="10-20",
            timeline="this month",
            budget_mentioned=True,
            authority_to_decide=True,
            current_solution_inadequate=True,
            engagement_level="high",
            sentiment="positive",
            questions_asked=5,
            objections_raised=1,
            booking_intent=True
        )

        score = engine.calculate_score(factors)

        assert score.total >= 80
        assert score.category == "hot"
        assert score.recommendation == "immediate_follow_up"

    def test_score_medium_quality_lead(self, engine):
        """Test scoring a medium-quality lead."""
        factors = QualificationFactors(
            pain_points=["some inefficiencies"],
            team_size="5-10",
            timeline="next quarter",
            budget_mentioned=False,
            authority_to_decide=False,  # Needs approval
            current_solution_inadequate=True,
            engagement_level="medium",
            sentiment="neutral",
            questions_asked=2,
            objections_raised=2,
            booking_intent=False
        )

        score = engine.calculate_score(factors)

        assert 40 <= score.total <= 70
        assert score.category == "warm"
        assert score.recommendation == "nurture"

    def test_score_low_quality_lead(self, engine):
        """Test scoring a low-quality lead."""
        factors = QualificationFactors(
            pain_points=[],
            team_size="1-2",
            timeline="not sure",
            budget_mentioned=False,
            authority_to_decide=False,
            current_solution_inadequate=False,
            engagement_level="low",
            sentiment="negative",
            questions_asked=0,
            objections_raised=5,
            booking_intent=False
        )

        score = engine.calculate_score(factors)

        assert score.total <= 30
        assert score.category == "cold"
        assert score.recommendation == "long_term_nurture"

    def test_bant_scoring(self, engine):
        """Test BANT (Budget, Authority, Need, Timeline) scoring."""
        bant_factors = {
            "budget": True,
            "authority": True,
            "need": ["critical pain points"],
            "timeline": "immediate"
        }

        bant_score = engine.calculate_bant_score(bant_factors)

        assert bant_score["total"] == 100
        assert all(v == 25 for v in [
            bant_score["budget_score"],
            bant_score["authority_score"],
            bant_score["need_score"],
            bant_score["timeline_score"]
        ])

    def test_predictive_scoring(self, engine):
        """Test predictive lead scoring based on historical patterns."""
        current_lead = QualificationFactors(
            pain_points=["lead management", "automation"],
            team_size="10-20",
            timeline="this month",
            industry="saas"
        )

        with patch.object(engine, 'get_historical_conversions') as mock_history:
            mock_history.return_value = [
                {"industry": "saas", "conversion_rate": 0.35},
                {"team_size": "10-20", "conversion_rate": 0.28},
                {"pain": "lead management", "conversion_rate": 0.42}
            ]

            prediction = engine.predict_conversion_probability(current_lead)

            assert 0.3 <= prediction["probability"] <= 0.4
            assert prediction["confidence"] >= 0.7
            assert len(prediction["similar_patterns"]) > 0

    def test_score_components_breakdown(self, engine):
        """Test breakdown of score components."""
        factors = QualificationFactors(
            pain_points=["critical issue"],
            budget_mentioned=True,
            timeline="this week",
            engagement_level="high"
        )

        score = engine.calculate_score(factors)
        breakdown = score.get_breakdown()

        assert "pain_severity" in breakdown
        assert "budget_awareness" in breakdown
        assert "timeline_urgency" in breakdown
        assert "engagement" in breakdown

        # Verify components sum to total (approximately, due to weighting)
        component_sum = sum(breakdown.values())
        assert abs(component_sum - score.total) < 5

    def test_industry_specific_scoring(self, engine):
        """Test industry-specific scoring adjustments."""
        tech_factors = QualificationFactors(
            industry="technology",
            pain_points=["scaling", "automation"],
            team_size="20+"
        )

        retail_factors = QualificationFactors(
            industry="retail",
            pain_points=["inventory", "customer tracking"],
            team_size="5-10"
        )

        tech_score = engine.calculate_score(tech_factors)
        retail_score = engine.calculate_score(retail_factors)

        # Different industries should have different scoring weights
        assert tech_score.industry_modifier != retail_score.industry_modifier

    def test_objection_impact_on_score(self, engine):
        """Test how objections impact lead score."""
        no_objections = QualificationFactors(
            pain_points=["critical"],
            objections_raised=0,
            sentiment="positive"
        )

        minor_objections = QualificationFactors(
            pain_points=["critical"],
            objections_raised=2,
            objection_types=["pricing", "timeline"],
            sentiment="positive"
        )

        major_objections = QualificationFactors(
            pain_points=["critical"],
            objections_raised=5,
            objection_types=["not interested", "wrong fit", "competitor"],
            sentiment="negative"
        )

        score_none = engine.calculate_score(no_objections)
        score_minor = engine.calculate_score(minor_objections)
        score_major = engine.calculate_score(major_objections)

        assert score_none.total > score_minor.total > score_major.total
        assert score_major.total <= score_none.total * 0.5  # Major objections heavily impact score


class TestConversationIntelligence:
    """Test advanced conversation analysis features."""

    @pytest.fixture
    def analyzer(self):
        """Create complete analysis setup."""
        return {
            "sentiment": SentimentAnalyzer(),
            "scoring": LeadScoringEngine()
        }

    def test_identify_buying_signals(self, analyzer):
        """Test identifying buying signals in conversation."""
        transcript = """
        Customer: We need to solve this quickly.
        Alex: Our typical implementation is 2-3 weeks.
        Customer: That works. What's the next step?
        Alex: We start with a discovery call with Matthew.
        Customer: When can we schedule that? Also, who else should be on the call from our side?
        """

        sentiment_analyzer = analyzer["sentiment"]
        signals = sentiment_analyzer.identify_buying_signals(transcript)

        assert len(signals) >= 3
        assert any("urgency" in s["type"] for s in signals)
        assert any("process" in s["type"] for s in signals)
        assert any("stakeholder" in s["type"] for s in signals)

    def test_competitor_mention_analysis(self, analyzer):
        """Test analyzing competitor mentions."""
        transcript = """
        Customer: We looked at Zapier but it couldn't do what we need.
        Alex: What specific limitations did you encounter?
        Customer: It couldn't handle our custom workflow. We also tried Airtable.
        Alex: I understand. Our custom-coded approach doesn't have those limitations.
        """

        sentiment_analyzer = analyzer["sentiment"]
        competitor_analysis = sentiment_analyzer.analyze_competitor_mentions(transcript)

        assert len(competitor_analysis["competitors"]) == 2
        assert "Zapier" in competitor_analysis["competitors"]
        assert "Airtable" in competitor_analysis["competitors"]
        assert competitor_analysis["dissatisfaction_level"] == "high"

    def test_call_quality_metrics(self, analyzer):
        """Test calculating call quality metrics."""
        good_call = {
            "transcript": "Great conversation with clear next steps",
            "duration": 300,  # 5 minutes
            "talk_ratio": 0.6,  # Customer talked 60% of time
            "interruptions": 0,
            "dead_air_seconds": 5
        }

        poor_call = {
            "transcript": "Difficult conversation",
            "duration": 60,  # 1 minute
            "talk_ratio": 0.2,  # Customer barely talked
            "interruptions": 8,
            "dead_air_seconds": 45
        }

        scoring_engine = analyzer["scoring"]

        good_quality = scoring_engine.calculate_call_quality(good_call)
        poor_quality = scoring_engine.calculate_call_quality(poor_call)

        assert good_quality["score"] >= 80
        assert good_quality["rating"] == "excellent"

        assert poor_quality["score"] <= 40
        assert poor_quality["rating"] == "needs_improvement"

    def test_coaching_recommendations(self, analyzer):
        """Test generating coaching recommendations based on call analysis."""
        call_data = {
            "transcript": "Agent talked too much, interrupted customer",
            "metrics": {
                "talk_ratio": 0.8,  # Agent talked 80%
                "questions_asked": 1,
                "objections_handled": 0,
                "interruptions": 5
            }
        }

        scoring_engine = analyzer["scoring"]
        recommendations = scoring_engine.generate_coaching_points(call_data)

        assert len(recommendations) >= 3
        assert any("talk less" in r.lower() or "listen more" in r.lower()
                  for r in recommendations)
        assert any("interrupt" in r.lower() for r in recommendations)
        assert any("question" in r.lower() for r in recommendations)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])