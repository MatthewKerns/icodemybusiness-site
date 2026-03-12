"""
Lead nurturing automation workflows.
Handles automated follow-ups, scoring, and engagement tracking.
"""

from celery import shared_task
from celery.utils.log import get_task_logger
from typing import Dict, List, Optional
import json
from datetime import datetime, timedelta
from automation.monitoring.metrics_collector import track_metric
import httpx
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
import os

logger = get_task_logger(__name__)

# Email templates for different stages
EMAIL_TEMPLATES = {
    'welcome': {
        'subject': 'Welcome to ICodeMyBusiness - Your AI Transformation Journey Begins',
        'delay_days': 0,
        'content': """
        Hi {name},

        Thank you for your interest in AI-powered business transformation!

        I'm Matthew Kerns, and I help businesses like yours leverage AI to:
        • Automate repetitive tasks
        • Enhance decision-making with data insights
        • Create personalized customer experiences

        Over the next few days, I'll share insights on how AI can specifically benefit {industry} businesses.

        What's your biggest operational challenge right now?

        Best regards,
        Matthew Kerns
        ICodeMyBusiness
        """
    },
    'value_proposition': {
        'subject': 'How {company} Can Save 20+ Hours/Week with AI',
        'delay_days': 2,
        'content': """
        Hi {name},

        I've been thinking about {company} and how AI could streamline your operations.

        Based on what I know about {industry} businesses, here are 3 quick wins:

        1. **Customer Service Automation**: AI chatbots handling 80% of routine inquiries
        2. **Document Processing**: Automated data extraction and filing
        3. **Predictive Analytics**: Forecast demand and optimize inventory

        Each of these can be implemented within 2-4 weeks with measurable ROI.

        Would you like to see a specific example for {company}?

        Best,
        Matthew
        """
    },
    'case_study': {
        'subject': 'Case Study: How We Helped a {industry} Company Increase Efficiency by 40%',
        'delay_days': 5,
        'content': """
        Hi {name},

        I wanted to share a recent success story from a {industry} company similar to {company}.

        **The Challenge**: Manual data entry consuming 30+ hours weekly
        **Our Solution**: Custom AI workflow automation
        **Results**:
        • 40% efficiency increase
        • $50K annual savings
        • 95% accuracy improvement

        The entire implementation took just 3 weeks.

        Interested in exploring what's possible for {company}?

        I have time for a brief call this week if you'd like to discuss.

        Best,
        Matthew
        """
    },
    'consultation_offer': {
        'subject': 'Complimentary AI Strategy Session for {company}',
        'delay_days': 7,
        'content': """
        Hi {name},

        I'd like to offer you a complimentary 30-minute AI strategy session for {company}.

        During our call, we'll:
        • Identify your top 3 automation opportunities
        • Map out a practical implementation roadmap
        • Calculate potential ROI

        No sales pitch - just actionable insights you can use.

        Here's my calendar link: [calendly.com/matthewkerns]

        Or simply reply with a few times that work for you.

        Looking forward to helping {company} leverage AI effectively!

        Best,
        Matthew
        """
    },
    're_engagement': {
        'subject': 'Quick question about {company}',
        'delay_days': 14,
        'content': """
        Hi {name},

        I hope all is well with {company}!

        I wanted to check if AI automation is still on your radar?

        If priorities have shifted, I completely understand.

        If you're still interested but the timing isn't right, I can check back in a few months.

        Either way, I wish you continued success!

        Best,
        Matthew
        """
    }
}


@shared_task(bind=True, max_retries=3)
def check_new_leads(self):
    """
    Check for new leads and initiate nurturing sequences.
    """
    try:
        logger.info("Checking for new leads...")

        # Fetch new leads from Convex
        response = httpx.get(
            f"{os.getenv('CONVEX_URL', 'http://localhost:3001')}/api/leads/new",
            headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
        )

        if response.status_code != 200:
            raise Exception(f"Failed to fetch leads: {response.status_code}")

        new_leads = response.json()
        logger.info(f"Found {len(new_leads)} new leads")

        for lead in new_leads:
            # Start nurturing sequence
            initiate_nurturing_sequence.delay(lead['id'], lead)

            # Track metric
            track_metric('leads.new', 1, {'source': lead.get('source', 'unknown')})

        return {'processed': len(new_leads)}

    except Exception as e:
        logger.error(f"Error checking new leads: {str(e)}")
        raise self.retry(exc=e)


@shared_task(bind=True, max_retries=3)
def initiate_nurturing_sequence(self, lead_id: str, lead_data: Dict):
    """
    Start automated nurturing sequence for a new lead.
    """
    try:
        logger.info(f"Initiating nurturing sequence for lead {lead_id}")

        # Schedule email sequence
        for template_key, template in EMAIL_TEMPLATES.items():
            send_time = datetime.utcnow() + timedelta(days=template['delay_days'])

            # Schedule email
            send_nurturing_email.apply_async(
                args=[lead_id, template_key, lead_data],
                eta=send_time
            )

        # Update lead status
        response = httpx.patch(
            f"{os.getenv('CONVEX_URL')}/api/leads/{lead_id}",
            json={'nurturing_started': True, 'sequence_active': True},
            headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
        )

        track_metric('leads.nurturing_started', 1)
        return {'lead_id': lead_id, 'sequence_initiated': True}

    except Exception as e:
        logger.error(f"Error initiating sequence for {lead_id}: {str(e)}")
        raise self.retry(exc=e)


@shared_task(bind=True, max_retries=3)
def send_nurturing_email(self, lead_id: str, template_key: str, lead_data: Dict):
    """
    Send a nurturing email to a lead.
    """
    try:
        logger.info(f"Sending {template_key} email to lead {lead_id}")

        template = EMAIL_TEMPLATES[template_key]

        # Personalize content
        content = template['content'].format(
            name=lead_data.get('name', 'there'),
            company=lead_data.get('company', 'your company'),
            industry=lead_data.get('industry', 'your')
        )

        # Send email
        send_email(
            to=lead_data['email'],
            subject=template['subject'].format(
                company=lead_data.get('company', 'Your Company'),
                industry=lead_data.get('industry', 'Your')
            ),
            content=content
        )

        # Track engagement
        track_engagement(lead_id, f'email_{template_key}_sent')

        track_metric('emails.sent', 1, {'template': template_key})
        return {'email_sent': True, 'template': template_key}

    except Exception as e:
        logger.error(f"Error sending email to {lead_id}: {str(e)}")
        raise self.retry(exc=e)


@shared_task(bind=True)
def send_scheduled_follow_ups(self):
    """
    Send scheduled follow-up emails based on engagement.
    """
    try:
        logger.info("Processing scheduled follow-ups...")

        # Get leads requiring follow-up
        response = httpx.get(
            f"{os.getenv('CONVEX_URL')}/api/leads/pending-followups",
            headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
        )

        leads = response.json()
        logger.info(f"Found {len(leads)} leads for follow-up")

        for lead in leads:
            # Determine next action based on engagement
            if lead.get('engagement_score', 0) > 70:
                # High engagement - send consultation offer
                send_consultation_invite.delay(lead['id'], lead)
            elif lead.get('engagement_score', 0) > 40:
                # Medium engagement - send case study
                send_nurturing_email.delay(lead['id'], 'case_study', lead)
            else:
                # Low engagement - try re-engagement
                send_nurturing_email.delay(lead['id'], 're_engagement', lead)

        return {'processed': len(leads)}

    except Exception as e:
        logger.error(f"Error processing follow-ups: {str(e)}")
        raise


@shared_task(bind=True)
def update_lead_scores(self):
    """
    Update lead scores based on engagement metrics.
    """
    try:
        logger.info("Updating lead scores...")

        # Get all active leads
        response = httpx.get(
            f"{os.getenv('CONVEX_URL')}/api/leads/active",
            headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
        )

        leads = response.json()

        for lead in leads:
            # Calculate engagement score
            score = calculate_engagement_score(lead)

            # Update lead score
            httpx.patch(
                f"{os.getenv('CONVEX_URL')}/api/leads/{lead['id']}",
                json={'engagement_score': score, 'last_scored': datetime.utcnow().isoformat()},
                headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
            )

            # Trigger actions based on score changes
            if score > 80 and not lead.get('sales_qualified'):
                notify_sales_team.delay(lead['id'], lead)

        track_metric('leads.scored', len(leads))
        return {'scored': len(leads)}

    except Exception as e:
        logger.error(f"Error updating lead scores: {str(e)}")
        raise


@shared_task
def send_consultation_invite(lead_id: str, lead_data: Dict):
    """
    Send personalized consultation invitation to qualified lead.
    """
    logger.info(f"Sending consultation invite to lead {lead_id}")

    # Send calendar link
    send_nurturing_email.delay(lead_id, 'consultation_offer', lead_data)

    # Notify sales team
    notify_sales_team.delay(lead_id, lead_data)

    track_metric('leads.qualified', 1)
    return {'consultation_invited': True}


@shared_task
def notify_sales_team(lead_id: str, lead_data: Dict):
    """
    Notify sales team about qualified lead.
    """
    logger.info(f"Notifying sales team about lead {lead_id}")

    # Send internal notification
    message = f"""
    New Qualified Lead:
    Name: {lead_data.get('name')}
    Company: {lead_data.get('company')}
    Email: {lead_data.get('email')}
    Score: {lead_data.get('engagement_score')}

    View in dashboard: {os.getenv('DASHBOARD_URL')}/leads/{lead_id}
    """

    # Send to Slack or email
    send_slack_notification('#sales', message)

    track_metric('notifications.sales_team', 1)
    return {'notified': True}


def calculate_engagement_score(lead: Dict) -> int:
    """
    Calculate lead engagement score based on activities.
    """
    score = 0

    # Email engagement
    score += lead.get('emails_opened', 0) * 5
    score += lead.get('links_clicked', 0) * 10

    # Website activity
    score += lead.get('pages_viewed', 0) * 2
    score += lead.get('resources_downloaded', 0) * 15

    # Form submissions
    score += lead.get('forms_submitted', 0) * 20

    # Time-based decay
    last_activity = lead.get('last_activity')
    if last_activity:
        days_inactive = (datetime.utcnow() - datetime.fromisoformat(last_activity)).days
        score = max(0, score - (days_inactive * 2))

    return min(100, score)  # Cap at 100


def track_engagement(lead_id: str, event: str):
    """
    Track lead engagement events.
    """
    httpx.post(
        f"{os.getenv('CONVEX_URL')}/api/leads/{lead_id}/events",
        json={'event': event, 'timestamp': datetime.utcnow().isoformat()},
        headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
    )


def send_email(to: str, subject: str, content: str):
    """
    Send email using SMTP.
    """
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = os.getenv('SMTP_FROM', 'matthew@icodemybusiness.com')
    msg['To'] = to

    # Create HTML content
    html_content = content.replace('\n', '<br>')
    part = MIMEText(html_content, 'html')
    msg.attach(part)

    # Send via SMTP
    with smtplib.SMTP(os.getenv('SMTP_HOST', 'localhost'), int(os.getenv('SMTP_PORT', '587'))) as server:
        if os.getenv('SMTP_USER'):
            server.starttls()
            server.login(os.getenv('SMTP_USER'), os.getenv('SMTP_PASS'))
        server.send_message(msg)


def send_slack_notification(channel: str, message: str):
    """
    Send notification to Slack channel.
    """
    if webhook_url := os.getenv('SLACK_WEBHOOK_URL'):
        httpx.post(webhook_url, json={'channel': channel, 'text': message})