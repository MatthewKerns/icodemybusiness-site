"""
Health checks for monitoring system components.
Provides comprehensive health status for all services.
"""

from celery import shared_task
from celery.utils.log import get_task_logger
from typing import Dict, List, Tuple
import httpx
import redis
import psutil
import os
from datetime import datetime, timedelta

logger = get_task_logger(__name__)

# Health check thresholds
THRESHOLDS = {
    'cpu_percent': 80.0,
    'memory_percent': 85.0,
    'disk_percent': 90.0,
    'redis_memory_mb': 512,
    'response_time_ms': 1000,
    'error_rate_percent': 5.0,
    'queue_size': 1000
}


@shared_task(bind=True)
def perform_health_check(self):
    """
    Perform comprehensive health check of all systems.
    """
    try:
        logger.info("Performing system health check...")

        health_status = {
            'timestamp': datetime.utcnow().isoformat(),
            'services': {},
            'overall_status': 'healthy'
        }

        # Check each service
        health_status['services']['api'] = check_api_health()
        health_status['services']['database'] = check_database_health()
        health_status['services']['redis'] = check_redis_health()
        health_status['services']['celery'] = check_celery_health()
        health_status['services']['system'] = check_system_resources()
        health_status['services']['external'] = check_external_services()

        # Determine overall status
        health_status['overall_status'] = determine_overall_status(health_status['services'])

        # Store health status
        store_health_status(health_status)

        # Alert if unhealthy
        if health_status['overall_status'] != 'healthy':
            send_health_alert(health_status)

        logger.info(f"Health check complete: {health_status['overall_status']}")
        return health_status

    except Exception as e:
        logger.error(f"Error performing health check: {str(e)}")
        raise


def check_api_health() -> Dict:
    """
    Check API service health.
    """
    health = {
        'status': 'healthy',
        'checks': {}
    }

    try:
        # Check API endpoint
        start_time = datetime.utcnow()
        response = httpx.get(
            f"{os.getenv('API_URL', 'http://localhost:3000')}/health",
            timeout=5.0
        )
        response_time = (datetime.utcnow() - start_time).total_seconds() * 1000

        health['checks']['endpoint'] = {
            'status': 'up' if response.status_code == 200 else 'down',
            'response_time_ms': response_time,
            'status_code': response.status_code
        }

        # Check response time
        if response_time > THRESHOLDS['response_time_ms']:
            health['status'] = 'degraded'
            health['checks']['endpoint']['warning'] = 'High response time'

        # Check error rate
        error_rate = get_api_error_rate()
        health['checks']['error_rate'] = {
            'value': error_rate,
            'threshold': THRESHOLDS['error_rate_percent']
        }

        if error_rate > THRESHOLDS['error_rate_percent']:
            health['status'] = 'unhealthy'
            health['checks']['error_rate']['alert'] = 'High error rate'

    except Exception as e:
        health['status'] = 'unhealthy'
        health['error'] = str(e)

    return health


def check_database_health() -> Dict:
    """
    Check database health and performance.
    """
    health = {
        'status': 'healthy',
        'checks': {}
    }

    try:
        # Check Convex connection
        response = httpx.get(
            f"{os.getenv('CONVEX_URL', 'http://localhost:3001')}/api/health",
            headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"},
            timeout=5.0
        )

        health['checks']['connection'] = {
            'status': 'connected' if response.status_code == 200 else 'disconnected',
            'response_time_ms': response.elapsed.total_seconds() * 1000
        }

        # Check query performance
        query_metrics = get_database_metrics()
        health['checks']['performance'] = query_metrics

        if query_metrics.get('avg_query_time_ms', 0) > 100:
            health['status'] = 'degraded'
            health['checks']['performance']['warning'] = 'Slow queries detected'

    except Exception as e:
        health['status'] = 'unhealthy'
        health['error'] = str(e)

    return health


def check_redis_health() -> Dict:
    """
    Check Redis cache and queue health.
    """
    health = {
        'status': 'healthy',
        'checks': {}
    }

    try:
        # Connect to Redis
        r = redis.from_url(os.getenv('REDIS_URL', 'redis://localhost:6379/0'))

        # Check connection
        r.ping()
        health['checks']['connection'] = {'status': 'connected'}

        # Get Redis info
        info = r.info()

        # Check memory usage
        memory_mb = info['used_memory'] / 1024 / 1024
        health['checks']['memory'] = {
            'used_mb': round(memory_mb, 2),
            'threshold_mb': THRESHOLDS['redis_memory_mb']
        }

        if memory_mb > THRESHOLDS['redis_memory_mb']:
            health['status'] = 'degraded'
            health['checks']['memory']['warning'] = 'High memory usage'

        # Check connected clients
        health['checks']['clients'] = {
            'connected': info['connected_clients'],
            'blocked': info['blocked_clients']
        }

        # Check keyspace
        health['checks']['keyspace'] = {
            'keys': r.dbsize(),
            'expires': info.get('expired_keys', 0)
        }

    except Exception as e:
        health['status'] = 'unhealthy'
        health['error'] = str(e)

    return health


def check_celery_health() -> Dict:
    """
    Check Celery workers and queues health.
    """
    health = {
        'status': 'healthy',
        'checks': {}
    }

    try:
        from automation.celery_app import app

        # Check active workers
        inspect = app.control.inspect()
        active_workers = inspect.active()

        health['checks']['workers'] = {
            'count': len(active_workers) if active_workers else 0,
            'active_tasks': sum(len(tasks) for tasks in active_workers.values()) if active_workers else 0
        }

        # Check queue sizes
        queue_sizes = get_queue_sizes()
        health['checks']['queues'] = queue_sizes

        for queue_name, size in queue_sizes.items():
            if size > THRESHOLDS['queue_size']:
                health['status'] = 'degraded'
                health['checks']['queues'][f'{queue_name}_warning'] = 'Queue backlog detected'

        # Check scheduled tasks
        scheduled = inspect.scheduled()
        health['checks']['scheduled'] = {
            'count': sum(len(tasks) for tasks in scheduled.values()) if scheduled else 0
        }

        # Check failed tasks
        failed_count = get_failed_task_count()
        health['checks']['failed_tasks'] = {
            'count': failed_count,
            'threshold': 100
        }

        if failed_count > 100:
            health['status'] = 'unhealthy'
            health['checks']['failed_tasks']['alert'] = 'High failure rate'

    except Exception as e:
        health['status'] = 'unhealthy'
        health['error'] = str(e)

    return health


def check_system_resources() -> Dict:
    """
    Check system resource utilization.
    """
    health = {
        'status': 'healthy',
        'checks': {}
    }

    try:
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        health['checks']['cpu'] = {
            'usage_percent': cpu_percent,
            'threshold': THRESHOLDS['cpu_percent'],
            'cores': psutil.cpu_count()
        }

        if cpu_percent > THRESHOLDS['cpu_percent']:
            health['status'] = 'degraded'
            health['checks']['cpu']['warning'] = 'High CPU usage'

        # Memory usage
        memory = psutil.virtual_memory()
        health['checks']['memory'] = {
            'usage_percent': memory.percent,
            'threshold': THRESHOLDS['memory_percent'],
            'available_gb': round(memory.available / 1024 / 1024 / 1024, 2),
            'total_gb': round(memory.total / 1024 / 1024 / 1024, 2)
        }

        if memory.percent > THRESHOLDS['memory_percent']:
            health['status'] = 'unhealthy'
            health['checks']['memory']['alert'] = 'Critical memory usage'

        # Disk usage
        disk = psutil.disk_usage('/')
        health['checks']['disk'] = {
            'usage_percent': disk.percent,
            'threshold': THRESHOLDS['disk_percent'],
            'free_gb': round(disk.free / 1024 / 1024 / 1024, 2)
        }

        if disk.percent > THRESHOLDS['disk_percent']:
            health['status'] = 'unhealthy'
            health['checks']['disk']['alert'] = 'Low disk space'

        # Network I/O
        net_io = psutil.net_io_counters()
        health['checks']['network'] = {
            'bytes_sent_mb': round(net_io.bytes_sent / 1024 / 1024, 2),
            'bytes_recv_mb': round(net_io.bytes_recv / 1024 / 1024, 2),
            'errors': net_io.errin + net_io.errout,
            'drops': net_io.dropin + net_io.dropout
        }

    except Exception as e:
        health['status'] = 'unhealthy'
        health['error'] = str(e)

    return health


def check_external_services() -> Dict:
    """
    Check external service dependencies.
    """
    health = {
        'status': 'healthy',
        'checks': {}
    }

    services = [
        ('OpenAI', os.getenv('OPENAI_API_URL', 'https://api.openai.com/v1/models')),
        ('Slack', 'https://slack.com/api/api.test'),
        ('SendGrid', 'https://api.sendgrid.com/v3/'),
        ('Stripe', 'https://api.stripe.com/v1/')
    ]

    for service_name, url in services:
        try:
            response = httpx.get(url, timeout=5.0)
            health['checks'][service_name.lower()] = {
                'status': 'available' if response.status_code < 500 else 'unavailable',
                'response_time_ms': response.elapsed.total_seconds() * 1000
            }
        except Exception as e:
            health['checks'][service_name.lower()] = {
                'status': 'unavailable',
                'error': str(e)
            }
            health['status'] = 'degraded'

    return health


def get_api_error_rate() -> float:
    """
    Calculate API error rate from recent requests.
    """
    try:
        response = httpx.get(
            f"{os.getenv('CONVEX_URL')}/api/metrics/errors/rate",
            params={'window_minutes': 5},
            headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
        )
        return response.json().get('rate', 0.0) * 100
    except:
        return 0.0


def get_database_metrics() -> Dict:
    """
    Get database performance metrics.
    """
    try:
        response = httpx.get(
            f"{os.getenv('CONVEX_URL')}/api/metrics/database",
            headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
        )
        return response.json()
    except:
        return {}


def get_queue_sizes() -> Dict:
    """
    Get current queue sizes.
    """
    queue_sizes = {}

    try:
        r = redis.from_url(os.getenv('REDIS_URL', 'redis://localhost:6379/0'))

        queues = ['default', 'leads', 'metrics', 'content', 'notifications']
        for queue in queues:
            queue_sizes[queue] = r.llen(f'celery:queue:{queue}')

    except:
        pass

    return queue_sizes


def get_failed_task_count() -> int:
    """
    Get count of failed tasks in the last hour.
    """
    try:
        response = httpx.get(
            f"{os.getenv('CONVEX_URL')}/api/metrics/tasks/failed",
            params={'window_hours': 1},
            headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
        )
        return response.json().get('count', 0)
    except:
        return 0


def determine_overall_status(services: Dict) -> str:
    """
    Determine overall health status from service statuses.
    """
    statuses = [service.get('status', 'unknown') for service in services.values()]

    if 'unhealthy' in statuses:
        return 'unhealthy'
    elif 'degraded' in statuses:
        return 'degraded'
    elif 'unknown' in statuses:
        return 'unknown'
    else:
        return 'healthy'


def store_health_status(health_status: Dict):
    """
    Store health status for historical tracking.
    """
    try:
        httpx.post(
            f"{os.getenv('CONVEX_URL')}/api/health/status",
            json=health_status,
            headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
        )
    except Exception as e:
        logger.error(f"Failed to store health status: {str(e)}")


def send_health_alert(health_status: Dict):
    """
    Send alert for unhealthy status.
    """
    message = format_health_alert(health_status)

    # Send to Slack
    if webhook_url := os.getenv('SLACK_WEBHOOK_URL'):
        httpx.post(webhook_url, json={
            'channel': '#alerts',
            'text': message,
            'attachments': [{
                'color': 'danger' if health_status['overall_status'] == 'unhealthy' else 'warning',
                'fields': format_alert_fields(health_status)
            }]
        })

    # Send to PagerDuty for critical issues
    if health_status['overall_status'] == 'unhealthy':
        send_pagerduty_alert(health_status)


def format_health_alert(health_status: Dict) -> str:
    """
    Format health alert message.
    """
    emoji = '🔴' if health_status['overall_status'] == 'unhealthy' else '🟡'

    message = f"{emoji} System Health Alert: {health_status['overall_status'].upper()}\n\n"

    for service_name, service_health in health_status['services'].items():
        if service_health.get('status') != 'healthy':
            message += f"**{service_name}**: {service_health.get('status')}\n"

            # Add specific issues
            for check_name, check_data in service_health.get('checks', {}).items():
                if isinstance(check_data, dict):
                    if 'warning' in check_data:
                        message += f"  - {check_name}: {check_data['warning']}\n"
                    elif 'alert' in check_data:
                        message += f"  - {check_name}: {check_data['alert']}\n"

    return message


def format_alert_fields(health_status: Dict) -> List[Dict]:
    """
    Format alert fields for Slack attachment.
    """
    fields = []

    for service_name, service_health in health_status['services'].items():
        if service_health.get('status') != 'healthy':
            fields.append({
                'title': service_name.capitalize(),
                'value': service_health.get('status', 'unknown'),
                'short': True
            })

    return fields


def send_pagerduty_alert(health_status: Dict):
    """
    Send critical alert to PagerDuty.
    """
    if pagerduty_key := os.getenv('PAGERDUTY_KEY'):
        httpx.post(
            'https://events.pagerduty.com/v2/enqueue',
            json={
                'routing_key': pagerduty_key,
                'event_action': 'trigger',
                'payload': {
                    'summary': f"System Health Critical: {health_status['overall_status']}",
                    'severity': 'critical',
                    'source': 'health_checks',
                    'custom_details': health_status
                }
            }
        )