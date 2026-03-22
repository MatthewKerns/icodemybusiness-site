"""
Content publishing and amplification automation.
Handles scheduled posts, cross-platform publishing, and performance tracking.
"""

from celery import shared_task
from celery.utils.log import get_task_logger
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from automation.monitoring.metrics_collector import track_metric
import httpx
import json
import os
import hashlib
from urllib.parse import quote

logger = get_task_logger(__name__)

# Social media platform configurations
PLATFORMS = {
    'twitter': {
        'api_url': 'https://api.twitter.com/2',
        'max_length': 280,
        'media_supported': True
    },
    'linkedin': {
        'api_url': 'https://api.linkedin.com/v2',
        'max_length': 3000,
        'media_supported': True
    },
    'facebook': {
        'api_url': 'https://graph.facebook.com/v12.0',
        'max_length': 63206,
        'media_supported': True
    },
    'instagram': {
        'api_url': 'https://graph.facebook.com/v12.0',
        'max_length': 2200,
        'media_supported': True,
        'media_required': True
    }
}


@shared_task(bind=True)
def publish_scheduled_posts(self):
    """
    Publish content scheduled for the current time window.
    """
    try:
        logger.info("Checking for scheduled posts...")

        # Get posts scheduled for publication
        response = httpx.get(
            f"{os.getenv('CONVEX_URL')}/api/content/scheduled",
            params={'window_minutes': 30},
            headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
        )

        posts = response.json()
        logger.info(f"Found {len(posts)} posts to publish")

        for post in posts:
            # Publish to each platform
            for platform in post.get('platforms', []):
                publish_to_platform.delay(post['id'], platform, post)

            # Update post status
            update_post_status(post['id'], 'publishing')

        track_metric('content.scheduled_published', len(posts))
        return {'published': len(posts)}

    except Exception as e:
        logger.error(f"Error publishing scheduled posts: {str(e)}")
        raise self.retry(exc=e)


@shared_task(bind=True, max_retries=3)
def publish_to_platform(self, post_id: str, platform: str, post_data: Dict):
    """
    Publish content to a specific platform.
    """
    try:
        logger.info(f"Publishing post {post_id} to {platform}")

        # Adapt content for platform
        adapted_content = adapt_content_for_platform(post_data, platform)

        # Publish based on platform
        if platform == 'twitter':
            result = publish_to_twitter(adapted_content)
        elif platform == 'linkedin':
            result = publish_to_linkedin(adapted_content)
        elif platform == 'facebook':
            result = publish_to_facebook(adapted_content)
        elif platform == 'instagram':
            result = publish_to_instagram(adapted_content)
        else:
            raise ValueError(f"Unsupported platform: {platform}")

        # Store publication result
        store_publication_result(post_id, platform, result)

        # Track metrics
        track_metric('content.published', 1, {'platform': platform})

        return {'platform': platform, 'success': True, 'url': result.get('url')}

    except Exception as e:
        logger.error(f"Error publishing to {platform}: {str(e)}")
        raise self.retry(exc=e)


@shared_task(bind=True)
def amplify_new_content(self):
    """
    Amplify recently published content across channels.
    """
    try:
        logger.info("Amplifying new content...")

        # Get recent high-performing content
        response = httpx.get(
            f"{os.getenv('CONVEX_URL')}/api/content/high-performing",
            params={'hours': 24},
            headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
        )

        content = response.json()
        logger.info(f"Found {len(content)} pieces for amplification")

        for item in content:
            # Create amplification strategy
            strategy = create_amplification_strategy(item)

            # Execute amplification
            for action in strategy['actions']:
                execute_amplification_action.delay(item['id'], action)

        track_metric('content.amplified', len(content))
        return {'amplified': len(content)}

    except Exception as e:
        logger.error(f"Error amplifying content: {str(e)}")
        raise


@shared_task(bind=True)
def track_content_performance(self):
    """
    Track and analyze content performance metrics.
    """
    try:
        logger.info("Tracking content performance...")

        # Get active content
        response = httpx.get(
            f"{os.getenv('CONVEX_URL')}/api/content/active",
            headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
        )

        content = response.json()

        performance_data = []

        for item in content:
            # Collect metrics from each platform
            metrics = {}

            for platform in item.get('published_platforms', []):
                platform_metrics = collect_platform_metrics(
                    platform,
                    item.get(f'{platform}_id')
                )
                metrics[platform] = platform_metrics

            # Calculate aggregate metrics
            aggregate = calculate_aggregate_metrics(metrics)

            # Store performance data
            performance_data.append({
                'content_id': item['id'],
                'timestamp': datetime.utcnow().isoformat(),
                'metrics': metrics,
                'aggregate': aggregate
            })

            # Check if content needs boosting
            if should_boost_content(aggregate):
                boost_content.delay(item['id'], aggregate)

        # Store all performance data
        store_performance_data(performance_data)

        track_metric('content.performance_tracked', len(content))
        return {'tracked': len(content)}

    except Exception as e:
        logger.error(f"Error tracking performance: {str(e)}")
        raise


@shared_task
def execute_amplification_action(content_id: str, action: Dict):
    """
    Execute a specific amplification action.
    """
    logger.info(f"Executing amplification action for {content_id}: {action['type']}")

    if action['type'] == 'reshare':
        reshare_content(content_id, action['platform'], action.get('message'))

    elif action['type'] == 'email_blast':
        send_content_email_blast(content_id, action['segment'])

    elif action['type'] == 'paid_promotion':
        create_paid_promotion(content_id, action['platform'], action['budget'])

    elif action['type'] == 'influencer_outreach':
        reach_out_to_influencers(content_id, action['influencers'])

    elif action['type'] == 'cross_post':
        cross_post_content(content_id, action['target_platforms'])

    track_metric('content.amplification_action', 1, {'type': action['type']})


@shared_task
def boost_content(content_id: str, metrics: Dict):
    """
    Boost high-performing content with paid promotion.
    """
    logger.info(f"Boosting content {content_id} based on metrics: {metrics}")

    # Determine boost strategy
    if metrics['engagement_rate'] > 0.1:  # 10% engagement
        budget = 50
    elif metrics['engagement_rate'] > 0.05:  # 5% engagement
        budget = 25
    else:
        budget = 10

    # Create promotion campaigns
    for platform in ['facebook', 'linkedin']:
        create_paid_promotion(content_id, platform, budget)

    track_metric('content.boosted', 1, {'budget': budget})


def adapt_content_for_platform(post_data: Dict, platform: str) -> Dict:
    """
    Adapt content for specific platform requirements.
    """
    config = PLATFORMS[platform]
    adapted = post_data.copy()

    # Truncate text if needed
    if len(post_data['content']) > config['max_length']:
        adapted['content'] = truncate_with_link(
            post_data['content'],
            config['max_length'],
            post_data.get('link')
        )

    # Handle media requirements
    if config.get('media_required') and not post_data.get('media'):
        # Generate media if required
        adapted['media'] = generate_default_media(post_data)

    # Add platform-specific hashtags
    adapted['hashtags'] = optimize_hashtags_for_platform(
        post_data.get('hashtags', []),
        platform
    )

    # Platform-specific formatting
    if platform == 'linkedin':
        adapted['content'] = format_for_linkedin(adapted['content'])
    elif platform == 'twitter':
        adapted['content'] = format_for_twitter(adapted['content'])

    return adapted


def publish_to_twitter(content: Dict) -> Dict:
    """
    Publish content to Twitter.
    """
    headers = {
        'Authorization': f"Bearer {os.getenv('TWITTER_BEARER_TOKEN')}",
        'Content-Type': 'application/json'
    }

    # Prepare tweet data
    tweet_data = {
        'text': content['content']
    }

    # Add media if present
    if content.get('media'):
        media_ids = upload_twitter_media(content['media'])
        tweet_data['media'] = {'media_ids': media_ids}

    response = httpx.post(
        f"{PLATFORMS['twitter']['api_url']}/tweets",
        headers=headers,
        json=tweet_data
    )

    if response.status_code != 201:
        raise Exception(f"Twitter API error: {response.text}")

    result = response.json()
    return {
        'platform_id': result['data']['id'],
        'url': f"https://twitter.com/user/status/{result['data']['id']}",
        'published_at': datetime.utcnow().isoformat()
    }


def publish_to_linkedin(content: Dict) -> Dict:
    """
    Publish content to LinkedIn.
    """
    headers = {
        'Authorization': f"Bearer {os.getenv('LINKEDIN_ACCESS_TOKEN')}",
        'Content-Type': 'application/json'
    }

    # Get author URN
    author_urn = os.getenv('LINKEDIN_AUTHOR_URN')

    # Prepare share data
    share_data = {
        'author': author_urn,
        'lifecycleState': 'PUBLISHED',
        'specificContent': {
            'com.linkedin.ugc.ShareContent': {
                'shareCommentary': {
                    'text': content['content']
                },
                'shareMediaCategory': 'NONE'
            }
        },
        'visibility': {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
    }

    # Add media if present
    if content.get('media'):
        media_asset = upload_linkedin_media(content['media'])
        share_data['specificContent']['com.linkedin.ugc.ShareContent']['media'] = [media_asset]
        share_data['specificContent']['com.linkedin.ugc.ShareContent']['shareMediaCategory'] = 'IMAGE'

    response = httpx.post(
        f"{PLATFORMS['linkedin']['api_url']}/ugcPosts",
        headers=headers,
        json=share_data
    )

    if response.status_code != 201:
        raise Exception(f"LinkedIn API error: {response.text}")

    result = response.json()
    return {
        'platform_id': result['id'],
        'url': f"https://www.linkedin.com/feed/update/{result['id']}",
        'published_at': datetime.utcnow().isoformat()
    }


def publish_to_facebook(content: Dict) -> Dict:
    """
    Publish content to Facebook.
    """
    page_id = os.getenv('FACEBOOK_PAGE_ID')
    access_token = os.getenv('FACEBOOK_ACCESS_TOKEN')

    # Prepare post data
    post_data = {
        'message': content['content'],
        'access_token': access_token
    }

    # Add link if present
    if content.get('link'):
        post_data['link'] = content['link']

    # Add media if present
    if content.get('media'):
        post_data['picture'] = content['media'][0]['url']

    response = httpx.post(
        f"{PLATFORMS['facebook']['api_url']}/{page_id}/feed",
        data=post_data
    )

    if response.status_code != 200:
        raise Exception(f"Facebook API error: {response.text}")

    result = response.json()
    return {
        'platform_id': result['id'],
        'url': f"https://www.facebook.com/{result['id']}",
        'published_at': datetime.utcnow().isoformat()
    }


def publish_to_instagram(content: Dict) -> Dict:
    """
    Publish content to Instagram (via Facebook Graph API).
    """
    ig_user_id = os.getenv('INSTAGRAM_BUSINESS_ACCOUNT_ID')
    access_token = os.getenv('FACEBOOK_ACCESS_TOKEN')

    # Instagram requires media
    if not content.get('media'):
        raise ValueError("Instagram requires media content")

    # Create media container
    container_data = {
        'image_url': content['media'][0]['url'],
        'caption': content['content'],
        'access_token': access_token
    }

    # Create container
    response = httpx.post(
        f"{PLATFORMS['instagram']['api_url']}/{ig_user_id}/media",
        data=container_data
    )

    if response.status_code != 200:
        raise Exception(f"Instagram API error: {response.text}")

    container = response.json()

    # Publish container
    publish_response = httpx.post(
        f"{PLATFORMS['instagram']['api_url']}/{ig_user_id}/media_publish",
        data={
            'creation_id': container['id'],
            'access_token': access_token
        }
    )

    if publish_response.status_code != 200:
        raise Exception(f"Instagram publish error: {publish_response.text}")

    result = publish_response.json()
    return {
        'platform_id': result['id'],
        'url': f"https://www.instagram.com/p/{result['id']}",
        'published_at': datetime.utcnow().isoformat()
    }


def collect_platform_metrics(platform: str, post_id: str) -> Dict:
    """
    Collect metrics for a post from a specific platform.
    """
    metrics = {}

    if platform == 'twitter':
        metrics = get_twitter_metrics(post_id)
    elif platform == 'linkedin':
        metrics = get_linkedin_metrics(post_id)
    elif platform == 'facebook':
        metrics = get_facebook_metrics(post_id)
    elif platform == 'instagram':
        metrics = get_instagram_metrics(post_id)

    return metrics


def get_twitter_metrics(tweet_id: str) -> Dict:
    """
    Get metrics for a Twitter post.
    """
    headers = {
        'Authorization': f"Bearer {os.getenv('TWITTER_BEARER_TOKEN')}"
    }

    response = httpx.get(
        f"{PLATFORMS['twitter']['api_url']}/tweets/{tweet_id}",
        params={'tweet.fields': 'public_metrics'},
        headers=headers
    )

    if response.status_code == 200:
        data = response.json()['data']
        return data.get('public_metrics', {})

    return {}


def get_linkedin_metrics(post_id: str) -> Dict:
    """
    Get metrics for a LinkedIn post.
    """
    headers = {
        'Authorization': f"Bearer {os.getenv('LINKEDIN_ACCESS_TOKEN')}"
    }

    response = httpx.get(
        f"{PLATFORMS['linkedin']['api_url']}/socialActions/{post_id}",
        headers=headers
    )

    if response.status_code == 200:
        data = response.json()
        return {
            'likes': data.get('likesSummary', {}).get('totalLikes', 0),
            'comments': data.get('commentsSummary', {}).get('totalComments', 0),
            'shares': data.get('sharesSummary', {}).get('totalShares', 0)
        }

    return {}


def get_facebook_metrics(post_id: str) -> Dict:
    """
    Get metrics for a Facebook post.
    """
    access_token = os.getenv('FACEBOOK_ACCESS_TOKEN')

    response = httpx.get(
        f"{PLATFORMS['facebook']['api_url']}/{post_id}/insights",
        params={
            'metric': 'post_impressions,post_engaged_users,post_reactions_by_type_total',
            'access_token': access_token
        }
    )

    if response.status_code == 200:
        data = response.json()['data']
        metrics = {}
        for metric in data:
            metrics[metric['name']] = metric['values'][0]['value']
        return metrics

    return {}


def get_instagram_metrics(post_id: str) -> Dict:
    """
    Get metrics for an Instagram post.
    """
    access_token = os.getenv('FACEBOOK_ACCESS_TOKEN')

    response = httpx.get(
        f"{PLATFORMS['instagram']['api_url']}/{post_id}/insights",
        params={
            'metric': 'impressions,reach,engagement',
            'access_token': access_token
        }
    )

    if response.status_code == 200:
        data = response.json()['data']
        metrics = {}
        for metric in data:
            metrics[metric['name']] = metric['values'][0]['value']
        return metrics

    return {}


def calculate_aggregate_metrics(platform_metrics: Dict) -> Dict:
    """
    Calculate aggregate metrics across platforms.
    """
    total_impressions = 0
    total_engagement = 0

    for platform, metrics in platform_metrics.items():
        if platform == 'twitter':
            total_impressions += metrics.get('impression_count', 0)
            total_engagement += sum([
                metrics.get('like_count', 0),
                metrics.get('retweet_count', 0),
                metrics.get('reply_count', 0)
            ])
        elif platform == 'linkedin':
            total_impressions += metrics.get('impressions', 0)
            total_engagement += sum([
                metrics.get('likes', 0),
                metrics.get('comments', 0),
                metrics.get('shares', 0)
            ])
        elif platform in ['facebook', 'instagram']:
            total_impressions += metrics.get('impressions', 0)
            total_engagement += metrics.get('engagement', 0)

    engagement_rate = total_engagement / total_impressions if total_impressions > 0 else 0

    return {
        'total_impressions': total_impressions,
        'total_engagement': total_engagement,
        'engagement_rate': engagement_rate,
        'platform_count': len(platform_metrics)
    }


def should_boost_content(metrics: Dict) -> bool:
    """
    Determine if content should be boosted with paid promotion.
    """
    # Boost if engagement rate > 5% and impressions > 1000
    return (
        metrics.get('engagement_rate', 0) > 0.05 and
        metrics.get('total_impressions', 0) > 1000
    )


def create_amplification_strategy(content: Dict) -> Dict:
    """
    Create amplification strategy for high-performing content.
    """
    strategy = {'actions': []}

    performance = content.get('performance', {})

    # High engagement - reshare
    if performance.get('engagement_rate', 0) > 0.1:
        strategy['actions'].append({
            'type': 'reshare',
            'platform': 'twitter',
            'message': 'ICYMI: Our most popular post this week!'
        })

    # Good performance - email blast
    if performance.get('total_impressions', 0) > 5000:
        strategy['actions'].append({
            'type': 'email_blast',
            'segment': 'subscribers'
        })

    # Viral potential - paid promotion
    if performance.get('share_rate', 0) > 0.2:
        strategy['actions'].append({
            'type': 'paid_promotion',
            'platform': 'facebook',
            'budget': 100
        })

    # Always cross-post successful content
    strategy['actions'].append({
        'type': 'cross_post',
        'target_platforms': ['linkedin', 'facebook']
    })

    return strategy


def create_paid_promotion(content_id: str, platform: str, budget: float):
    """
    Create paid promotion campaign for content.
    """
    logger.info(f"Creating ${budget} promotion for {content_id} on {platform}")

    # Implementation would integrate with platform ad APIs
    # For now, log the action
    httpx.post(
        f"{os.getenv('CONVEX_URL')}/api/content/{content_id}/promotions",
        json={
            'platform': platform,
            'budget': budget,
            'created_at': datetime.utcnow().isoformat()
        },
        headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
    )


def truncate_with_link(text: str, max_length: int, link: Optional[str]) -> str:
    """
    Truncate text and append link if provided.
    """
    if link:
        link_text = f"\n\nRead more: {link}"
        available_length = max_length - len(link_text) - 3  # for "..."
        return text[:available_length] + "..." + link_text
    else:
        return text[:max_length - 3] + "..." if len(text) > max_length else text


def optimize_hashtags_for_platform(hashtags: List[str], platform: str) -> List[str]:
    """
    Optimize hashtags for specific platform.
    """
    if platform == 'twitter':
        # Twitter: 2-3 hashtags max
        return hashtags[:3]
    elif platform == 'linkedin':
        # LinkedIn: 3-5 professional hashtags
        return hashtags[:5]
    elif platform == 'instagram':
        # Instagram: up to 30 hashtags
        return hashtags[:30]
    else:
        return hashtags[:5]


def format_for_linkedin(content: str) -> str:
    """
    Format content for LinkedIn (professional tone).
    """
    # Add professional formatting
    lines = content.split('\n')
    formatted = []

    for line in lines:
        if line.startswith('•'):
            formatted.append(f"→ {line[1:].strip()}")
        else:
            formatted.append(line)

    return '\n'.join(formatted)


def format_for_twitter(content: str) -> str:
    """
    Format content for Twitter (concise).
    """
    # Convert bullets to emoji
    content = content.replace('•', '🔹')
    # Remove extra whitespace
    content = ' '.join(content.split())
    return content


def update_post_status(post_id: str, status: str):
    """
    Update post status in database.
    """
    httpx.patch(
        f"{os.getenv('CONVEX_URL')}/api/content/{post_id}",
        json={'status': status, 'updated_at': datetime.utcnow().isoformat()},
        headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
    )


def store_publication_result(post_id: str, platform: str, result: Dict):
    """
    Store publication result.
    """
    httpx.post(
        f"{os.getenv('CONVEX_URL')}/api/content/{post_id}/publications",
        json={
            'platform': platform,
            'result': result,
            'published_at': datetime.utcnow().isoformat()
        },
        headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
    )


def store_performance_data(data: List[Dict]):
    """
    Store content performance data.
    """
    httpx.post(
        f"{os.getenv('CONVEX_URL')}/api/content/performance/batch",
        json={'data': data},
        headers={'Authorization': f"Bearer {os.getenv('CONVEX_TOKEN')}"}
    )