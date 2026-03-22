# Client Portal Backend

Real-time client portal backend for ICodeMyBusiness with WebSocket support, authentication, and comprehensive API.

## Features

- **Authentication**: Clerk integration with JWT tokens
- **Role-Based Access Control**: Client, Client Admin, Admin, Super Admin roles
- **Real-time Updates**: WebSocket notifications and live data streaming
- **Project Management**: View projects, metrics, milestones, and documents
- **Work Requests**: Submit and track feature requests, bugs, and support tickets
- **Document Management**: Secure file access with version control
- **API Security**: Permission-based endpoint access

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. Run the server:
```bash
python main.py
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with Clerk session
- `GET /api/auth/me` - Get current user info
- `GET /api/auth/permissions` - Get user permissions
- `POST /api/auth/refresh` - Refresh access token

### Projects
- `GET /api/projects/` - List accessible projects
- `GET /api/projects/{id}` - Get project details
- `GET /api/projects/{id}/updates` - Get project updates
- `GET /api/projects/{id}/documents` - Get project documents
- `GET /api/projects/{id}/metrics` - Get project metrics
- `GET /api/projects/{id}/milestones` - Get project milestones

### Work Requests
- `POST /api/requests/` - Create work request
- `GET /api/requests/` - List work requests
- `GET /api/requests/{id}` - Get request details
- `PUT /api/requests/{id}` - Update request
- `POST /api/requests/{id}/status` - Update request status
- `POST /api/requests/{id}/comments` - Add comment
- `POST /api/requests/{id}/attachments` - Upload attachment

### Documents
- `POST /api/documents/upload` - Upload document
- `GET /api/documents/` - List documents
- `GET /api/documents/{id}` - Get document metadata
- `GET /api/documents/{id}/download` - Download document
- `PUT /api/documents/{id}` - Update document
- `POST /api/documents/{id}/share` - Share document
- `POST /api/documents/{id}/version` - Upload new version

## WebSocket

Connect to `/ws?token={jwt_token}` for real-time updates.

### Message Types
- `connection` - Connection established
- `notification` - System notifications
- `live_update` - Real-time data updates
- `activity_feed` - Team activity
- `milestone_update` - Milestone changes
- `task_progress` - Task progress updates

## Testing

Run tests:
```bash
pytest tests/
```

Test coverage:
```bash
pytest --cov=. tests/
```

## Architecture

```
portal_backend/
├── api/
│   ├── auth.py              # Authentication & authorization
│   ├── projects.py          # Project management
│   ├── requests.py          # Work request handling
│   └── documents.py         # Document management
├── websocket/
│   ├── notifications.py     # Real-time notifications
│   └── updates.py          # Live data streaming
├── tests/
│   ├── test_portal_api.py  # API endpoint tests
│   └── test_permissions.py # Access control tests
├── main.py                  # Application entry point
└── config.py               # Configuration settings
```

## Security Features

- JWT token authentication
- Role-based permissions
- Document access control
- Request validation
- CORS configuration
- Secure file handling

## Real-time Features

- Project metric streaming
- Live activity feed
- Instant notifications
- Milestone updates
- Task progress tracking
- Budget alerts

## Deployment

For production deployment:

1. Set secure environment variables
2. Use production database (Convex)
3. Configure S3 for document storage
4. Set up Redis for caching
5. Use proper SSL certificates
6. Configure load balancing
7. Set up monitoring and logging