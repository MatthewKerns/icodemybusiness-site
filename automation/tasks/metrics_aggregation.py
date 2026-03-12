"""
Metrics aggregation and reporting automation.
Calculates business KPIs and generates reports.
"""

from celery import shared_task
from celery.utils.log import get_task_logger
from typing import Dict, List, Optional
from datetime import datetime, timedelta, date
from automation.monitoring.metrics_collector import track_metric
import httpx
import pandas as pd
import json
import os
from io import StringIO

logger = get_task_logger(__name__)


@shared_task(bind=True)
def calculate_daily_metrics(self):
    """
    Calculate and store daily business metrics.
    """
    try:
        logger.info("Calculating daily metrics...")

        today = date.today()
        metrics = {}

        # Lead metrics
        lead_metrics = calculate_lead_metrics(today)
        metrics['leads'] = lead_metrics

        # Revenue metrics
        revenue_metrics = calculate_revenue_metrics(today)
        metrics['revenue'] = revenue_metrics

        # Engagement metrics
        engagement_metrics = calculate_engagement_metrics(today)
        metrics['engagement'] = engagement_metrics

        # Conversion metrics
        conversion_metrics = calculate_conversion_metrics(today)
        metrics['conversions'] = conversion_metrics

        # Store metrics
        store_metrics(today.isoformat(), metrics)

        # Send daily summary
        send_daily_summary(metrics)

        track_metric('metrics.daily_calculated', 1)
        logger.info(f"Daily metrics calculated: {metrics}")

        return metrics

    except Exception as e:
        logger.error(f"Error calculating daily metrics: {str(e)}")
        raise self.retry(exc=e)


@shared_task(bind=True)
def track_hourly_performance(self):
    """
    Track hourly performance indicators.
    """
    try:
        logger.info("Tracking hourly performance...")

        current_hour = datetime.utcnow().replace(minute=0, second=0, microsecond=0)

        performance = {
            'timestamp': current_hour.isoformat(),
            'api_response_time': measure_api_performance(),
            'conversion_rate': calculate_hourly_conversion_rate(),
            'active_users': count_active_users(),
            'error_rate': calculate_error_rate(),
            'task_completion_rate': calculate_task_completion_rate()
        }

        # Store performance data
        store_performance_metrics(performance)

        # Check for anomalies
        anomalies = detect_anomalies(performance)
        if anomalies:
            alert_on_anomalies(anomalies)

        track_metric('metrics.hourly_tracked', 1)
        return performance

    except Exception as e:
        logger.error(f"Error tracking hourly performance: {str(e)}")
        raise


@shared_task(bind=True)
def generate_weekly_report(self):
    """
    Generate comprehensive weekly business report.
    """
    try:
        logger.info("Generating weekly report...")

        end_date = date.today()
        start_date = end_date - timedelta(days=7)

        report = {
            'period': f"{start_date} to {end_date}",
            'generated_at': datetime.utcnow().isoformat(),
            'sections': {}
        }

        # Executive summary
        report['sections']['executive_summary'] = generate_executive_summary(start_date, end_date)

        # Lead generation analysis
        report['sections']['lead_analysis'] = analyze_lead_generation(start_date, end_date)

        # Revenue analysis
        report['sections']['revenue_analysis'] = analyze_revenue(start_date, end_date)

        # Campaign performance
        report['sections']['campaign_performance'] = analyze_campaigns(start_date, end_date)

        # Client satisfaction
        report['sections']['client_satisfaction'] = analyze_client_satisfaction(start_date, end_date)

        # Recommendations
        report['sections']['recommendations'] = generate_recommendations(report)

        # Format and send report
        formatted_report = format_weekly_report(report)
        send_weekly_report(formatted_report)

        # Store report
        store_report('weekly', report)

        track_metric('reports.weekly_generated', 1)
        logger.info("Weekly report generated successfully")

        return report

    except Exception as e:
        logger.error(f"Error generating weekly report: {str(e)}")
        raise


def calculate_lead_metrics(target_date: date) -> Dict:
    """
    Calculate lead-related metrics for a given date.
    """
    response = httpx.get(
        f"{os.getenv('CONVEX_URL')}/api/metrics/leads",
        params={'date': target_date.isoformat()},
        headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
    )

    data = response.json()

    return {
        'new_leads': data.get('new', 0),
        'qualified_leads': data.get('qualified', 0),
        'conversion_rate': data.get('conversion_rate', 0),
        'avg_score': data.get('average_score', 0),
        'sources': data.get('sources', {}),
        'total_active': data.get('active', 0)
    }


def calculate_revenue_metrics(target_date: date) -> Dict:
    """
    Calculate revenue metrics for a given date.
    """
    response = httpx.get(
        f"{os.getenv('CONVEX_URL')}/api/metrics/revenue",
        params={'date': target_date.isoformat()},
        headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
    )

    data = response.json()

    return {
        'daily_revenue': data.get('daily', 0),
        'mrr': data.get('mrr', 0),
        'arr': data.get('arr', 0),
        'new_contracts': data.get('new_contracts', 0),
        'contract_value': data.get('average_contract_value', 0),
        'churn_rate': data.get('churn_rate', 0),
        'ltv': data.get('lifetime_value', 0)
    }


def calculate_engagement_metrics(target_date: date) -> Dict:
    """
    Calculate engagement metrics for a given date.
    """
    response = httpx.get(
        f"{os.getenv('CONVEX_URL')}/api/metrics/engagement",
        params={'date': target_date.isoformat()},
        headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
    )

    data = response.json()

    return {
        'email_open_rate': data.get('email_open_rate', 0),
        'click_through_rate': data.get('ctr', 0),
        'website_sessions': data.get('sessions', 0),
        'avg_session_duration': data.get('avg_duration', 0),
        'pages_per_session': data.get('pages_per_session', 0),
        'bounce_rate': data.get('bounce_rate', 0),
        'content_shares': data.get('shares', 0),
        'social_mentions': data.get('mentions', 0)
    }


def calculate_conversion_metrics(target_date: date) -> Dict:
    """
    Calculate conversion funnel metrics.
    """
    response = httpx.get(
        f"{os.getenv('CONVEX_URL')}/api/metrics/conversions",
        params={'date': target_date.isoformat()},
        headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
    )

    data = response.json()

    return {
        'visitor_to_lead': data.get('visitor_to_lead', 0),
        'lead_to_mql': data.get('lead_to_mql', 0),
        'mql_to_sql': data.get('mql_to_sql', 0),
        'sql_to_opportunity': data.get('sql_to_opportunity', 0),
        'opportunity_to_close': data.get('opportunity_to_close', 0),
        'overall_conversion': data.get('overall', 0),
        'avg_sales_cycle': data.get('sales_cycle_days', 0)
    }


def calculate_hourly_conversion_rate() -> float:
    """
    Calculate conversion rate for the last hour.
    """
    response = httpx.get(
        f"{os.getenv('CONVEX_URL')}/api/metrics/conversions/hourly",
        headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
    )

    data = response.json()
    return data.get('rate', 0.0)


def measure_api_performance() -> Dict:
    """
    Measure API performance metrics.
    """
    response = httpx.get(
        f"{os.getenv('CONVEX_URL')}/api/metrics/performance",
        headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
    )

    data = response.json()
    return {
        'avg_response_time': data.get('avg_response_ms', 0),
        'p95_response_time': data.get('p95_response_ms', 0),
        'error_rate': data.get('error_rate', 0),
        'requests_per_second': data.get('rps', 0)
    }


def count_active_users() -> int:
    """
    Count currently active users.
    """
    response = httpx.get(
        f"{os.getenv('CONVEX_URL')}/api/metrics/users/active",
        headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
    )

    data = response.json()
    return data.get('count', 0)


def calculate_error_rate() -> float:
    """
    Calculate error rate for the last hour.
    """
    response = httpx.get(
        f"{os.getenv('CONVEX_URL')}/api/metrics/errors/rate",
        headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
    )

    data = response.json()
    return data.get('rate', 0.0)


def calculate_task_completion_rate() -> float:
    """
    Calculate Celery task completion rate.
    """
    response = httpx.get(
        f"{os.getenv('CONVEX_URL')}/api/metrics/tasks/completion",
        headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
    )

    data = response.json()
    return data.get('rate', 0.0)


def detect_anomalies(performance: Dict) -> List[Dict]:
    """
    Detect anomalies in performance metrics.
    """
    anomalies = []

    # Check API response time
    if performance['api_response_time']['avg_response_time'] > 1000:
        anomalies.append({
            'metric': 'api_response_time',
            'value': performance['api_response_time']['avg_response_time'],
            'threshold': 1000,
            'severity': 'warning'
        })

    # Check error rate
    if performance['error_rate'] > 0.05:  # 5% error rate
        anomalies.append({
            'metric': 'error_rate',
            'value': performance['error_rate'],
            'threshold': 0.05,
            'severity': 'critical'
        })

    # Check conversion rate drop
    if performance['conversion_rate'] < 0.01:  # Less than 1%
        anomalies.append({
            'metric': 'conversion_rate',
            'value': performance['conversion_rate'],
            'threshold': 0.01,
            'severity': 'warning'
        })

    return anomalies


def alert_on_anomalies(anomalies: List[Dict]):
    """
    Send alerts for detected anomalies.
    """
    for anomaly in anomalies:
        message = f"ALERT: {anomaly['metric']} = {anomaly['value']} (threshold: {anomaly['threshold']})"

        if anomaly['severity'] == 'critical':
            # Send immediate notification
            send_critical_alert(message)
        else:
            # Log warning
            logger.warning(message)
            track_metric('anomalies.detected', 1, {'severity': anomaly['severity']})


def generate_executive_summary(start_date: date, end_date: date) -> Dict:
    """
    Generate executive summary for the week.
    """
    response = httpx.get(
        f"{os.getenv('CONVEX_URL')}/api/metrics/summary",
        params={'start_date': start_date.isoformat(), 'end_date': end_date.isoformat()},
        headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
    )

    data = response.json()

    return {
        'highlights': data.get('highlights', []),
        'key_metrics': data.get('key_metrics', {}),
        'trends': data.get('trends', {}),
        'goals_progress': data.get('goals', {})
    }


def analyze_lead_generation(start_date: date, end_date: date) -> Dict:
    """
    Analyze lead generation performance.
    """
    response = httpx.get(
        f"{os.getenv('CONVEX_URL')}/api/analytics/leads",
        params={'start_date': start_date.isoformat(), 'end_date': end_date.isoformat()},
        headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
    )

    return response.json()


def analyze_revenue(start_date: date, end_date: date) -> Dict:
    """
    Analyze revenue performance.
    """
    response = httpx.get(
        f"{os.getenv('CONVEX_URL')}/api/analytics/revenue",
        params={'start_date': start_date.isoformat(), 'end_date': end_date.isoformat()},
        headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
    )

    return response.json()


def analyze_campaigns(start_date: date, end_date: date) -> Dict:
    """
    Analyze marketing campaign performance.
    """
    response = httpx.get(
        f"{os.getenv('CONVEX_URL')}/api/analytics/campaigns",
        params={'start_date': start_date.isoformat(), 'end_date': end_date.isoformat()},
        headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
    )

    return response.json()


def analyze_client_satisfaction(start_date: date, end_date: date) -> Dict:
    """
    Analyze client satisfaction metrics.
    """
    response = httpx.get(
        f"{os.getenv('CONVEX_URL')}/api/analytics/satisfaction",
        params={'start_date': start_date.isoformat(), 'end_date': end_date.isoformat()},
        headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
    )

    return response.json()


def generate_recommendations(report: Dict) -> List[str]:
    """
    Generate actionable recommendations based on report data.
    """
    recommendations = []

    # Check lead conversion
    if report['sections']['lead_analysis'].get('conversion_rate', 0) < 0.02:
        recommendations.append("Consider A/B testing landing pages to improve lead conversion")

    # Check revenue trends
    if report['sections']['revenue_analysis'].get('growth_rate', 0) < 0.05:
        recommendations.append("Explore upselling opportunities with existing clients")

    # Check campaign performance
    best_campaign = report['sections']['campaign_performance'].get('best_performing')
    if best_campaign:
        recommendations.append(f"Scale up '{best_campaign}' campaign based on strong performance")

    return recommendations


def format_weekly_report(report: Dict) -> str:
    """
    Format weekly report for email/Slack.
    """
    sections = []

    sections.append(f"# Weekly Business Report\n{report['period']}\n")

    # Executive Summary
    summary = report['sections']['executive_summary']
    sections.append("## Executive Summary")
    for highlight in summary['highlights']:
        sections.append(f"• {highlight}")

    # Key Metrics
    sections.append("\n## Key Metrics")
    for metric, value in summary['key_metrics'].items():
        sections.append(f"• {metric}: {value}")

    # Recommendations
    sections.append("\n## Recommendations")
    for rec in report['sections']['recommendations']:
        sections.append(f"• {rec}")

    return "\n".join(sections)


def send_daily_summary(metrics: Dict):
    """
    Send daily metrics summary to stakeholders.
    """
    summary = f"""
    Daily Metrics Summary - {date.today()}

    Leads: {metrics['leads']['new_leads']} new, {metrics['leads']['qualified_leads']} qualified
    Revenue: ${metrics['revenue']['daily_revenue']:,.2f}
    Engagement: {metrics['engagement']['email_open_rate']:.1f}% open rate
    Conversions: {metrics['conversions']['overall_conversion']:.1f}% overall
    """

    # Send to Slack
    if webhook_url := os.getenv('SLACK_WEBHOOK_URL'):
        httpx.post(webhook_url, json={'text': summary})

    # Send email
    send_report_email("Daily Metrics Summary", summary)


def send_weekly_report(report: str):
    """
    Send weekly report to stakeholders.
    """
    # Send to Slack
    if webhook_url := os.getenv('SLACK_WEBHOOK_URL'):
        httpx.post(webhook_url, json={'text': report})

    # Send email
    send_report_email("Weekly Business Report", report)


def send_report_email(subject: str, content: str):
    """
    Send report via email.
    """
    import smtplib
    from email.mime.text import MIMEText

    msg = MIMEText(content)
    msg['Subject'] = f"ICodeMyBusiness - {subject}"
    msg['From'] = os.getenv('SMTP_FROM', 'reports@icodemybusiness.com')
    msg['To'] = os.getenv('REPORT_EMAIL', 'matthew@icodemybusiness.com')

    with smtplib.SMTP(os.getenv('SMTP_HOST', 'localhost'), int(os.getenv('SMTP_PORT', '587'))) as server:
        if os.getenv('SMTP_USER'):
            server.starttls()
            server.login(os.getenv('SMTP_USER'), os.getenv('SMTP_PASS'))
        server.send_message(msg)


def send_critical_alert(message: str):
    """
    Send critical alert notification.
    """
    # Send to PagerDuty or similar
    if pagerduty_key := os.getenv('PAGERDUTY_KEY'):
        httpx.post(
            'https://events.pagerduty.com/v2/enqueue',
            json={
                'routing_key': pagerduty_key,
                'event_action': 'trigger',
                'payload': {
                    'summary': message,
                    'severity': 'critical',
                    'source': 'metrics_aggregation'
                }
            }
        )


def store_metrics(date_key: str, metrics: Dict):
    """
    Store calculated metrics.
    """
    httpx.post(
        f"{os.getenv('CONVEX_URL')}/api/metrics/store",
        json={'date': date_key, 'metrics': metrics},
        headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
    )


def store_performance_metrics(performance: Dict):
    """
    Store performance metrics.
    """
    httpx.post(
        f"{os.getenv('CONVEX_URL')}/api/metrics/performance/store",
        json=performance,
        headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
    )


def store_report(report_type: str, report: Dict):
    """
    Store generated report.
    """
    httpx.post(
        f"{os.getenv('CONVEX_URL')}/api/reports/store",
        json={'type': report_type, 'report': report},
        headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
    )