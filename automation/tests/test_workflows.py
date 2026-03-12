"""
Test suite for automation workflows.
Tests all background tasks and workflows.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock, call
from datetime import datetime, timedelta
import json

from automation.tasks.lead_nurturing import (
    check_new_leads,
    initiate_nurturing_sequence,
    send_nurturing_email,
    update_lead_scores,
    calculate_engagement_score
)

from automation.tasks.metrics_aggregation import (
    calculate_daily_metrics,
    track_hourly_performance,
    generate_weekly_report,
    detect_anomalies
)

from automation.tasks.content_publishing import (
    publish_scheduled_posts,
    publish_to_platform,
    amplify_new_content,
    track_content_performance,
    adapt_content_for_platform
)

from automation.tasks.client_notifications import (
    send_milestone_updates,
    check_progress_alerts,
    send_client_notification,
    gather_weekly_progress
)


class TestLeadNurturing:
    """Test lead nurturing workflows."""

    @pytest.fixture
    def mock_leads(self):
        """Mock lead data."""
        return [
            {
                'id': 'lead1',
                'name': 'John Doe',
                'email': 'john@example.com',
                'company': 'TechCo',
                'industry': 'Technology',
                'source': 'website'
            },
            {
                'id': 'lead2',
                'name': 'Jane Smith',
                'email': 'jane@example.com',
                'company': 'FinCo',
                'industry': 'Finance',
                'source': 'linkedin'
            }
        ]

    @patch('automation.tasks.lead_nurturing.httpx.get')
    @patch('automation.tasks.lead_nurturing.initiate_nurturing_sequence')
    @patch('automation.tasks.lead_nurturing.track_metric')
    def test_check_new_leads(self, mock_track, mock_initiate, mock_get, mock_leads):
        """Test checking for new leads."""
        # Setup
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_leads
        mock_get.return_value = mock_response

        # Execute
        result = check_new_leads()

        # Assert
        assert result['processed'] == 2
        assert mock_initiate.delay.call_count == 2
        mock_track.assert_called()

    @patch('automation.tasks.lead_nurturing.send_nurturing_email')
    @patch('automation.tasks.lead_nurturing.httpx.patch')
    @patch('automation.tasks.lead_nurturing.track_metric')
    def test_initiate_nurturing_sequence(self, mock_track, mock_patch, mock_send):
        """Test initiating nurturing sequence."""
        # Setup
        lead_data = {
            'id': 'lead1',
            'name': 'John Doe',
            'email': 'john@example.com'
        }
        mock_response = Mock()
        mock_response.status_code = 200
        mock_patch.return_value = mock_response

        # Execute
        result = initiate_nurturing_sequence('lead1', lead_data)

        # Assert
        assert result['sequence_initiated'] == True
        assert mock_send.apply_async.call_count > 0
        mock_track.assert_called_with('leads.nurturing_started', 1)

    @patch('automation.tasks.lead_nurturing.send_email')
    @patch('automation.tasks.lead_nurturing.track_engagement')
    @patch('automation.tasks.lead_nurturing.track_metric')
    def test_send_nurturing_email(self, mock_track, mock_engagement, mock_send):
        """Test sending nurturing email."""
        # Setup
        lead_data = {
            'name': 'John',
            'email': 'john@example.com',
            'company': 'TechCo',
            'industry': 'Technology'
        }

        # Execute
        result = send_nurturing_email('lead1', 'welcome', lead_data)

        # Assert
        assert result['email_sent'] == True
        mock_send.assert_called_once()
        mock_engagement.assert_called_once()
        mock_track.assert_called()

    def test_calculate_engagement_score(self):
        """Test engagement score calculation."""
        # Test with high engagement
        lead_high = {
            'emails_opened': 10,
            'links_clicked': 5,
            'pages_viewed': 20,
            'resources_downloaded': 3,
            'forms_submitted': 2,
            'last_activity': datetime.utcnow().isoformat()
        }
        score_high = calculate_engagement_score(lead_high)
        assert score_high > 80

        # Test with low engagement
        lead_low = {
            'emails_opened': 1,
            'links_clicked': 0,
            'pages_viewed': 2,
            'resources_downloaded': 0,
            'forms_submitted': 0,
            'last_activity': (datetime.utcnow() - timedelta(days=30)).isoformat()
        }
        score_low = calculate_engagement_score(lead_low)
        assert score_low < 20

    @patch('automation.tasks.lead_nurturing.httpx.get')
    @patch('automation.tasks.lead_nurturing.httpx.patch')
    @patch('automation.tasks.lead_nurturing.notify_sales_team')
    def test_update_lead_scores(self, mock_notify, mock_patch, mock_get):
        """Test lead scoring update."""
        # Setup
        mock_leads = [
            {'id': '1', 'emails_opened': 5, 'links_clicked': 3},
            {'id': '2', 'emails_opened': 10, 'links_clicked': 8}
        ]
        mock_response = Mock()
        mock_response.json.return_value = mock_leads
        mock_get.return_value = mock_response

        # Execute
        result = update_lead_scores()

        # Assert
        assert result['scored'] == 2
        assert mock_patch.call_count == 2


class TestMetricsAggregation:
    """Test metrics aggregation workflows."""

    @patch('automation.tasks.metrics_aggregation.calculate_lead_metrics')
    @patch('automation.tasks.metrics_aggregation.calculate_revenue_metrics')
    @patch('automation.tasks.metrics_aggregation.store_metrics')
    @patch('automation.tasks.metrics_aggregation.send_daily_summary')
    def test_calculate_daily_metrics(self, mock_summary, mock_store, mock_revenue, mock_leads):
        """Test daily metrics calculation."""
        # Setup
        mock_leads.return_value = {'new_leads': 10, 'qualified_leads': 3}
        mock_revenue.return_value = {'daily_revenue': 5000, 'mrr': 50000}

        # Execute
        result = calculate_daily_metrics()

        # Assert
        assert 'leads' in result
        assert 'revenue' in result
        mock_store.assert_called_once()
        mock_summary.assert_called_once()

    @patch('automation.tasks.metrics_aggregation.measure_api_performance')
    @patch('automation.tasks.metrics_aggregation.detect_anomalies')
    @patch('automation.tasks.metrics_aggregation.alert_on_anomalies')
    def test_track_hourly_performance(self, mock_alert, mock_detect, mock_measure):
        """Test hourly performance tracking."""
        # Setup
        mock_measure.return_value = {'avg_response_time': 200}
        mock_detect.return_value = []

        # Execute
        result = track_hourly_performance()

        # Assert
        assert 'api_response_time' in result
        assert 'timestamp' in result
        mock_alert.assert_not_called()  # No anomalies

        # Test with anomalies
        anomalies = [{'metric': 'error_rate', 'value': 10}]
        mock_detect.return_value = anomalies
        track_hourly_performance()
        mock_alert.assert_called_with(anomalies)

    def test_detect_anomalies(self):
        """Test anomaly detection."""
        # Normal performance
        normal_performance = {
            'api_response_time': {'avg_response_time': 200},
            'error_rate': 0.01,
            'conversion_rate': 0.05
        }
        anomalies = detect_anomalies(normal_performance)
        assert len(anomalies) == 0

        # Performance with issues
        poor_performance = {
            'api_response_time': {'avg_response_time': 2000},
            'error_rate': 0.15,
            'conversion_rate': 0.005
        }
        anomalies = detect_anomalies(poor_performance)
        assert len(anomalies) > 0
        assert any(a['metric'] == 'error_rate' for a in anomalies)

    @patch('automation.tasks.metrics_aggregation.gather_weekly_data')
    @patch('automation.tasks.metrics_aggregation.format_weekly_report')
    @patch('automation.tasks.metrics_aggregation.send_weekly_report')
    def test_generate_weekly_report(self, mock_send, mock_format, mock_gather):
        """Test weekly report generation."""
        # Setup
        mock_gather.return_value = {
            'lead_analysis': {'conversion_rate': 0.05},
            'revenue_analysis': {'growth_rate': 0.1}
        }
        mock_format.return_value = "Formatted Report"

        # Execute
        result = generate_weekly_report()

        # Assert
        assert 'sections' in result
        assert 'period' in result
        mock_send.assert_called_once()


class TestContentPublishing:
    """Test content publishing workflows."""

    @patch('automation.tasks.content_publishing.httpx.get')
    @patch('automation.tasks.content_publishing.publish_to_platform')
    def test_publish_scheduled_posts(self, mock_publish, mock_get):
        """Test scheduled post publishing."""
        # Setup
        mock_posts = [
            {'id': '1', 'platforms': ['twitter', 'linkedin']},
            {'id': '2', 'platforms': ['facebook']}
        ]
        mock_response = Mock()
        mock_response.json.return_value = mock_posts
        mock_get.return_value = mock_response

        # Execute
        result = publish_scheduled_posts()

        # Assert
        assert result['published'] == 2
        assert mock_publish.delay.call_count == 3  # 2+1 platforms

    def test_adapt_content_for_platform(self):
        """Test content adaptation for different platforms."""
        # Test Twitter (280 char limit)
        long_content = {
            'content': 'A' * 500,
            'link': 'https://example.com'
        }
        twitter_adapted = adapt_content_for_platform(long_content, 'twitter')
        assert len(twitter_adapted['content']) <= 280

        # Test Instagram (requires media)
        no_media_content = {
            'content': 'Test post',
            'media': None
        }
        instagram_adapted = adapt_content_for_platform(no_media_content, 'instagram')
        assert instagram_adapted['media'] is not None

    @patch('automation.tasks.content_publishing.httpx.post')
    def test_publish_to_twitter(self, mock_post):
        """Test Twitter publishing."""
        # Setup
        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.json.return_value = {'data': {'id': 'tweet123'}}
        mock_post.return_value = mock_response

        content = {
            'content': 'Test tweet',
            'media': None
        }

        # Execute
        from automation.tasks.content_publishing import publish_to_twitter
        result = publish_to_twitter(content)

        # Assert
        assert result['platform_id'] == 'tweet123'
        assert 'url' in result
        mock_post.assert_called_once()

    @patch('automation.tasks.content_publishing.collect_platform_metrics')
    @patch('automation.tasks.content_publishing.should_boost_content')
    @patch('automation.tasks.content_publishing.boost_content')
    def test_track_content_performance(self, mock_boost, mock_should_boost, mock_collect):
        """Test content performance tracking."""
        # Setup
        mock_collect.return_value = {
            'impressions': 1000,
            'engagement': 100
        }
        mock_should_boost.return_value = True

        # Execute
        with patch('automation.tasks.content_publishing.httpx.get') as mock_get:
            mock_response = Mock()
            mock_response.json.return_value = [
                {'id': '1', 'published_platforms': ['twitter']}
            ]
            mock_get.return_value = mock_response

            result = track_content_performance()

        # Assert
        assert result['tracked'] == 1
        mock_boost.delay.assert_called_once()


class TestClientNotifications:
    """Test client notification workflows."""

    @patch('automation.tasks.client_notifications.httpx.get')
    @patch('automation.tasks.client_notifications.send_client_notification')
    def test_send_milestone_updates(self, mock_send, mock_get):
        """Test milestone update notifications."""
        # Setup
        mock_milestones = [
            {
                'id': 'milestone1',
                'client_id': 'client1',
                'name': 'Phase 1 Complete'
            }
        ]
        mock_response = Mock()
        mock_response.json.return_value = mock_milestones
        mock_get.return_value = mock_response

        # Execute
        result = send_milestone_updates()

        # Assert
        assert result['milestones_notified'] == 1
        mock_send.delay.assert_called_once()

    @patch('automation.tasks.client_notifications.check_delayed_projects')
    @patch('automation.tasks.client_notifications.check_at_risk_deliverables')
    @patch('automation.tasks.client_notifications.send_progress_alert')
    def test_check_progress_alerts(self, mock_send, mock_at_risk, mock_delayed):
        """Test progress alert checking."""
        # Setup
        mock_delayed.return_value = [
            {'type': 'delayed', 'project_id': '1'}
        ]
        mock_at_risk.return_value = [
            {'type': 'at_risk', 'deliverable_id': '1'}
        ]

        # Execute
        result = check_progress_alerts()

        # Assert
        assert result['alerts_sent'] == 2
        assert mock_send.delay.call_count == 2

    @patch('automation.tasks.client_notifications.get_client_details')
    @patch('automation.tasks.client_notifications.prepare_notification')
    @patch('automation.tasks.client_notifications.send_email_notification')
    @patch('automation.tasks.client_notifications.send_dashboard_notification')
    def test_send_client_notification(self, mock_dashboard, mock_email, mock_prepare, mock_client):
        """Test client notification sending."""
        # Setup
        mock_client.return_value = {
            'id': 'client1',
            'name': 'John Doe',
            'email': 'john@example.com'
        }
        mock_prepare.return_value = {
            'subject': 'Test Subject',
            'content': 'Test Content'
        }
        mock_email.return_value = True
        mock_dashboard.return_value = True

        # Execute
        result = send_client_notification(
            'client1',
            'milestone_reached',
            {'milestone': 'Test'},
            ['email', 'dashboard']
        )

        # Assert
        assert result['email'] == True
        assert result['dashboard'] == True
        mock_email.assert_called_once()
        mock_dashboard.assert_called_once()


class TestIntegrationWorkflows:
    """Test integrated workflows across tasks."""

    @patch('automation.tasks.lead_nurturing.httpx')
    @patch('automation.tasks.metrics_aggregation.httpx')
    @patch('automation.tasks.content_publishing.httpx')
    def test_end_to_end_lead_flow(self, mock_content_http, mock_metrics_http, mock_lead_http):
        """Test complete lead nurturing flow."""
        # Simulate new lead arrival
        new_lead = {
            'id': 'lead_test',
            'name': 'Test Lead',
            'email': 'test@example.com',
            'source': 'content_marketing'
        }

        # Lead should trigger:
        # 1. Nurturing sequence
        # 2. Metrics update
        # 3. Content amplification if high-value

        # This would be a more complex integration test
        # involving multiple task chains
        pass

    @pytest.mark.slow
    def test_celery_task_chaining(self):
        """Test Celery task chaining and workflows."""
        # This would test actual Celery task chains
        # using a test broker (Redis test instance)
        pass


class TestErrorHandling:
    """Test error handling in workflows."""

    @patch('automation.tasks.lead_nurturing.httpx.get')
    def test_api_failure_retry(self, mock_get):
        """Test task retry on API failure."""
        # Setup
        mock_get.side_effect = Exception("API Error")

        # Execute and assert retry
        with pytest.raises(Exception):
            check_new_leads()

    @patch('automation.tasks.metrics_aggregation.store_metrics')
    def test_metrics_storage_failure(self, mock_store):
        """Test graceful handling of metrics storage failure."""
        # Setup
        mock_store.side_effect = Exception("Storage Error")

        # Should not fail the entire task
        with patch('automation.tasks.metrics_aggregation.calculate_lead_metrics') as mock_calc:
            mock_calc.return_value = {'new_leads': 5}
            # Task should complete despite storage error
            calculate_daily_metrics()


class TestPerformance:
    """Test performance aspects of workflows."""

    def test_batch_processing_efficiency(self):
        """Test efficient batch processing of items."""
        # Test that large batches are processed efficiently
        large_batch = [{'id': str(i)} for i in range(1000)]

        # Verify batching logic
        from automation.tasks.lead_nurturing import process_batch
        # Would test actual batch processing
        pass

    def test_concurrent_task_execution(self):
        """Test concurrent task execution limits."""
        # Verify tasks respect concurrency limits
        # and don't overwhelm external services
        pass


if __name__ == '__main__':
    pytest.main([__file__, '-v'])