"""
Celery configuration for background task processing.
Replaces n8n workflows with Python-native automation.
"""

from celery import Celery
from celery.schedules import crontab
from kombu import Queue
import os
from datetime import timedelta

# Initialize Celery app
app = Celery('icodemybusiness')

# Configuration
app.conf.update(
    # Broker settings (Redis)
    broker_url=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
    result_backend=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),

    # Task settings
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,

    # Performance settings
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,
    task_acks_late=True,
    task_reject_on_worker_lost=True,

    # Task routing
    task_routes={
        'automation.tasks.lead_nurturing.*': {'queue': 'leads'},
        'automation.tasks.metrics_aggregation.*': {'queue': 'metrics'},
        'automation.tasks.content_publishing.*': {'queue': 'content'},
        'automation.tasks.client_notifications.*': {'queue': 'notifications'},
    },

    # Queue configuration
    task_queues=(
        Queue('default', routing_key='task.#'),
        Queue('leads', routing_key='leads.#'),
        Queue('metrics', routing_key='metrics.#'),
        Queue('content', routing_key='content.#'),
        Queue('notifications', routing_key='notifications.#'),
    ),

    # Monitoring
    worker_send_task_events=True,
    task_send_sent_event=True,

    # Error handling
    task_soft_time_limit=300,  # 5 minutes
    task_time_limit=600,  # 10 minutes

    # Result expiration
    result_expires=3600,  # 1 hour
)

# Periodic tasks schedule
app.conf.beat_schedule = {
    # Lead nurturing workflows
    'check-new-leads': {
        'task': 'automation.tasks.lead_nurturing.check_new_leads',
        'schedule': timedelta(minutes=15),
        'options': {'queue': 'leads'}
    },
    'send-follow-ups': {
        'task': 'automation.tasks.lead_nurturing.send_scheduled_follow_ups',
        'schedule': timedelta(hours=1),
        'options': {'queue': 'leads'}
    },
    'lead-scoring': {
        'task': 'automation.tasks.lead_nurturing.update_lead_scores',
        'schedule': timedelta(hours=6),
        'options': {'queue': 'leads'}
    },

    # Metrics aggregation
    'daily-metrics': {
        'task': 'automation.tasks.metrics_aggregation.calculate_daily_metrics',
        'schedule': crontab(hour=0, minute=30),  # 12:30 AM daily
        'options': {'queue': 'metrics'}
    },
    'hourly-performance': {
        'task': 'automation.tasks.metrics_aggregation.track_hourly_performance',
        'schedule': crontab(minute=0),  # Every hour
        'options': {'queue': 'metrics'}
    },
    'weekly-report': {
        'task': 'automation.tasks.metrics_aggregation.generate_weekly_report',
        'schedule': crontab(hour=9, minute=0, day_of_week=1),  # Monday 9 AM
        'options': {'queue': 'metrics'}
    },

    # Content publishing
    'publish-scheduled-content': {
        'task': 'automation.tasks.content_publishing.publish_scheduled_posts',
        'schedule': timedelta(minutes=30),
        'options': {'queue': 'content'}
    },
    'amplify-new-content': {
        'task': 'automation.tasks.content_publishing.amplify_new_content',
        'schedule': timedelta(hours=2),
        'options': {'queue': 'content'}
    },
    'content-performance': {
        'task': 'automation.tasks.content_publishing.track_content_performance',
        'schedule': timedelta(hours=4),
        'options': {'queue': 'content'}
    },

    # Client notifications
    'milestone-updates': {
        'task': 'automation.tasks.client_notifications.send_milestone_updates',
        'schedule': crontab(hour=10, minute=0),  # 10 AM daily
        'options': {'queue': 'notifications'}
    },
    'progress-alerts': {
        'task': 'automation.tasks.client_notifications.check_progress_alerts',
        'schedule': timedelta(hours=3),
        'options': {'queue': 'notifications'}
    },

    # Health monitoring
    'health-check': {
        'task': 'automation.monitoring.health_checks.perform_health_check',
        'schedule': timedelta(minutes=5),
    },
    'collect-metrics': {
        'task': 'automation.monitoring.metrics_collector.collect_system_metrics',
        'schedule': timedelta(minutes=1),
    },
}

# Auto-discovery of tasks
app.autodiscover_tasks([
    'automation.tasks',
    'automation.monitoring',
])

if __name__ == '__main__':
    app.start()