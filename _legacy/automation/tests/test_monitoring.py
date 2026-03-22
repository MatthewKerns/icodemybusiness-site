"""
Test suite for monitoring components.
Tests health checks, metrics collection, and log aggregation.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
import json

from automation.monitoring.health_checks import (
    perform_health_check,
    check_api_health,
    check_database_health,
    check_redis_health,
    check_celery_health,
    check_system_resources,
    determine_overall_status
)

from automation.monitoring.metrics_collector import (
    track_metric,
    collect_system_metrics,
    BusinessMetrics,
    check_metric_thresholds,
    track_task_execution
)

from automation.monitoring.log_aggregator import (
    StructuredLogger,
    analyze_logs,
    analyze_error_patterns,
    detect_performance_issues,
    detect_security_events,
    extract_error_type
)


class TestHealthChecks:
    """Test health check functionality."""

    @patch('automation.monitoring.health_checks.check_api_health')
    @patch('automation.monitoring.health_checks.check_database_health')
    @patch('automation.monitoring.health_checks.check_redis_health')
    @patch('automation.monitoring.health_checks.check_celery_health')
    @patch('automation.monitoring.health_checks.check_system_resources')
    @patch('automation.monitoring.health_checks.store_health_status')
    def test_perform_health_check(
        self,
        mock_store,
        mock_system,
        mock_celery,
        mock_redis,
        mock_database,
        mock_api
    ):
        """Test comprehensive health check."""
        # Setup - all services healthy
        mock_api.return_value = {'status': 'healthy', 'checks': {}}
        mock_database.return_value = {'status': 'healthy', 'checks': {}}
        mock_redis.return_value = {'status': 'healthy', 'checks': {}}
        mock_celery.return_value = {'status': 'healthy', 'checks': {}}
        mock_system.return_value = {'status': 'healthy', 'checks': {}}

        # Execute
        result = perform_health_check()

        # Assert
        assert result['overall_status'] == 'healthy'
        assert 'timestamp' in result
        assert len(result['services']) == 6  # Including external services
        mock_store.assert_called_once()

    @patch('automation.monitoring.health_checks.httpx.get')
    @patch('automation.monitoring.health_checks.get_api_error_rate')
    def test_check_api_health(self, mock_error_rate, mock_get):
        """Test API health check."""
        # Setup
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.elapsed.total_seconds.return_value = 0.2
        mock_get.return_value = mock_response
        mock_error_rate.return_value = 2.0

        # Execute
        result = check_api_health()

        # Assert
        assert result['status'] == 'healthy'
        assert result['checks']['endpoint']['status'] == 'up'
        assert result['checks']['error_rate']['value'] == 2.0

        # Test degraded state
        mock_response.elapsed.total_seconds.return_value = 1.5
        result = check_api_health()
        assert result['status'] == 'degraded'

        # Test unhealthy state
        mock_error_rate.return_value = 10.0
        result = check_api_health()
        assert result['status'] == 'unhealthy'

    @patch('automation.monitoring.health_checks.redis.from_url')
    def test_check_redis_health(self, mock_redis):
        """Test Redis health check."""
        # Setup
        mock_client = Mock()
        mock_client.ping.return_value = True
        mock_client.info.return_value = {
            'used_memory': 100 * 1024 * 1024,  # 100MB
            'connected_clients': 5,
            'blocked_clients': 0,
            'expired_keys': 10
        }
        mock_client.dbsize.return_value = 1000
        mock_redis.return_value = mock_client

        # Execute
        result = check_redis_health()

        # Assert
        assert result['status'] == 'healthy'
        assert result['checks']['connection']['status'] == 'connected'
        assert result['checks']['memory']['used_mb'] == 100

        # Test degraded state (high memory)
        mock_client.info.return_value['used_memory'] = 600 * 1024 * 1024
        result = check_redis_health()
        assert result['status'] == 'degraded'

    @patch('automation.monitoring.health_checks.psutil')
    def test_check_system_resources(self, mock_psutil):
        """Test system resource health check."""
        # Setup
        mock_psutil.cpu_percent.return_value = 50.0
        mock_psutil.cpu_count.return_value = 4

        mock_memory = Mock()
        mock_memory.percent = 60.0
        mock_memory.available = 4 * 1024 * 1024 * 1024
        mock_memory.total = 16 * 1024 * 1024 * 1024
        mock_psutil.virtual_memory.return_value = mock_memory

        mock_disk = Mock()
        mock_disk.percent = 70.0
        mock_disk.free = 100 * 1024 * 1024 * 1024
        mock_psutil.disk_usage.return_value = mock_disk

        mock_net = Mock()
        mock_net.bytes_sent = 1000 * 1024 * 1024
        mock_net.bytes_recv = 2000 * 1024 * 1024
        mock_net.errin = mock_net.errout = 0
        mock_net.dropin = mock_net.dropout = 0
        mock_psutil.net_io_counters.return_value = mock_net

        # Execute
        result = check_system_resources()

        # Assert
        assert result['status'] == 'healthy'
        assert result['checks']['cpu']['usage_percent'] == 50.0
        assert result['checks']['memory']['usage_percent'] == 60.0
        assert result['checks']['disk']['usage_percent'] == 70.0

        # Test unhealthy state
        mock_memory.percent = 90.0
        result = check_system_resources()
        assert result['status'] == 'unhealthy'

    def test_determine_overall_status(self):
        """Test overall status determination."""
        # All healthy
        services = {
            'api': {'status': 'healthy'},
            'database': {'status': 'healthy'},
            'redis': {'status': 'healthy'}
        }
        assert determine_overall_status(services) == 'healthy'

        # One degraded
        services['api']['status'] = 'degraded'
        assert determine_overall_status(services) == 'degraded'

        # One unhealthy
        services['database']['status'] = 'unhealthy'
        assert determine_overall_status(services) == 'unhealthy'


class TestMetricsCollector:
    """Test metrics collection functionality."""

    @patch('automation.monitoring.metrics_collector.store_metric')
    def test_track_metric(self, mock_store):
        """Test metric tracking."""
        # Track a simple metric
        track_metric('leads.new', 5, {'source': 'website'})
        mock_store.assert_called_with('leads.new', 5, {'source': 'website'})

    @patch('automation.monitoring.metrics_collector.psutil')
    @patch('automation.monitoring.metrics_collector.redis.from_url')
    @patch('automation.monitoring.metrics_collector.push_to_gateway')
    def test_collect_system_metrics(self, mock_push, mock_redis, mock_psutil):
        """Test system metrics collection."""
        # Setup
        mock_psutil.cpu_percent.return_value = 45.0
        mock_psutil.virtual_memory.return_value = Mock(percent=55.0)
        mock_psutil.disk_usage.return_value = Mock(percent=65.0)

        mock_client = Mock()
        mock_client.info.return_value = {'used_memory': 200 * 1024 * 1024}
        mock_redis.return_value = mock_client

        # Execute
        result = collect_system_metrics()

        # Assert
        assert result['status'] == 'collected'
        mock_psutil.cpu_percent.assert_called()
        mock_push.assert_called()

    def test_business_metrics_tracking(self):
        """Test business metrics tracking."""
        # Test lead conversion tracking
        with patch('automation.monitoring.metrics_collector.track_metric') as mock_track:
            BusinessMetrics.track_lead_conversion('lead1', 'website', 24.5)
            mock_track.assert_called_with('lead.conversion_time', 24.5, {'source': 'website'})

        # Test content performance tracking
        with patch('automation.monitoring.metrics_collector.engagement_rate') as mock_gauge:
            BusinessMetrics.track_content_performance('content1', 'twitter', 1000, 100)
            mock_gauge.labels.assert_called_with(platform='twitter')

        # Test revenue event tracking
        with patch('automation.monitoring.metrics_collector.track_metric') as mock_track:
            BusinessMetrics.track_revenue_event('new_subscription', 500, 'client1')
            mock_track.assert_called_with('revenue.new_subscription', 500, {'client_id': 'client1'})

    @patch('automation.monitoring.metrics_collector.trigger_metric_alert')
    def test_check_metric_thresholds(self, mock_alert):
        """Test metric threshold checking."""
        # Normal value - no alert
        check_metric_thresholds('cpu_usage', 50)
        mock_alert.assert_not_called()

        # Exceeds threshold - trigger alert
        check_metric_thresholds('cpu_usage', 95)
        mock_alert.assert_called_once()

    def test_track_task_execution_decorator(self):
        """Test task execution tracking decorator."""
        @track_task_execution('test_task')
        def sample_task():
            return 'success'

        with patch('automation.monitoring.metrics_collector.task_duration') as mock_histogram:
            result = sample_task()
            assert result == 'success'
            mock_histogram.labels.assert_called_with(task_name='test_task')

        # Test with exception
        @track_task_execution('failing_task')
        def failing_task():
            raise ValueError("Test error")

        with patch('automation.monitoring.metrics_collector.task_failures') as mock_counter:
            with pytest.raises(ValueError):
                failing_task()
            mock_counter.labels.assert_called_with(task_name='failing_task')


class TestLogAggregator:
    """Test log aggregation functionality."""

    def test_structured_logger(self):
        """Test structured logging."""
        logger = StructuredLogger('test_service')

        with patch('automation.monitoring.log_aggregator.send_to_aggregator') as mock_send:
            # Test different log levels
            logger.info("Test info", user_id='123')
            logger.error("Test error", error_code='ERR001')

            # Verify log structure
            assert mock_send.call_count == 2
            log_entry = mock_send.call_args_list[0][0][0]
            assert log_entry['service'] == 'test_service'
            assert log_entry['level'] == 'INFO'
            assert log_entry['metadata']['user_id'] == '123'

    @patch('automation.monitoring.log_aggregator.fetch_recent_logs')
    @patch('automation.monitoring.log_aggregator.store_log_analysis')
    def test_analyze_logs(self, mock_store, mock_fetch):
        """Test log analysis."""
        # Setup
        mock_logs = [
            {
                'level': 'ERROR',
                'service': 'api',
                'message': 'DatabaseError: Connection timeout',
                'timestamp': datetime.utcnow().isoformat()
            },
            {
                'level': 'WARNING',
                'service': 'celery',
                'message': 'Queue backlog detected: 500 tasks',
                'timestamp': datetime.utcnow().isoformat()
            },
            {
                'level': 'INFO',
                'service': 'api',
                'message': 'Request processed successfully',
                'timestamp': datetime.utcnow().isoformat()
            }
        ]
        mock_fetch.return_value = mock_logs

        # Execute
        result = analyze_logs()

        # Assert
        assert result['total_logs'] == 3
        assert 'error_patterns' in result
        assert 'performance_issues' in result
        assert 'security_events' in result
        mock_store.assert_called_once()

    def test_analyze_error_patterns(self):
        """Test error pattern analysis."""
        logs = [
            {'level': 'ERROR', 'service': 'api', 'message': 'ValueError: Invalid input'},
            {'level': 'ERROR', 'service': 'api', 'message': 'ValueError: Missing field'},
            {'level': 'ERROR', 'service': 'celery', 'message': 'TimeoutError: Task timeout'},
        ]

        result = analyze_error_patterns(logs)

        assert result['total_errors'] == 3
        assert 'ValueError' in result['counts']
        assert result['counts']['ValueError'] == 2
        assert 'api' in result['by_service']

    def test_detect_performance_issues(self):
        """Test performance issue detection."""
        logs = [
            {'service': 'database', 'message': 'Slow query detected: 5000ms'},
            {'service': 'api', 'message': 'Request timeout after 30s'},
            {'service': 'system', 'message': 'High CPU usage: 95%'},
            {'service': 'normal', 'message': 'Everything is fine'}
        ]

        issues = detect_performance_issues(logs)

        assert len(issues) == 3
        assert any(i['type'] == 'slow_query' for i in issues)
        assert any(i['type'] == 'timeout' for i in issues)
        assert any(i['type'] == 'cpu' for i in issues)

    def test_detect_security_events(self):
        """Test security event detection."""
        logs = [
            {'service': 'api', 'message': 'Unauthorized access attempt from 1.2.3.4'},
            {'service': 'auth', 'message': 'Invalid token provided'},
            {'service': 'api', 'message': 'Rate limit exceeded for user 123'},
            {'service': 'normal', 'message': 'User logged in successfully'}
        ]

        events = detect_security_events(logs)

        assert len(events) == 3
        assert any(e['type'] == 'unauthorized_access' for e in events)
        assert any(e['type'] == 'auth_failure' for e in events)
        assert any(e['type'] == 'rate_limit' for e in events)

    def test_extract_error_type(self):
        """Test error type extraction."""
        assert extract_error_type('ValueError: Invalid input') == 'ValueError'
        assert extract_error_type('TimeoutException: Connection timeout') == 'TimeoutException'
        assert extract_error_type('ERROR [Database] Connection failed') == 'Database'
        assert extract_error_type('Failed to connect to server') == 'connect'
        assert extract_error_type('Random error message') == 'Random error message'


class TestIntegrationMonitoring:
    """Test integrated monitoring scenarios."""

    @patch('automation.monitoring.health_checks.send_health_alert')
    @patch('automation.monitoring.health_checks.store_health_status')
    def test_unhealthy_system_alert_flow(self, mock_store, mock_alert):
        """Test alert flow for unhealthy system."""
        with patch('automation.monitoring.health_checks.check_api_health') as mock_api:
            mock_api.return_value = {'status': 'unhealthy', 'error': 'API Down'}

            result = perform_health_check()

            assert result['overall_status'] == 'unhealthy'
            mock_alert.assert_called_once()

    @patch('automation.monitoring.metrics_collector.httpx.post')
    def test_metrics_to_prometheus_flow(self, mock_post):
        """Test metrics flow to Prometheus."""
        # Track various metrics
        track_metric('leads.new', 5, {'source': 'website'})
        track_metric('emails.sent', 10, {'template': 'welcome'})
        track_metric('content.published', 3, {'platform': 'twitter'})

        # Verify metrics are sent to storage
        assert mock_post.call_count >= 3

    def test_log_to_alert_flow(self):
        """Test log analysis to alert flow."""
        critical_logs = [
            {'level': 'CRITICAL', 'service': 'database', 'message': 'Database connection lost'},
            {'level': 'ERROR', 'service': 'api', 'message': 'Service unavailable'}
        ] * 50  # Many errors

        with patch('automation.monitoring.log_aggregator.alert_on_critical_findings') as mock_alert:
            with patch('automation.monitoring.log_aggregator.fetch_recent_logs') as mock_fetch:
                mock_fetch.return_value = critical_logs
                analyze_logs()
                mock_alert.assert_called_once()


class TestMonitoringResilience:
    """Test monitoring system resilience."""

    def test_monitoring_failure_doesnt_affect_tasks(self):
        """Test that monitoring failures don't break main tasks."""
        # Simulate metrics storage failure
        with patch('automation.monitoring.metrics_collector.store_metric') as mock_store:
            mock_store.side_effect = Exception("Storage failed")

            # Should not raise exception
            track_metric('test.metric', 1)

    def test_health_check_partial_failure(self):
        """Test health check with partial service failures."""
        with patch('automation.monitoring.health_checks.check_api_health') as mock_api:
            mock_api.side_effect = Exception("API check failed")

            # Should still return partial results
            result = perform_health_check()
            assert 'services' in result
            assert result['services']['api']['status'] == 'unhealthy'

    def test_log_aggregation_with_malformed_logs(self):
        """Test log aggregation handles malformed logs."""
        malformed_logs = [
            {'level': 'ERROR'},  # Missing message
            {'message': 'Test'},  # Missing level
            None,  # Null log
            {'level': 'INFO', 'message': 'Valid log'}
        ]

        # Should handle gracefully
        result = analyze_error_patterns(malformed_logs)
        assert result is not None


if __name__ == '__main__':
    pytest.main([__file__, '-v'])