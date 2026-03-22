"""
Content generation using Claude API for marketing automation
"""

import logging
from typing import Dict, Any, List, Optional
import anthropic

from ..config import config

logger = logging.getLogger(__name__)


class ClaudeContentGenerator:
    """Generate marketing content using Claude API"""

    def __init__(self):
        self.client = anthropic.Anthropic(api_key=config.anthropic_api_key)
        self.model = config.claude_model

    async def generate_email(
        self,
        lead_data: Dict[str, Any],
        template_type: str = "cold_outreach"
    ) -> str:
        """
        Generate personalized email content

        Args:
            lead_data: Information about the lead
            template_type: Type of email template

        Returns:
            Generated email content
        """
        templates = {
            "cold_outreach": self._cold_outreach_prompt,
            "follow_up": self._follow_up_prompt,
            "proposal": self._proposal_prompt,
            "nurture": self._nurture_prompt
        }

        prompt_builder = templates.get(template_type, self._cold_outreach_prompt)
        prompt = prompt_builder(lead_data)

        return await self._generate_with_claude(prompt)

    def _cold_outreach_prompt(self, lead_data: Dict[str, Any]) -> str:
        """Build cold outreach email prompt"""
        return f"""
        Write a personalized cold outreach email for:
        - Name: {lead_data.get('name', 'there')}
        - Company: {lead_data.get('company', 'your company')}
        - Industry: {lead_data.get('industry', 'your industry')}
        - Pain Points: {', '.join(lead_data.get('pain_points', ['growth', 'efficiency']))}

        The email should:
        1. Start with a personalized opening
        2. Identify a specific pain point
        3. Briefly mention how we can help
        4. Include a soft CTA for a brief call
        5. Be under 150 words
        6. Sound natural and conversational

        Do not use overly salesy language or buzzwords.
        """

    def _follow_up_prompt(self, lead_data: Dict[str, Any]) -> str:
        """Build follow-up email prompt"""
        return f"""
        Write a follow-up email for {lead_data.get('name')} from {lead_data.get('company')}.

        Context: {lead_data.get('previous_interaction', 'Initial email sent 3 days ago')}

        The email should:
        1. Reference previous interaction naturally
        2. Provide additional value (tip, resource, or insight)
        3. Keep it brief (under 100 words)
        4. Include a question to encourage response
        """

    def _proposal_prompt(self, lead_data: Dict[str, Any]) -> str:
        """Build proposal email prompt"""
        return f"""
        Write a proposal introduction email for {lead_data.get('name')} at {lead_data.get('company')}.

        Project: {lead_data.get('project_type', 'Digital transformation')}
        Budget Range: {lead_data.get('budget_range', 'Not specified')}

        The email should:
        1. Thank them for the discussion
        2. Summarize key points from our conversation
        3. Introduce the attached proposal
        4. Highlight 2-3 key benefits
        5. Set clear next steps
        """

    def _nurture_prompt(self, lead_data: Dict[str, Any]) -> str:
        """Build nurture email prompt"""
        return f"""
        Write a nurture email providing value to {lead_data.get('name')}.

        Topic: {lead_data.get('interest_area', 'Business automation')}

        Share one actionable tip or insight that demonstrates expertise.
        Keep it valuable but brief (under 150 words).
        End with a soft offer to help if needed.
        """

    async def _generate_with_claude(self, prompt: str) -> str:
        """Call Claude API to generate content"""
        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=500,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )

            return message.content[0].text

        except Exception as e:
            logger.error(f"Claude generation error: {e}")
            raise

    async def generate_linkedin_message(
        self,
        context: Dict[str, Any]
    ) -> str:
        """
        Generate LinkedIn outreach message

        Args:
            context: Profile and connection context

        Returns:
            LinkedIn message (under 300 chars)
        """
        prompt = f"""
        Write a brief LinkedIn connection message.

        Context:
        - Profile: {context.get('profile_url', '')}
        - Mutual connections: {context.get('mutual_connections', 0)}
        - Recent activity: {context.get('recent_post', 'No recent posts')}

        Requirements:
        - Under 300 characters
        - Reference something specific from their profile
        - Natural and professional
        - End with value proposition, not ask
        """

        content = await self._generate_with_claude(prompt)

        # Ensure it's under 300 chars
        if len(content) > 300:
            content = content[:297] + "..."

        return content

    async def generate_proposal_outline(
        self,
        project_details: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate proposal outline structure

        Args:
            project_details: Project requirements and details

        Returns:
            Structured proposal outline
        """
        prompt = f"""
        Create a proposal outline for:
        - Client: {project_details.get('client')}
        - Project: {project_details.get('project_type')}
        - Budget: {project_details.get('budget_range')}
        - Timeline: {project_details.get('timeline')}
        - Requirements: {', '.join(project_details.get('requirements', []))}

        Return as JSON with sections:
        - executive_summary (2-3 sentences)
        - scope (list of deliverables)
        - timeline (phases with durations)
        - investment (price recommendation)
        - success_metrics (3-5 KPIs)
        """

        response = await self._generate_with_claude(prompt)

        # Parse JSON response
        import json
        import re

        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                logger.error("Failed to parse proposal JSON")

        # Fallback structure
        return {
            "executive_summary": response[:200],
            "scope": ["Deliverable 1", "Deliverable 2"],
            "timeline": project_details.get('timeline'),
            "investment": project_details.get('budget_range')
        }

    def _get_tone_and_style(self, lead_data: Dict[str, Any]) -> Dict[str, str]:
        """
        Determine appropriate tone based on lead characteristics

        Args:
            lead_data: Lead information

        Returns:
            Tone and style guidelines
        """
        company_size = lead_data.get('company_size', '')

        if 'enterprise' in lead_data.get('industry', '').lower() or '5000+' in company_size:
            return {
                "tone": "formal-professional",
                "style": "executive-brief"
            }
        elif 'startup' in lead_data.get('industry', '').lower() or '10-50' in company_size:
            return {
                "tone": "casual-professional",
                "style": "conversational"
            }
        else:
            return {
                "tone": "balanced-professional",
                "style": "informative"
            }

    async def batch_generate_emails(
        self,
        leads: List[Dict[str, Any]],
        template_type: str = "cold_outreach"
    ) -> List[Dict[str, Any]]:
        """
        Generate emails for multiple leads

        Args:
            leads: List of lead data
            template_type: Email template type

        Returns:
            List of generated emails with lead IDs
        """
        results = []

        for lead in leads:
            try:
                content = await self.generate_email(lead, template_type)
                results.append({
                    "lead_id": lead.get('id'),
                    "lead_name": lead.get('name'),
                    "content": content,
                    "template_type": template_type
                })
            except Exception as e:
                logger.error(f"Failed to generate email for {lead.get('name')}: {e}")
                results.append({
                    "lead_id": lead.get('id'),
                    "error": str(e)
                })

        return results

    async def generate_social_posts(
        self,
        topic: str,
        platforms: List[str] = ["linkedin", "twitter"]
    ) -> Dict[str, str]:
        """
        Generate social media posts for multiple platforms

        Args:
            topic: Content topic
            platforms: Target platforms

        Returns:
            Platform-specific posts
        """
        posts = {}

        for platform in platforms:
            if platform == "linkedin":
                prompt = f"Write a LinkedIn post about {topic}. Professional tone, 200-300 words, include relevant hashtags."
            elif platform == "twitter":
                prompt = f"Write a Twitter thread (3 tweets) about {topic}. Concise, engaging, under 280 chars each."
            else:
                continue

            posts[platform] = await self._generate_with_claude(prompt)

        return posts