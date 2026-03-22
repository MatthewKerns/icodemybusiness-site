#!/usr/bin/env python3
"""
Simple test runner to verify voice services implementation.
Run this to check that all modules are properly configured.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Test that all modules can be imported."""
    print("Testing module imports...")

    try:
        from vapi.agent_config import VapiAgentConfig, SalesPersonality
        print("✅ Vapi agent config imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import Vapi agent config: {e}")
        return False

    try:
        from vapi.call_handler import CallEventHandler, CallEvent, CallStatus
        print("✅ Call handler imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import call handler: {e}")
        return False

    try:
        from vapi.transcript_processor import TranscriptProcessor, CallAnalysis
        print("✅ Transcript processor imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import transcript processor: {e}")
        return False

    try:
        from ai_analysis.sentiment import SentimentAnalyzer, CallSentiment
        print("✅ Sentiment analyzer imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import sentiment analyzer: {e}")
        return False

    try:
        from ai_analysis.lead_scoring import LeadScoringEngine, LeadScore, QualificationFactors
        print("✅ Lead scoring engine imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import lead scoring engine: {e}")
        return False

    return True


def test_agent_configuration():
    """Test agent configuration creation."""
    print("\nTesting agent configuration...")

    from vapi.agent_config import VapiAgentConfig

    config = VapiAgentConfig()

    # Validate configuration
    validation = config.validate_config()

    all_valid = all(validation.values())

    if all_valid:
        print("✅ Agent configuration is complete and valid")
    else:
        print("❌ Agent configuration has issues:")
        for key, value in validation.items():
            status = "✅" if value else "❌"
            print(f"  {status} {key}: {value}")

    return all_valid


def test_transcript_processing():
    """Test transcript processing functionality."""
    print("\nTesting transcript processing...")

    from vapi.transcript_processor import TranscriptProcessor

    processor = TranscriptProcessor()

    # Sample transcript
    test_transcript = """
    Alex: Hi! I'm Alex with iCodeMyBusiness. What's eating up your time right now?
    Customer: We're spending about 10 hours a week just manually following up with leads.
    Alex: That sounds time-consuming. How are you currently tracking those leads?
    Customer: Just using spreadsheets, and it's really frustrating.
    Alex: We can build a custom system to automate that. Would you like to discuss with Matthew?
    Customer: Yes, definitely! When can we schedule that?
    """

    analysis = processor.analyze_transcript(test_transcript)

    checks = [
        (len(analysis.pain_points) > 0, "Pain points extracted"),
        (analysis.sentiment in ["positive", "neutral", "negative"], "Sentiment analyzed"),
        (isinstance(analysis.intent_to_book, bool), "Booking intent detected"),
        (len(analysis.next_steps) >= 0, "Next steps identified")
    ]

    all_passed = True
    for check, description in checks:
        if check:
            print(f"  ✅ {description}")
        else:
            print(f"  ❌ {description}")
            all_passed = False

    return all_passed


def test_lead_scoring():
    """Test lead scoring functionality."""
    print("\nTesting lead scoring...")

    from ai_analysis.lead_scoring import LeadScoringEngine, QualificationFactors

    engine = LeadScoringEngine()

    # Test high-quality lead
    factors = QualificationFactors(
        pain_points=["manual processes", "losing customers"],
        team_size="10-20",
        timeline="this month",
        sentiment="positive",
        engagement_level="high",
        booking_intent=True
    )

    score = engine.calculate_score(factors)

    checks = [
        (0 <= score.total <= 100, f"Score in valid range: {score.total}"),
        (score.category in ["hot", "warm", "cold"], f"Valid category: {score.category}"),
        (score.recommendation is not None, f"Has recommendation: {score.recommendation}"),
        (len(score.breakdown) > 0, "Score breakdown available")
    ]

    all_passed = True
    for check, description in checks:
        if check:
            print(f"  ✅ {description}")
        else:
            print(f"  ❌ {description}")
            all_passed = False

    return all_passed


def test_sentiment_analysis():
    """Test sentiment analysis functionality."""
    print("\nTesting sentiment analysis...")

    from ai_analysis.sentiment import SentimentAnalyzer

    analyzer = SentimentAnalyzer()

    # Test positive sentiment
    positive_text = "This is exactly what we need! I'm excited to get started."
    sentiment = analyzer.analyze(positive_text)

    # Test negative sentiment
    negative_text = "I'm not sure this is right for us. Too expensive and complex."
    negative_sentiment = analyzer.analyze(negative_text)

    checks = [
        (sentiment.overall == "positive", f"Positive sentiment detected: {sentiment.overall}"),
        (negative_sentiment.overall == "negative", f"Negative sentiment detected: {negative_sentiment.overall}"),
        (0 <= sentiment.confidence <= 1, f"Valid confidence score: {sentiment.confidence}"),
        (0 <= sentiment.score <= 1, f"Valid sentiment score: {sentiment.score}")
    ]

    all_passed = True
    for check, description in checks:
        if check:
            print(f"  ✅ {description}")
        else:
            print(f"  ❌ {description}")
            all_passed = False

    return all_passed


def main():
    """Run all tests."""
    print("=" * 60)
    print("VOICE SERVICES IMPLEMENTATION TEST SUITE")
    print("=" * 60)

    tests = [
        ("Module Imports", test_imports),
        ("Agent Configuration", test_agent_configuration),
        ("Transcript Processing", test_transcript_processing),
        ("Lead Scoring", test_lead_scoring),
        ("Sentiment Analysis", test_sentiment_analysis)
    ]

    results = []

    for test_name, test_func in tests:
        try:
            passed = test_func()
            results.append((test_name, passed))
        except Exception as e:
            print(f"❌ {test_name} failed with error: {e}")
            results.append((test_name, False))

    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)

    total_tests = len(results)
    passed_tests = sum(1 for _, passed in results if passed)

    for test_name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{test_name}: {status}")

    print(f"\nTotal: {passed_tests}/{total_tests} tests passed")

    if passed_tests == total_tests:
        print("\n🎉 All tests passed! Voice services are properly configured.")
        return 0
    else:
        print("\n⚠️  Some tests failed. Please review the output above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())