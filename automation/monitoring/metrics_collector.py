"""
Metrics collection for Prometheus monitoring.
Tracks all system and business metrics.
"""

from celery import shared_task
from celery.utils.log import get_task_logger
from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry, push_to_gateway
from typing import Dict, Optional, Any
import time
import os
import httpx
from datetime import datetime
from functools import wraps

logger = get_task_logger(__name__)

# Prometheus metrics registry
registry = CollectorRegistry()

# Business metrics
leads_created = Counter(
    'leads_created_total',
    'Total number of leads created',
    ['source'],
    registry=registry
)

leads_qualified = Counter(
    'leads_qualified_total',
    'Total number of qualified leads',
    registry=registry
)

emails_sent = Counter(
    'emails_sent_total',
    'Total number of emails sent',
    ['template'],
    registry=registry
)

content_published = Counter(
    'content_published_total',
    'Total content pieces published',
    ['platform'],
    registry=registry
)

notifications_sent = Counter(
    'notifications_sent_total',
    'Total notifications sent',
    ['template', 'channel'],
    registry=registry
)

# System metrics
task_duration = Histogram(
    'task_duration_seconds',
    'Task execution duration',
    ['task_name'],
    registry=registry
)

task_failures = Counter(
    'task_failures_total',
    'Total task failures',
    ['task_name'],
    registry=registry
)

api_requests = Counter(
    'api_requests_total',
    'Total API requests',
    ['method', 'endpoint', 'status'],
    registry=registry
)

api_request_duration = Histogram(
    'api_request_duration_seconds',
    'API request duration',
    ['method', 'endpoint'],
    registry=registry
)

# Resource metrics
cpu_usage = Gauge(
    'system_cpu_usage_percent',
    'System CPU usage percentage',
    registry=registry
)

memory_usage = Gauge(
    'system_memory_usage_percent',
    'System memory usage percentage',
    registry=registry
)

disk_usage = Gauge(
    'system_disk_usage_percent',
    'System disk usage percentage',
    registry=registry
)

redis_memory = Gauge(
    'redis_memory_usage_mb',
    'Redis memory usage in MB',
    registry=registry
)

queue_size = Gauge(
    'celery_queue_size',
    'Celery queue size',
    ['queue_name'],
    registry=registry
)

# Performance metrics
database_query_time = Histogram(
    'database_query_duration_seconds',
    'Database query duration',
    ['query_type'],
    registry=registry
)

cache_hits = Counter(
    'cache_hits_total',
    'Total cache hits',
    registry=registry
)

cache_misses = Counter(
    'cache_misses_total',
    'Total cache misses',
    registry=registry
)

# Business KPIs
conversion_rate = Gauge(
    'conversion_rate_percent',
    'Lead to customer conversion rate',
    registry=registry
)

revenue_mrr = Gauge(
    'revenue_mrr_usd',
    'Monthly recurring revenue in USD',
    registry=registry
)

customer_satisfaction = Gauge(
    'customer_satisfaction_score',
    'Customer satisfaction score (0-100)',
    registry=registry
)

engagement_rate = Gauge(
    'content_engagement_rate_percent',
    'Content engagement rate percentage',
    ['platform'],
    registry=registry
)


def track_metric(metric_name: str, value: float, labels: Optional[Dict] = None):
    """
    Track a custom metric.
    """
    try:
        # Map metric names to Prometheus metrics
        metric_map = {
            'leads.new': (leads_created, ['source']),
            'leads.qualified': (leads_qualified, []),
            'leads.nurturing_started': (leads_qualified, []),
            'leads.scored': (conversion_rate, []),
            'emails.sent': (emails_sent, ['template']),
            'content.published': (content_published, ['platform']),
            'content.amplified': (content_published, ['platform']),
            'notifications.sent': (notifications_sent, ['template', 'channel']),
            'notifications.milestones_sent': (notifications_sent, ['template', 'channel']),
            'cache.hit': (cache_hits, []),
            'cache.miss': (cache_misses, []),
        }

        if metric_name in metric_map:
            metric, label_names = metric_map[metric_name]

            if label_names and labels:
                # Extract relevant labels
                label_values = [labels.get(name, 'unknown') for name in label_names]
                if isinstance(metric, Counter):
                    metric.labels(*label_values).inc(value)
                elif isinstance(metric, Gauge):
                    metric.labels(*label_values).set(value)
            else:
                if isinstance(metric, Counter):
                    metric.inc(value)
                elif isinstance(metric, Gauge):
                    metric.set(value)

        # Also store in time-series database
        store_metric(metric_name, value, labels)

    except Exception as e:
        logger.error(f"Error tracking metric {metric_name}: {str(e)}")


def track_task_execution(task_name: str):
    """
    Decorator to track task execution metrics.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()

            try:
                result = func(*args, **kwargs)
                task_duration.labels(task_name=task_name).observe(time.time() - start_time)
                return result

            except Exception as e:
                task_failures.labels(task_name=task_name).inc()
                raise e

        return wrapper
    return decorator


@shared_task(bind=True)
def collect_system_metrics(self):
    """
    Collect system metrics for Prometheus.
    """
    try:
        logger.info("Collecting system metrics...")

        # Collect resource metrics
        import psutil

        cpu_usage.set(psutil.cpu_percent(interval=1))
        memory_usage.set(psutil.virtual_memory().percent)
        disk_usage.set(psutil.disk_usage('/').percent)

        # Collect Redis metrics
        import redis
        r = redis.from_url(os.getenv('REDIS_URL', 'redis://localhost:6379/0'))
        info = r.info()
        redis_memory.set(info['used_memory'] / 1024 / 1024)

        # Collect queue metrics
        from automation.monitoring.health_checks import get_queue_sizes
        queues = get_queue_sizes()
        for queue_name, size in queues.items():
            queue_size.labels(queue_name=queue_name).set(size)

        # Collect business metrics
        collect_business_metrics()

        # Push to Prometheus Gateway
        if gateway_url := os.getenv('PROMETHEUS_GATEWAY_URL'):
            push_to_gateway(gateway_url, job='celery_worker', registry=registry)

        logger.info("System metrics collected successfully")
        return {'status': 'collected'}

    except Exception as e:
        logger.error(f"Error collecting system metrics: {str(e)}")
        raise self.retry(exc=e)


def collect_business_metrics():
    """
    Collect business KPI metrics.
    """
    try:
        # Get current KPIs
        response = httpx.get(
            f"{os.getenv('CONVEX_URL')}/api/metrics/kpis",
            headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
        )

        kpis = response.json()

        # Update Prometheus metrics
        if 'conversion_rate' in kpis:
            conversion_rate.set(kpis['conversion_rate'])

        if 'mrr' in kpis:
            revenue_mrr.set(kpis['mrr'])

        if 'customer_satisfaction' in kpis:
            customer_satisfaction.set(kpis['customer_satisfaction'])

        if 'engagement_rates' in kpis:
            for platform, rate in kpis['engagement_rates'].items():
                engagement_rate.labels(platform=platform).set(rate)

    except Exception as e:
        logger.error(f"Error collecting business metrics: {str(e)}")


def track_api_request(method: str, endpoint: str, status: int, duration: float):
    """
    Track API request metrics.
    """
    api_requests.labels(method=method, endpoint=endpoint, status=str(status)).inc()
    api_request_duration.labels(method=method, endpoint=endpoint).observe(duration)


def track_database_query(query_type: str, duration: float):
    """
    Track database query performance.
    """
    database_query_time.labels(query_type=query_type).observe(duration)


def track_cache_access(hit: bool):
    """
    Track cache hit/miss.
    """
    if hit:
        cache_hits.inc()
    else:
        cache_misses.inc()


def store_metric(metric_name: str, value: float, labels: Optional[Dict] = None):
    """
    Store metric in time-series database.
    """
    try:
        httpx.post(
            f"{os.getenv('CONVEX_URL')}/api/metrics/store",
            json={
                'metric': metric_name,
                'value': value,
                'labels': labels or {},
                'timestamp': datetime.utcnow().isoformat()
            },
            headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"},
            timeout=2.0  # Don't block on metric storage
        )
    except:
        pass  # Don't fail on metric storage errors


def get_metric_value(metric_name: str, time_range: str = '1h') -> Optional[float]:
    """
    Get current value of a metric.
    """
    try:
        response = httpx.get(
            f"{os.getenv('CONVEX_URL')}/api/metrics/get",
            params={'metric': metric_name, 'range': time_range},
            headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
        )
        return response.json().get('value')
    except:
        return None


def get_metric_history(metric_name: str, start: datetime, end: datetime) -> List[Dict]:
    """
    Get historical values of a metric.
    """
    try:
        response = httpx.get(
            f"{os.getenv('CONVEX_URL')}/api/metrics/history",
            params={
                'metric': metric_name,
                'start': start.isoformat(),
                'end': end.isoformat()
            },
            headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
        )
        return response.json().get('data', [])
    except:
        return []


def export_metrics() -> str:
    """
    Export metrics in Prometheus format.
    """
    from prometheus_client import generate_latest
    return generate_latest(registry).decode('utf-8')


# Custom metrics for specific business events
class BusinessMetrics:
    """
    Helper class for tracking business-specific metrics.
    """

    @staticmethod
    def track_lead_conversion(lead_id: str, source: str, time_to_convert: float):
        """
        Track lead conversion metrics.
        """
        leads_qualified.inc()
        track_metric('lead.conversion_time', time_to_convert, {'source': source})

    @staticmethod
    def track_content_performance(content_id: str, platform: str, impressions: int, engagement: int):
        """
        Track content performance metrics.
        """
        if impressions > 0:
            rate = (engagement / impressions) * 100
            engagement_rate.labels(platform=platform).set(rate)
            track_metric('content.performance', rate, {
                'platform': platform,
                'content_id': content_id
            })

    @staticmethod
    def track_revenue_event(event_type: str, amount: float, client_id: str):
        """
        Track revenue-related events.
        """
        track_metric(f'revenue.{event_type}', amount, {'client_id': client_id})

        # Update MRR if it's a subscription event
        if event_type in ['new_subscription', 'upgrade']:
            current_mrr = get_metric_value('revenue_mrr') or 0
            revenue_mrr.set(current_mrr + amount)

    @staticmethod
    def track_customer_feedback(client_id: str, score: int, category: str):
        """
        Track customer satisfaction metrics.
        """
        track_metric('customer.feedback', score, {
            'client_id': client_id,
            'category': category
        })

        # Update overall satisfaction score
        update_satisfaction_score()


def update_satisfaction_score():
    """
    Update overall customer satisfaction score.
    """
    try:
        response = httpx.get(
            f"{os.getenv('CONVEX_URL')}/api/metrics/satisfaction/average",
            headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
        )
        score = response.json().get('score', 0)
        customer_satisfaction.set(score)
    except:
        pass


# Alert thresholds for automatic alerting
ALERT_THRESHOLDS = {
    'conversion_rate': {'min': 1, 'max': 100},
    'error_rate': {'min': 0, 'max': 5},
    'response_time': {'min': 0, 'max': 1000},
    'queue_size': {'min': 0, 'max': 1000},
    'cpu_usage': {'min': 0, 'max': 80},
    'memory_usage': {'min': 0, 'max': 85}
}


def check_metric_thresholds(metric_name: str, value: float):
    """
    Check if metric exceeds thresholds and trigger alerts.
    """
    if metric_name in ALERT_THRESHOLDS:
        threshold = ALERT_THRESHOLDS[metric_name]

        if value < threshold['min'] or value > threshold['max']:
            trigger_metric_alert(metric_name, value, threshold)


def trigger_metric_alert(metric_name: str, value: float, threshold: Dict):
    """
    Trigger alert for metric threshold violation.
    """
    message = f"⚠️ Metric Alert: {metric_name} = {value} (threshold: {threshold})"

    if webhook_url := os.getenv('SLACK_WEBHOOK_URL'):
        httpx.post(webhook_url, json={
            'channel': '#alerts',
            'text': message
        })

    logger.warning(message)