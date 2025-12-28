# Conductor Admin UI Access Guide

## Understanding the Architecture

The Conductor Docker setup has **two separate services**:

1. **Conductor Server** (Port 8080): REST API only
2. **Nginx + UI** (Port 5000 in container, mapped to 8127 on host): Admin UI

## Accessing the Admin UI

### ✅ Correct URLs

Based on your Docker configuration:

- **Admin UI**: http://localhost:8127/
- **API Endpoint**: http://localhost:8080/api
- **Swagger UI**: http://localhost:8080/swagger-ui/index.html
- **Health Check**: http://localhost:8080/health

### ❌ Incorrect URLs

- ~~http://localhost:8080/admin~~ - This doesn't exist! The server only serves API endpoints.
- ~~http://localhost:8080/~~ - This returns 404 for static resources

## Why `/admin` Returns 404

The error message you're seeing:
```json
{
  "status": 404,
  "message": "No static resource admin.",
  "instance": "91d6e02f20df",
  "retryable": false
}
```

This happens because:
1. The Spring Boot server (port 8080) is configured to serve **only API endpoints**
2. The UI is served by **nginx on port 5000** (mapped to 8127)
3. There is no `/admin` route configured in the Spring Boot application

## Docker Port Mapping

From your `docker-compose.yaml`:
```yaml
ports:
  - 8080:8080  # API Server
  - 8127:5000  # UI (nginx)
```

## How to Access the UI

### Option 1: Use Port 8127 (Current Setup)
```bash
# Open in browser
open http://localhost:8127/
```

### Option 2: Change Port Mapping to 5000
Edit your `docker-compose.yaml`:
```yaml
ports:
  - 8080:8080
  - 5000:5000  # Change from 8127:5000 to 5000:5000
```

Then restart:
```bash
docker-compose down
docker-compose up -d
```

Now access at: http://localhost:5000/

### Option 3: Add Nginx Reverse Proxy on Port 8080

If you want the UI at `http://localhost:8080/`, you need to modify the nginx configuration to serve on port 8080 and proxy API calls to the Java server.

This requires:
1. Changing nginx to listen on port 8080
2. Moving the Java server to a different port (e.g., 8081)
3. Updating nginx to proxy `/api` to `localhost:8081/api`

## Verifying the Setup

```bash
# Check UI is accessible
curl -I http://localhost:8127/

# Check API is accessible
curl http://localhost:8080/api/metadata/workflow

# Check Swagger UI
curl -I http://localhost:8080/swagger-ui/index.html
```

## MCP Configuration

For the conductor-mcp server, use:
```json
{
  "mcpServers": {
    "conductor": {
      "command": "conductor-mcp",
      "env": {
        "CONDUCTOR_SERVER_URL": "http://localhost:8080",
        "CONDUCTOR_API_PATH": "/api"
      }
    }
  }
}
```

The MCP server connects to the **API** (port 8080), not the UI.

## Quick Reference

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| API Server | 8080 | http://localhost:8080/api | REST API |
| Admin UI | 8127 | http://localhost:8127/ | Web Interface |
| Swagger | 8080 | http://localhost:8080/swagger-ui/ | API Documentation |
| Health | 8080 | http://localhost:8080/health | Health Check |

## Troubleshooting

### UI shows blank page
- Check browser console for errors
- Verify nginx is running: `docker exec conductor-server ps aux | grep nginx`
- Check nginx logs: `docker exec conductor-server cat /var/log/nginx/error.log`

### API calls fail from UI
- Verify the nginx proxy configuration in `/etc/nginx/http.d/default.conf`
- Check that the Java server is running on port 8080

### Cannot connect to server
- Verify containers are running: `docker ps`
- Check health status: `curl http://localhost:8080/health`
- View logs: `docker logs conductor-server`

