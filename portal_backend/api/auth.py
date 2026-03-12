"""Client authentication with Clerk integration and role-based access control."""
from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import httpx
import jwt
from datetime import datetime, timedelta
from passlib.context import CryptContext
import json

from ..config import settings


router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserInfo(BaseModel):
    """User information from Clerk."""
    user_id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    organization_id: Optional[str] = None
    role: str = "client"
    permissions: List[str] = []


class TokenResponse(BaseModel):
    """Authentication token response."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int = settings.access_token_expire_minutes * 60
    user: UserInfo


class LoginRequest(BaseModel):
    """Login request with Clerk session token."""
    clerk_session_token: str


class Permission:
    """Permission constants for role-based access control."""
    VIEW_OWN_PROJECTS = "view_own_projects"
    VIEW_ALL_PROJECTS = "view_all_projects"
    CREATE_REQUEST = "create_request"
    VIEW_DOCUMENTS = "view_documents"
    MANAGE_PROJECTS = "manage_projects"
    ADMIN_ACCESS = "admin_access"


# Role-permission mapping
ROLE_PERMISSIONS = {
    "client": [
        Permission.VIEW_OWN_PROJECTS,
        Permission.CREATE_REQUEST,
        Permission.VIEW_DOCUMENTS,
    ],
    "client_admin": [
        Permission.VIEW_OWN_PROJECTS,
        Permission.CREATE_REQUEST,
        Permission.VIEW_DOCUMENTS,
        Permission.MANAGE_PROJECTS,
    ],
    "admin": [
        Permission.VIEW_ALL_PROJECTS,
        Permission.CREATE_REQUEST,
        Permission.VIEW_DOCUMENTS,
        Permission.MANAGE_PROJECTS,
        Permission.ADMIN_ACCESS,
    ],
    "super_admin": [
        Permission.VIEW_ALL_PROJECTS,
        Permission.CREATE_REQUEST,
        Permission.VIEW_DOCUMENTS,
        Permission.MANAGE_PROJECTS,
        Permission.ADMIN_ACCESS,
    ],
}


async def verify_clerk_session(session_token: str) -> Dict[str, Any]:
    """Verify Clerk session token and get user info."""
    try:
        # Verify with Clerk API
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {settings.clerk_secret_key}",
                "Content-Type": "application/json"
            }

            # Verify session
            response = await client.post(
                f"https://api.clerk.com/v1/sessions/{session_token}/verify",
                headers=headers
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid session token"
                )

            session_data = response.json()
            user_id = session_data.get("user_id")

            # Get user details
            user_response = await client.get(
                f"https://api.clerk.com/v1/users/{user_id}",
                headers=headers
            )

            if user_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Could not retrieve user information"
                )

            return user_response.json()

    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Authentication service unavailable: {str(e)}"
        )


def create_access_token(user_info: UserInfo) -> str:
    """Create JWT access token for authenticated user."""
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)

    to_encode = {
        "sub": user_info.user_id,
        "email": user_info.email,
        "organization_id": user_info.organization_id,
        "role": user_info.role,
        "permissions": user_info.permissions,
        "exp": expire
    }

    encoded_jwt = jwt.encode(
        to_encode,
        settings.secret_key,
        algorithm=settings.algorithm
    )

    return encoded_jwt


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> UserInfo:
    """Get current authenticated user from JWT token."""
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm]
        )

        user_info = UserInfo(
            user_id=payload["sub"],
            email=payload.get("email", ""),
            organization_id=payload.get("organization_id"),
            role=payload.get("role", "client"),
            permissions=payload.get("permissions", [])
        )

        return user_info

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def check_permission(permission: str):
    """Dependency to check if user has specific permission."""
    async def permission_checker(current_user: UserInfo = Depends(get_current_user)):
        if permission not in current_user.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission} required"
            )
        return current_user
    return permission_checker


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """Authenticate client with Clerk session token."""
    # Verify Clerk session
    clerk_user = await verify_clerk_session(request.clerk_session_token)

    # Extract user information
    user_metadata = clerk_user.get("public_metadata", {})

    user_info = UserInfo(
        user_id=clerk_user["id"],
        email=clerk_user.get("email_addresses", [{}])[0].get("email_address", ""),
        first_name=clerk_user.get("first_name"),
        last_name=clerk_user.get("last_name"),
        organization_id=user_metadata.get("organization_id"),
        role=user_metadata.get("role", "client"),
        permissions=ROLE_PERMISSIONS.get(user_metadata.get("role", "client"), [])
    )

    # Create access token
    access_token = create_access_token(user_info)

    return TokenResponse(
        access_token=access_token,
        user=user_info
    )


@router.get("/me", response_model=UserInfo)
async def get_me(current_user: UserInfo = Depends(get_current_user)):
    """Get current user information."""
    return current_user


@router.post("/refresh")
async def refresh_token(current_user: UserInfo = Depends(get_current_user)):
    """Refresh authentication token."""
    # Create new token with updated expiration
    access_token = create_access_token(current_user)

    return TokenResponse(
        access_token=access_token,
        user=current_user
    )


@router.get("/permissions")
async def get_permissions(current_user: UserInfo = Depends(get_current_user)):
    """Get current user's permissions."""
    return {
        "user_id": current_user.user_id,
        "role": current_user.role,
        "permissions": current_user.permissions
    }


@router.post("/logout")
async def logout(current_user: UserInfo = Depends(get_current_user)):
    """Logout user (client-side should remove token)."""
    # In a production environment, you might want to invalidate the token
    # by adding it to a blacklist in Redis
    return {"message": "Logged out successfully"}