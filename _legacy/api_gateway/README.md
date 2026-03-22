# ICMB FastAPI Gateway

FastAPI-based API gateway providing Agent-OS compatible endpoints with Convex backend integration.

## Features

- ✅ **Agent-OS Compatible**: Full compatibility with Agent-OS API contracts
- ✅ **FastAPI Framework**: Modern, fast, and type-safe Python web framework
- ✅ **Convex Integration**: HTTP client for Convex backend operations
- ✅ **TDD Approach**: Comprehensive test suite with 90%+ coverage target
- ✅ **Real-time Support**: WebSocket capabilities for live updates
- ✅ **Auto Documentation**: Interactive API docs at `/api-docs`

## Quick Start

### 1. Install Dependencies

```bash
cd api_gateway
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your Convex URL and other configurations
```

### 3. Run Tests

```bash
# Run all tests with coverage
pytest

# Run specific test categories
pytest -m unit        # Unit tests only
pytest -m integration # Integration tests only

# Generate coverage report
pytest --cov-report=html
open htmlcov/index.html
```

### 4. Start the Server

```bash
# Development mode (with auto-reload)
python main.py

# Production mode
uvicorn main:app --host 0.0.0.0 --port 3004
```

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Client Management
- `GET /api/clients` - List all clients
- `GET /api/clients/{id}` - Get specific client
- `POST /api/clients/{id}/sync` - Trigger client sync

### Project Management
- `GET /api/projects` - List all projects with filtering
- `GET /api/projects/{id}` - Get specific project

### Deliverables
- `GET /api/deliverables` - List deliverables
- `GET /api/deliverables/{id}` - Get specific deliverable

### Agent-OS Briefings
- `GET /api/briefings/daily` - Daily briefing for Agent-OS
- `GET /api/briefings/weekly` - Weekly summary

### Communications
- `GET /api/communications` - List messages with AI suggestions
- `GET /api/communications/{id}` - Get specific message
- `POST /api/communications/{id}/mark-read` - Mark as read

### Business Metrics
- `GET /api/metrics` - Comprehensive business metrics
- `GET /api/metrics/revenue` - Revenue-specific metrics
- `GET /api/metrics/performance` - Performance metrics
- `GET /api/metrics/dashboard` - Dashboard KPIs

## Project Structure

```
api_gateway/
├── main.py                    # FastAPI application entry point
├── routers/
│   ├── clients.py            # Client management endpoints
│   ├── projects.py           # Project management endpoints
│   ├── deliverables.py       # Deliverables tracking
│   ├── briefings.py          # Agent-OS briefings
│   ├── communications.py     # Messaging endpoints
│   └── metrics.py            # Business metrics
├── services/
│   └── convex_client.py     # Convex HTTP client adapter
├── tests/
│   ├── test_api_contracts.py # Agent-OS compatibility tests
│   └── test_endpoints.py     # Comprehensive endpoint tests
├── requirements.txt          # Python dependencies
├── pytest.ini               # Test configuration
└── .env.example             # Environment template
```

## Testing Strategy

Following TDD principles, tests are written first before implementation:

1. **Unit Tests**: Test individual functions and transformations
2. **Integration Tests**: Test API endpoints with mocked Convex
3. **Contract Tests**: Ensure Agent-OS compatibility
4. **Coverage Target**: 90%+ code coverage

### Running Tests

```bash
# Basic test run
pytest

# With coverage report
pytest --cov

# Verbose output
pytest -v

# Watch mode (requires pytest-watch)
pip install pytest-watch
ptw
```

## Development Workflow

1. **Write failing test** for new feature
2. **Implement minimal code** to pass test
3. **Refactor** while keeping tests green
4. **Document** changes for blog content

## API Documentation

Interactive documentation available at:
- Swagger UI: `http://localhost:3004/api-docs`
- ReDoc: `http://localhost:3004/redoc`
- OpenAPI JSON: `http://localhost:3004/openapi.json`

## Convex Integration

The gateway uses HTTP API to communicate with Convex:

```python
from services.convex_client import get_convex_client

client = get_convex_client()

# Query data
result = await client.query("clients:list", {"status": "active"})

# Mutate data
result = await client.mutate("clients:create", {...})

# Execute actions
result = await client.action("notifications:send", {...})
```

## Mock Mode

When `CONVEX_URL` is not configured, the API runs in mock mode:
- Returns sample data for all endpoints
- Useful for development and testing
- Maintains Agent-OS contract compliance

## Performance

- **Async/Await**: All I/O operations are asynchronous
- **Connection Pooling**: Efficient HTTP client connections
- **Response Caching**: Configurable cache headers
- **Rate Limiting**: Optional rate limiting per API key

## Deployment

### Docker

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3004"]
```

### PM2

```bash
pm2 start "uvicorn main:app --port 3004" --name icmb-api
```

### Systemd

```ini
[Unit]
Description=ICMB FastAPI Gateway
After=network.target

[Service]
Type=exec
User=www-data
WorkingDirectory=/path/to/api_gateway
Environment="PATH=/usr/local/bin"
ExecStart=/usr/local/bin/uvicorn main:app --host 0.0.0.0 --port 3004
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

## Monitoring

- Request IDs for tracing
- Structured logging with levels
- Performance metrics per endpoint
- Health check endpoint for monitoring

## Security

- CORS configuration for allowed origins
- Optional API key authentication
- Environment-based configuration
- No hardcoded credentials

## Contributing

1. Write tests first (TDD)
2. Ensure 90%+ coverage
3. Follow Python style guide (PEP 8)
4. Document API changes
5. Update blog content examples

## License

Proprietary - iCodeMyBusiness

## Support

For issues or questions, check the implementation guide or contact the development team.