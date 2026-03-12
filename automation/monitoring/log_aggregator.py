"""
Centralized log aggregation and analysis.
Collects logs from all services for monitoring and debugging.
"""

import logging
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from collections import defaultdict
import re
import os
import httpx
from celery import shared_task
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)


class LogLevel:
    """Log level constants."""
    DEBUG = 'DEBUG'
    INFO = 'INFO'
    WARNING = 'WARNING'
    ERROR = 'ERROR'
    CRITICAL = 'CRITICAL'


class StructuredLogger:
    """
    Structured logging for better aggregation and analysis.
    """

    def __init__(self, service_name: str):
        self.service_name = service_name
        self.logger = logging.getLogger(service_name)

    def log(
        self,
        level: str,
        message: str,
        **kwargs
    ):
        """
        Log structured message with metadata.
        """
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'service': self.service_name,
            'level': level,
            'message': message,
            'metadata': kwargs
        }

        # Log locally
        getattr(self.logger, level.lower())(json.dumps(log_entry))

        # Send to aggregator
        send_to_aggregator(log_entry)

    def debug(self, message: str, **kwargs):
        self.log(LogLevel.DEBUG, message, **kwargs)

    def info(self, message: str, **kwargs):
        self.log(LogLevel.INFO, message, **kwargs)

    def warning(self, message: str, **kwargs):
        self.log(LogLevel.WARNING, message, **kwargs)

    def error(self, message: str, **kwargs):
        self.log(LogLevel.ERROR, message, **kwargs)

    def critical(self, message: str, **kwargs):
        self.log(LogLevel.CRITICAL, message, **kwargs)


def send_to_aggregator(log_entry: Dict):
    """
    Send log entry to central aggregator.
    """
    try:
        # Send to logging service (e.g., ELK stack, Datadog)
        if log_service_url := os.getenv('LOG_SERVICE_URL'):
            httpx.post(
                log_service_url,
                json=log_entry,
                timeout=1.0  # Don't block on logging
            )

        # Store critical logs in database
        if log_entry['level'] in [LogLevel.ERROR, LogLevel.CRITICAL]:
            store_error_log(log_entry)

    except:
        pass  # Don't fail on logging errors


def store_error_log(log_entry: Dict):
    """
    Store error logs for analysis.
    """
    try:
        httpx.post(
            f"{os.getenv('CONVEX_URL')}/api/logs/errors",
            json=log_entry,
            headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"},
            timeout=2.0
        )
    except:
        pass


@shared_task(bind=True)
def analyze_logs(self):
    """
    Analyze logs for patterns and anomalies.
    """
    try:
        logger.info("Analyzing logs...")

        # Get recent logs
        logs = fetch_recent_logs()

        # Perform analysis
        analysis = {
            'timestamp': datetime.utcnow().isoformat(),
            'period': 'last_hour',
            'total_logs': len(logs),
            'error_patterns': analyze_error_patterns(logs),
            'performance_issues': detect_performance_issues(logs),
            'security_events': detect_security_events(logs),
            'anomalies': detect_log_anomalies(logs),
            'top_errors': get_top_errors(logs),
            'service_health': analyze_service_health(logs)
        }

        # Store analysis results
        store_log_analysis(analysis)

        # Alert on critical findings
        alert_on_critical_findings(analysis)

        logger.info(f"Log analysis complete: {analysis['total_logs']} logs analyzed")
        return analysis

    except Exception as e:
        logger.error(f"Error analyzing logs: {str(e)}")
        raise self.retry(exc=e)


def fetch_recent_logs(hours: int = 1) -> List[Dict]:
    """
    Fetch recent logs from storage.
    """
    try:
        response = httpx.get(
            f"{os.getenv('CONVEX_URL')}/api/logs/recent",
            params={'hours': hours},
            headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
        )
        return response.json()
    except:
        return []


def analyze_error_patterns(logs: List[Dict]) -> Dict:
    """
    Analyze error patterns in logs.
    """
    error_patterns = defaultdict(list)
    error_counts = defaultdict(int)

    for log in logs:
        if log.get('level') in [LogLevel.ERROR, LogLevel.CRITICAL]:
            # Extract error type
            error_type = extract_error_type(log.get('message', ''))
            error_counts[error_type] += 1

            # Group by service
            service = log.get('service', 'unknown')
            error_patterns[service].append({
                'type': error_type,
                'message': log.get('message'),
                'timestamp': log.get('timestamp'),
                'metadata': log.get('metadata', {})
            })

    return {
        'by_service': dict(error_patterns),
        'counts': dict(error_counts),
        'total_errors': sum(error_counts.values())
    }


def detect_performance_issues(logs: List[Dict]) -> List[Dict]:
    """
    Detect performance issues from logs.
    """
    issues = []

    # Pattern matching for performance issues
    performance_patterns = [
        (r'slow query.*(\d+)ms', 'slow_query'),
        (r'timeout.*after.*(\d+)s', 'timeout'),
        (r'high memory usage.*(\d+)%', 'memory'),
        (r'high cpu.*(\d+)%', 'cpu'),
        (r'queue backlog.*(\d+)', 'queue_backlog')
    ]

    for log in logs:
        message = log.get('message', '').lower()

        for pattern, issue_type in performance_patterns:
            if match := re.search(pattern, message):
                issues.append({
                    'type': issue_type,
                    'service': log.get('service'),
                    'timestamp': log.get('timestamp'),
                    'value': match.group(1) if match.groups() else None,
                    'message': log.get('message')
                })

    return issues


def detect_security_events(logs: List[Dict]) -> List[Dict]:
    """
    Detect potential security events in logs.
    """
    security_events = []

    # Security-related patterns
    security_patterns = [
        (r'unauthorized|forbidden|401|403', 'unauthorized_access'),
        (r'invalid token|expired token', 'auth_failure'),
        (r'sql injection|xss|csrf', 'attack_attempt'),
        (r'rate limit exceeded', 'rate_limit'),
        (r'suspicious activity', 'suspicious_activity')
    ]

    for log in logs:
        message = log.get('message', '').lower()

        for pattern, event_type in security_patterns:
            if re.search(pattern, message):
                security_events.append({
                    'type': event_type,
                    'service': log.get('service'),
                    'timestamp': log.get('timestamp'),
                    'message': log.get('message'),
                    'metadata': log.get('metadata', {})
                })

    return security_events


def detect_log_anomalies(logs: List[Dict]) -> List[Dict]:
    """
    Detect anomalies in log patterns.
    """
    anomalies = []

    # Count logs by service and level
    service_counts = defaultdict(lambda: defaultdict(int))

    for log in logs:
        service = log.get('service', 'unknown')
        level = log.get('level', 'INFO')
        service_counts[service][level] += 1

    # Detect anomalies
    for service, levels in service_counts.items():
        # High error rate
        total = sum(levels.values())
        error_rate = (levels.get('ERROR', 0) + levels.get('CRITICAL', 0)) / total if total > 0 else 0

        if error_rate > 0.1:  # More than 10% errors
            anomalies.append({
                'type': 'high_error_rate',
                'service': service,
                'error_rate': error_rate,
                'total_logs': total
            })

        # Sudden spike in logs
        if total > 1000:  # Arbitrary threshold
            anomalies.append({
                'type': 'log_spike',
                'service': service,
                'count': total
            })

    return anomalies


def get_top_errors(logs: List[Dict], limit: int = 10) -> List[Dict]:
    """
    Get most frequent errors.
    """
    error_counts = defaultdict(int)
    error_examples = defaultdict(list)

    for log in logs:
        if log.get('level') in [LogLevel.ERROR, LogLevel.CRITICAL]:
            error_type = extract_error_type(log.get('message', ''))
            error_counts[error_type] += 1

            if len(error_examples[error_type]) < 3:
                error_examples[error_type].append({
                    'timestamp': log.get('timestamp'),
                    'service': log.get('service'),
                    'message': log.get('message')[:200]  # Truncate long messages
                })

    # Sort by frequency
    top_errors = sorted(
        [
            {
                'type': error_type,
                'count': count,
                'examples': error_examples[error_type]
            }
            for error_type, count in error_counts.items()
        ],
        key=lambda x: x['count'],
        reverse=True
    )[:limit]

    return top_errors


def analyze_service_health(logs: List[Dict]) -> Dict:
    """
    Analyze health of each service based on logs.
    """
    service_health = defaultdict(lambda: {
        'status': 'healthy',
        'error_count': 0,
        'warning_count': 0,
        'last_error': None,
        'issues': []
    })

    for log in logs:
        service = log.get('service', 'unknown')
        level = log.get('level')

        if level == LogLevel.ERROR:
            service_health[service]['error_count'] += 1
            service_health[service]['last_error'] = log.get('timestamp')
            service_health[service]['status'] = 'degraded'

        elif level == LogLevel.CRITICAL:
            service_health[service]['error_count'] += 1
            service_health[service]['status'] = 'unhealthy'

        elif level == LogLevel.WARNING:
            service_health[service]['warning_count'] += 1

    # Determine overall health
    for service, health in service_health.items():
        if health['error_count'] > 10:
            health['status'] = 'critical'
            health['issues'].append('High error rate')

        if health['warning_count'] > 50:
            health['issues'].append('Many warnings')

    return dict(service_health)


def extract_error_type(message: str) -> str:
    """
    Extract error type from error message.
    """
    # Common error patterns
    patterns = [
        r'(\w+Error):',
        r'(\w+Exception):',
        r'ERROR\s+\[(\w+)\]',
        r'Failed to (\w+)',
        r'Could not (\w+)',
        r'Unable to (\w+)'
    ]

    for pattern in patterns:
        if match := re.search(pattern, message):
            return match.group(1)

    # Default to first few words
    return ' '.join(message.split()[:3])


def store_log_analysis(analysis: Dict):
    """
    Store log analysis results.
    """
    try:
        httpx.post(
            f"{os.getenv('CONVEX_URL')}/api/logs/analysis",
            json=analysis,
            headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
        )
    except Exception as e:
        logger.error(f"Failed to store log analysis: {str(e)}")


def alert_on_critical_findings(analysis: Dict):
    """
    Send alerts for critical log findings.
    """
    alerts = []

    # Check for critical issues
    if analysis['error_patterns']['total_errors'] > 100:
        alerts.append(f"High error rate: {analysis['error_patterns']['total_errors']} errors in the last hour")

    if len(analysis['security_events']) > 0:
        alerts.append(f"Security events detected: {len(analysis['security_events'])} events")

    if any(a['type'] == 'high_error_rate' for a in analysis['anomalies']):
        alerts.append("Anomaly detected: High error rate in services")

    # Send alerts
    if alerts:
        message = "🚨 Critical Log Analysis Findings\n\n" + "\n".join(f"• {alert}" for alert in alerts)

        if webhook_url := os.getenv('SLACK_WEBHOOK_URL'):
            httpx.post(webhook_url, json={
                'channel': '#alerts',
                'text': message,
                'attachments': [{
                    'color': 'danger',
                    'fields': format_analysis_fields(analysis)
                }]
            })


def format_analysis_fields(analysis: Dict) -> List[Dict]:
    """
    Format analysis for Slack attachment.
    """
    fields = []

    if analysis['error_patterns']['total_errors'] > 0:
        fields.append({
            'title': 'Total Errors',
            'value': str(analysis['error_patterns']['total_errors']),
            'short': True
        })

    if analysis['security_events']:
        fields.append({
            'title': 'Security Events',
            'value': str(len(analysis['security_events'])),
            'short': True
        })

    if analysis['performance_issues']:
        fields.append({
            'title': 'Performance Issues',
            'value': str(len(analysis['performance_issues'])),
            'short': True
        })

    return fields


# Context managers for structured logging
class LogContext:
    """
    Context manager for adding context to logs.
    """

    def __init__(self, logger: StructuredLogger, **context):
        self.logger = logger
        self.context = context

    def __enter__(self):
        self.logger.info(f"Starting: {self.context.get('operation', 'operation')}", **self.context)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.logger.error(
                f"Failed: {self.context.get('operation', 'operation')}",
                error=str(exc_val),
                **self.context
            )
        else:
            self.logger.info(f"Completed: {self.context.get('operation', 'operation')}", **self.context)


# Log correlation for distributed tracing
class TraceContext:
    """
    Manage trace context for distributed tracing.
    """

    def __init__(self, trace_id: Optional[str] = None):
        self.trace_id = trace_id or self.generate_trace_id()

    @staticmethod
    def generate_trace_id() -> str:
        """Generate unique trace ID."""
        import uuid
        return str(uuid.uuid4())

    def inject(self, headers: Dict) -> Dict:
        """Inject trace context into headers."""
        headers['X-Trace-Id'] = self.trace_id
        return headers

    def extract(self, headers: Dict) -> str:
        """Extract trace ID from headers."""
        return headers.get('X-Trace-Id', self.generate_trace_id())


# Specialized loggers for different components
def get_lead_logger() -> StructuredLogger:
    """Get logger for lead processing."""
    return StructuredLogger('lead_processing')


def get_content_logger() -> StructuredLogger:
    """Get logger for content publishing."""
    return StructuredLogger('content_publishing')


def get_metrics_logger() -> StructuredLogger:
    """Get logger for metrics collection."""
    return StructuredLogger('metrics')


def get_notification_logger() -> StructuredLogger:
    """Get logger for notifications."""
    return StructuredLogger('notifications')