# Thodemy Backend

## Overview

Production-ready Express API for the Thodemy tracker app. This server validates
environment variables at startup, enforces security middleware, and exposes
modular routes.

## Environment

See `.env.example` for required variables. At minimum, you must set:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FRONTEND_ORIGIN`

## API Documentation

### Health Check

`GET /health`

Returns service health details and runtime metadata.

Response:
```json
{
  "status": "success",
  "message": "Service healthy",
  "data": {
    "status": "ok",
    "uptimeSeconds": 123,
    "timestamp": "2025-01-01T00:00:00.000Z",
    "memory": {
      "rss": 0,
      "heapTotal": 0,
      "heapUsed": 0,
      "external": 0,
      "arrayBuffers": 0
    },
    "nodeVersion": "v20.0.0"
  }
}
```

### Authenticated Profile

`GET /me`

Requires a valid Supabase JWT in the `Authorization` header.

Headers:
```
Authorization: Bearer <supabase_access_token>
```

Response:
```json
{
  "status": "success",
  "message": "Profile loaded",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com"
    },
    "profile": {
      "id": "uuid",
      "first_name": "Jane",
      "last_name": "Doe",
      "email": "user@example.com",
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-02T00:00:00.000Z"
    }
  }
}
```
