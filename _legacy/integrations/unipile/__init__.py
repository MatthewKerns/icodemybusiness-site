"""
Unipile integration for multi-channel messaging
"""

from .email_sync import UnipileEmailSync
from .message_processor import UnipileMessageProcessor

__all__ = [
    "UnipileEmailSync",
    "UnipileMessageProcessor"
]