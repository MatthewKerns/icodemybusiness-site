"""
Client notification system.
Handles milestone updates, progress alerts, and real-time communications.
"""

from celery import shared_task
from celery.utils.log import get_task_logger
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from automation.monitoring.metrics_collector import track_metric
import httpx
import json
import os

logger = get_task_logger(__name__)

# Notification templates
NOTIFICATION_TEMPLATES = {
    'milestone_reached': {
        'subject': 'Project Milestone Achieved: {milestone_name}',
        'content': """
        Great news! Your project has reached an important milestone.

        **Milestone:** {milestone_name}
        **Project:** {project_name}
        **Completion Date:** {completion_date}

        **What's Been Accomplished:**
        {accomplishments}

        **Next Steps:**
        {next_steps}

        **Impact on Your Business:**
        {business_impact}

        View full details in your dashboard: {dashboard_link}
        """
    },
    'weekly_progress': {
        'subject': 'Your Weekly AI Development Progress Report',
        'content': """
        Here's what we accomplished this week on your AI transformation project:

        **Project:** {project_name}
        **Week of:** {week_date}

        **Completed This Week:**
        {completed_tasks}

        **In Progress:**
        {in_progress_tasks}

        **Key Metrics:**
        • Progress: {progress_percentage}%
        • Hours Saved: {hours_saved}
        • Efficiency Gain: {efficiency_gain}%

        **Upcoming Next Week:**
        {upcoming_tasks}

        View detailed analytics: {dashboard_link}
        """
    },
    'system_alert': {
        'subject': 'Important Update: {alert_type}',
        'content': """
        We wanted to inform you about an update to your AI system:

        **Type:** {alert_type}
        **System:** {system_name}
        **Status:** {status}

        **Details:**
        {details}

        **Action Required:** {action_required}

        **Expected Resolution:** {resolution_time}

        If you have any questions, please don't hesitate to reach out.
        """
    },
    'performance_report': {
        'subject': 'Your AI System Performance Report',
        'content': """
        Your AI automation systems are delivering great results!

        **Reporting Period:** {period}

        **Performance Highlights:**
        • Automation Success Rate: {success_rate}%
        • Tasks Processed: {tasks_processed}
        • Time Saved: {time_saved} hours
        • Cost Savings: ${cost_savings}

        **System Health:**
        • Uptime: {uptime}%
        • Response Time: {response_time}ms
        • Error Rate: {error_rate}%

        **Recommendations:**
        {recommendations}

        Access full report: {dashboard_link}
        """
    },
    'deliverable_ready': {
        'subject': 'Deliverable Ready for Review: {deliverable_name}',
        'content': """
        A new deliverable is ready for your review!

        **Deliverable:** {deliverable_name}
        **Project:** {project_name}
        **Type:** {deliverable_type}

        **Description:**
        {description}

        **Key Features:**
        {features}

        **How to Access:**
        {access_instructions}

        **Next Steps:**
        Please review and provide feedback by {feedback_deadline}.

        Review now: {review_link}
        """
    }
}


@shared_task(bind=True)
def send_milestone_updates(self):
    """
    Send milestone achievement notifications to clients.
    """
    try:
        logger.info("Checking for milestone updates...")

        # Get recently completed milestones
        response = httpx.get(
            f"{os.getenv('CONVEX_URL')}/api/projects/milestones/completed",
            params={'since_hours': 24},
            headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
        )

        milestones = response.json()
        logger.info(f"Found {len(milestones)} completed milestones")

        for milestone in milestones:
            # Send notification to client
            send_client_notification.delay(
                client_id=milestone['client_id'],
                template='milestone_reached',
                data=milestone,
                channels=['email', 'dashboard']
            )

            # Update internal team
            notify_team_milestone.delay(milestone)

        track_metric('notifications.milestones_sent', len(milestones))
        return {'milestones_notified': len(milestones)}

    except Exception as e:
        logger.error(f"Error sending milestone updates: {str(e)}")
        raise self.retry(exc=e)


@shared_task(bind=True)
def check_progress_alerts(self):
    """
    Check for and send progress-based alerts.
    """
    try:
        logger.info("Checking progress alerts...")

        alerts = []

        # Check for delayed projects
        delayed = check_delayed_projects()
        alerts.extend(delayed)

        # Check for at-risk deliverables
        at_risk = check_at_risk_deliverables()
        alerts.extend(at_risk)

        # Check for exceptional performance
        exceptional = check_exceptional_performance()
        alerts.extend(exceptional)

        logger.info(f"Found {len(alerts)} alerts to send")

        for alert in alerts:
            send_progress_alert.delay(alert)

        track_metric('notifications.progress_alerts', len(alerts))
        return {'alerts_sent': len(alerts)}

    except Exception as e:
        logger.error(f"Error checking progress alerts: {str(e)}")
        raise


@shared_task(bind=True, max_retries=3)
def send_client_notification(
    self,
    client_id: str,
    template: str,
    data: Dict,
    channels: List[str]
):
    """
    Send notification to client through specified channels.
    """
    try:
        logger.info(f"Sending {template} notification to client {client_id}")

        # Get client details
        client = get_client_details(client_id)

        # Prepare notification content
        notification = prepare_notification(template, data, client)

        # Send through each channel
        results = {}
        for channel in channels:
            if channel == 'email':
                results['email'] = send_email_notification(client, notification)
            elif channel == 'sms':
                results['sms'] = send_sms_notification(client, notification)
            elif channel == 'dashboard':
                results['dashboard'] = send_dashboard_notification(client, notification)
            elif channel == 'slack':
                results['slack'] = send_slack_notification(client, notification)

        # Log notification
        log_notification(client_id, template, channels, results)

        track_metric('notifications.sent', 1, {'template': template})
        return results

    except Exception as e:
        logger.error(f"Error sending notification to {client_id}: {str(e)}")
        raise self.retry(exc=e)


@shared_task
def send_weekly_progress_report(project_id: str):
    """
    Send weekly progress report to client.
    """
    logger.info(f"Generating weekly report for project {project_id}")

    # Gather weekly data
    report_data = gather_weekly_progress(project_id)

    # Get project and client info
    project = get_project_details(project_id)
    client_id = project['client_id']

    # Send report
    send_client_notification.delay(
        client_id=client_id,
        template='weekly_progress',
        data=report_data,
        channels=['email', 'dashboard']
    )

    track_metric('reports.weekly_sent', 1)


@shared_task
def send_system_health_update(client_id: str, system_data: Dict):
    """
    Send system health and performance updates.
    """
    logger.info(f"Sending system health update to client {client_id}")

    # Prepare performance metrics
    performance_data = {
        'period': 'Last 7 days',
        'success_rate': system_data.get('success_rate', 99.9),
        'tasks_processed': system_data.get('tasks_processed', 0),
        'time_saved': calculate_time_saved(system_data),
        'cost_savings': calculate_cost_savings(system_data),
        'uptime': system_data.get('uptime', 99.99),
        'response_time': system_data.get('avg_response_time', 200),
        'error_rate': system_data.get('error_rate', 0.1),
        'recommendations': generate_performance_recommendations(system_data),
        'dashboard_link': f"{os.getenv('DASHBOARD_URL')}/performance"
    }

    send_client_notification.delay(
        client_id=client_id,
        template='performance_report',
        data=performance_data,
        channels=['email']
    )

    track_metric('notifications.performance_sent', 1)


@shared_task
def notify_deliverable_ready(deliverable_id: str):
    """
    Notify client that a deliverable is ready for review.
    """
    logger.info(f"Notifying about deliverable {deliverable_id}")

    # Get deliverable details
    deliverable = get_deliverable_details(deliverable_id)

    # Prepare notification data
    notification_data = {
        'deliverable_name': deliverable['name'],
        'project_name': deliverable['project_name'],
        'deliverable_type': deliverable['type'],
        'description': deliverable['description'],
        'features': format_features(deliverable.get('features', [])),
        'access_instructions': deliverable.get('access_instructions'),
        'feedback_deadline': (datetime.utcnow() + timedelta(days=3)).strftime('%B %d, %Y'),
        'review_link': f"{os.getenv('DASHBOARD_URL')}/deliverables/{deliverable_id}"
    }

    send_client_notification.delay(
        client_id=deliverable['client_id'],
        template='deliverable_ready',
        data=notification_data,
        channels=['email', 'dashboard', 'slack']
    )

    track_metric('notifications.deliverable_ready', 1)


@shared_task
def send_progress_alert(alert: Dict):
    """
    Send specific progress alert to relevant parties.
    """
    logger.info(f"Sending progress alert: {alert['type']}")

    if alert['type'] == 'delayed':
        handle_delay_alert(alert)
    elif alert['type'] == 'at_risk':
        handle_risk_alert(alert)
    elif alert['type'] == 'exceptional':
        handle_exceptional_alert(alert)

    track_metric('alerts.sent', 1, {'type': alert['type']})


@shared_task
def notify_team_milestone(milestone: Dict):
    """
    Notify internal team about milestone completion.
    """
    logger.info(f"Notifying team about milestone: {milestone['name']}")

    message = f"""
    🎉 Milestone Achieved!

    **Project:** {milestone['project_name']}
    **Client:** {milestone['client_name']}
    **Milestone:** {milestone['name']}

    Great work team! Let's keep the momentum going.
    """

    # Send to team Slack
    if webhook_url := os.getenv('SLACK_WEBHOOK_URL'):
        httpx.post(webhook_url, json={
            'channel': '#project-updates',
            'text': message
        })

    track_metric('notifications.team_milestone', 1)


def check_delayed_projects() -> List[Dict]:
    """
    Check for projects that are behind schedule.
    """
    response = httpx.get(
        f"{os.getenv('CONVEX_URL')}/api/projects/delayed",
        headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
    )

    delayed_projects = response.json()
    alerts = []

    for project in delayed_projects:
        if project['delay_days'] > 3:  # Alert if more than 3 days delayed
            alerts.append({
                'type': 'delayed',
                'severity': 'warning' if project['delay_days'] < 7 else 'critical',
                'project_id': project['id'],
                'client_id': project['client_id'],
                'delay_days': project['delay_days'],
                'impact': project.get('impact_assessment')
            })

    return alerts


def check_at_risk_deliverables() -> List[Dict]:
    """
    Check for deliverables at risk of missing deadlines.
    """
    response = httpx.get(
        f"{os.getenv('CONVEX_URL')}/api/deliverables/at-risk",
        headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
    )

    at_risk = response.json()
    alerts = []

    for deliverable in at_risk:
        alerts.append({
            'type': 'at_risk',
            'severity': 'warning',
            'deliverable_id': deliverable['id'],
            'project_id': deliverable['project_id'],
            'client_id': deliverable['client_id'],
            'risk_factors': deliverable.get('risk_factors', []),
            'mitigation_plan': deliverable.get('mitigation_plan')
        })

    return alerts


def check_exceptional_performance() -> List[Dict]:
    """
    Check for exceptional performance to celebrate.
    """
    response = httpx.get(
        f"{os.getenv('CONVEX_URL')}/api/projects/exceptional",
        headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
    )

    exceptional = response.json()
    alerts = []

    for project in exceptional:
        alerts.append({
            'type': 'exceptional',
            'severity': 'info',
            'project_id': project['id'],
            'client_id': project['client_id'],
            'achievement': project['achievement'],
            'metrics': project['metrics']
        })

    return alerts


def get_client_details(client_id: str) -> Dict:
    """
    Fetch client details from database.
    """
    response = httpx.get(
        f"{os.getenv('CONVEX_URL')}/api/clients/{client_id}",
        headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
    )
    return response.json()


def get_project_details(project_id: str) -> Dict:
    """
    Fetch project details from database.
    """
    response = httpx.get(
        f"{os.getenv('CONVEX_URL')}/api/projects/{project_id}",
        headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
    )
    return response.json()


def get_deliverable_details(deliverable_id: str) -> Dict:
    """
    Fetch deliverable details from database.
    """
    response = httpx.get(
        f"{os.getenv('CONVEX_URL')}/api/deliverables/{deliverable_id}",
        headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
    )
    return response.json()


def gather_weekly_progress(project_id: str) -> Dict:
    """
    Gather weekly progress data for a project.
    """
    response = httpx.get(
        f"{os.getenv('CONVEX_URL')}/api/projects/{project_id}/weekly-progress",
        headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
    )
    return response.json()


def prepare_notification(template: str, data: Dict, client: Dict) -> Dict:
    """
    Prepare notification content from template.
    """
    template_data = NOTIFICATION_TEMPLATES[template]

    # Add client-specific data
    data['client_name'] = client.get('name', 'Valued Client')
    data['dashboard_link'] = f"{os.getenv('DASHBOARD_URL')}/projects/{data.get('project_id')}"

    # Format content
    content = template_data['content'].format(**data)
    subject = template_data['subject'].format(**data)

    return {
        'subject': subject,
        'content': content,
        'template': template,
        'data': data
    }


def send_email_notification(client: Dict, notification: Dict) -> bool:
    """
    Send email notification to client.
    """
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    msg = MIMEMultipart('alternative')
    msg['Subject'] = notification['subject']
    msg['From'] = os.getenv('SMTP_FROM', 'updates@icodemybusiness.com')
    msg['To'] = client['email']

    # Create HTML version
    html_content = notification['content'].replace('\n', '<br>')
    html_content = html_content.replace('**', '')  # Remove markdown bold

    part = MIMEText(html_content, 'html')
    msg.attach(part)

    try:
        with smtplib.SMTP(os.getenv('SMTP_HOST', 'localhost'), int(os.getenv('SMTP_PORT', '587'))) as server:
            if os.getenv('SMTP_USER'):
                server.starttls()
                server.login(os.getenv('SMTP_USER'), os.getenv('SMTP_PASS'))
            server.send_message(msg)
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        return False


def send_sms_notification(client: Dict, notification: Dict) -> bool:
    """
    Send SMS notification to client.
    """
    if not client.get('phone'):
        return False

    # Extract key message (first paragraph or summary)
    message = notification['content'].split('\n\n')[0][:160]

    # Send via Twilio or similar
    if twilio_sid := os.getenv('TWILIO_ACCOUNT_SID'):
        from twilio.rest import Client as TwilioClient

        twilio = TwilioClient(twilio_sid, os.getenv('TWILIO_AUTH_TOKEN'))

        try:
            twilio.messages.create(
                body=message,
                from_=os.getenv('TWILIO_PHONE'),
                to=client['phone']
            )
            return True
        except Exception as e:
            logger.error(f"Failed to send SMS: {str(e)}")
            return False

    return False


def send_dashboard_notification(client: Dict, notification: Dict) -> bool:
    """
    Create dashboard notification for client.
    """
    try:
        response = httpx.post(
            f"{os.getenv('CONVEX_URL')}/api/notifications",
            json={
                'client_id': client['id'],
                'type': notification['template'],
                'title': notification['subject'],
                'content': notification['content'],
                'data': notification['data'],
                'created_at': datetime.utcnow().isoformat()
            },
            headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
        )
        return response.status_code == 201
    except Exception as e:
        logger.error(f"Failed to create dashboard notification: {str(e)}")
        return False


def send_slack_notification(client: Dict, notification: Dict) -> bool:
    """
    Send notification to client's Slack channel.
    """
    if not client.get('slack_webhook'):
        return False

    try:
        response = httpx.post(
            client['slack_webhook'],
            json={
                'text': notification['subject'],
                'blocks': [
                    {
                        'type': 'section',
                        'text': {
                            'type': 'mrkdwn',
                            'text': notification['content']
                        }
                    }
                ]
            }
        )
        return response.status_code == 200
    except Exception as e:
        logger.error(f"Failed to send Slack notification: {str(e)}")
        return False


def handle_delay_alert(alert: Dict):
    """
    Handle project delay alert.
    """
    project = get_project_details(alert['project_id'])

    data = {
        'alert_type': 'Project Delay',
        'system_name': project['name'],
        'status': f"{alert['delay_days']} days behind schedule",
        'details': f"The project is currently {alert['delay_days']} days behind the planned schedule.",
        'action_required': 'No action needed - we are working to get back on track',
        'resolution_time': 'Within the next week'
    }

    send_client_notification.delay(
        client_id=alert['client_id'],
        template='system_alert',
        data=data,
        channels=['email'] if alert['severity'] == 'warning' else ['email', 'sms']
    )


def handle_risk_alert(alert: Dict):
    """
    Handle at-risk deliverable alert.
    """
    # Internal alert only - don't worry clients unnecessarily
    message = f"""
    ⚠️ At-Risk Deliverable

    Deliverable ID: {alert['deliverable_id']}
    Risk Factors: {', '.join(alert['risk_factors'])}
    Mitigation: {alert.get('mitigation_plan', 'Under review')}
    """

    if webhook_url := os.getenv('SLACK_WEBHOOK_URL'):
        httpx.post(webhook_url, json={
            'channel': '#project-alerts',
            'text': message
        })


def handle_exceptional_alert(alert: Dict):
    """
    Handle exceptional performance alert.
    """
    data = {
        'achievement': alert['achievement'],
        'metrics': alert['metrics']
    }

    # Celebrate with the client
    send_client_notification.delay(
        client_id=alert['client_id'],
        template='performance_report',
        data=data,
        channels=['email', 'dashboard']
    )


def calculate_time_saved(system_data: Dict) -> float:
    """
    Calculate hours saved through automation.
    """
    tasks = system_data.get('tasks_processed', 0)
    avg_time_per_task = system_data.get('avg_manual_time', 0.5)  # 30 min default
    automation_time = system_data.get('avg_automation_time', 0.017)  # 1 min default

    return tasks * (avg_time_per_task - automation_time)


def calculate_cost_savings(system_data: Dict) -> float:
    """
    Calculate cost savings from automation.
    """
    hours_saved = calculate_time_saved(system_data)
    hourly_rate = system_data.get('hourly_rate', 50)  # $50/hour default

    return hours_saved * hourly_rate


def generate_performance_recommendations(system_data: Dict) -> str:
    """
    Generate recommendations based on performance data.
    """
    recommendations = []

    if system_data.get('error_rate', 0) > 1:
        recommendations.append("Consider reviewing error patterns to improve reliability")

    if system_data.get('avg_response_time', 0) > 500:
        recommendations.append("Response times could be optimized for better performance")

    if not recommendations:
        recommendations.append("System is performing optimally - no actions needed")

    return '\n'.join([f"• {r}" for r in recommendations])


def format_features(features: List[str]) -> str:
    """
    Format feature list for notification.
    """
    return '\n'.join([f"• {feature}" for feature in features])


def log_notification(client_id: str, template: str, channels: List[str], results: Dict):
    """
    Log notification delivery results.
    """
    httpx.post(
        f"{os.getenv('CONVEX_URL')}/api/notifications/log",
        json={
            'client_id': client_id,
            'template': template,
            'channels': channels,
            'results': results,
            'timestamp': datetime.utcnow().isoformat()
        },
        headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
    )