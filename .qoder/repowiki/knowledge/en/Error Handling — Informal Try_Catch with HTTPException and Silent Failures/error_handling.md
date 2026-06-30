## Overview

This repository uses an **informal, ad-hoc error handling approach** without a centralized error management system. Error handling is implemented through scattered `try/catch` blocks, FastAPI's `HTTPException`, and silent failure suppression. There are no dedicated error types, error codes registry, or global error middleware.

---

## Backend (FastAPI) Error Handling

### HTTP Exception Pattern
The REST API routers (`backend/routers/news.py`) use FastAPI's built-in `HTTPException` for error responses:

```python
except Exception as e:
    raise HTTPException(status_code=500, detail=f"News generation failed: {str(e)}")
```

- **400 errors**: Used for validation failures (e.g., missing `search_term`)
- **500 errors**: Catches all exceptions from service layer calls
- All exceptions are caught generically as `Exception` — no typed error hierarchy exists

### Service Layer Graceful Degradation
Services like `news_engine.py` and `video_fetcher.py` implement **fallback strategies** rather than propagating errors:

- `generate_news()` catches `json.JSONDecodeError` and general `Exception`, returning structured fallback data with reduced confidence scores instead of raising
- `search_video()` swallows all exceptions silently, returning default values with empty thumbnails/video IDs
- This pattern prevents crashes but masks root causes from callers

### WebSocket Error Broadcasting
The WebSocket router (`routers/ws.py`) sends structured error messages to connected clients:

```python
except Exception as e:
    await manager.broadcast_to_session(
        session_id,
        make_message("error", session_id, {"code": "PROCESSING_ERROR", "message": str(e)}),
    )
```

- Error codes used: `PROCESSING_ERROR`, `EMPTY_INPUT`, `UNKNOWN_TYPE`
- These are inline string literals — not defined in a central constants file
- The connection manager (`websocket_manager.py`) silently ignores send failures with bare `except Exception: pass`

### No Global Error Middleware
`main.py` registers only CORS middleware. There is no custom exception handler, logging middleware, or error tracking integration.

---

## Frontend (Next.js) Error Handling

### WebSocket Client
`frontend/src/lib/websocket.ts` wraps native WebSocket with callback-based error hooks:

- `onerror` callback propagated to consumers
- JSON parse errors caught and logged to console
- Auto-reconnect on connection failure (3-second delay)
- No retry limits or exponential backoff

### Speech Recognition
`MicButton.tsx` handles Web Speech API errors via `recognition.onerror`, logging to console and resetting state. Browser compatibility checked upfront with `alert()` fallback.

### No React Error Boundaries
No error boundary components found. Unhandled component errors will crash the UI tree.

---

## Sky News Planner (Next.js App Router) Error Handling

### API Route Pattern
All API routes follow a **guard-clause pattern** without try/catch:

```typescript
if (!session?.user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

- Authentication/authorization checks return early with `NextResponse.json`
- Validation errors return 400 with descriptive messages
- Database operations (Prisma) are **not wrapped in try/catch** — unhandled exceptions will produce generic 500 responses
- No centralized error response format

### Teams Notification
`lib/teams.ts` wraps webhook calls in try/catch, logging failures to console without propagation. Missing webhook URL is handled gracefully with early return.

---

## Key Conventions and Gaps

### What Exists
- Consistent use of `try/except Exception` in Python services
- HTTP status codes aligned with REST conventions (400, 401, 403, 404, 500)
- Structured error messages over WebSocket with inline error codes
- Graceful degradation in AI/video services

### What Is Missing
- **No custom error classes** — all errors are generic `Exception` or `HTTPException`
- **No error code registry** — error codes like `PROCESSING_ERROR` are scattered string literals
- **No global error handler** — FastAPI app has no `@app.exception_handler`
- **No error logging framework** — relies on bare `print`/`console.error`
- **No input validation library** — manual checks with `if not field` patterns
- **Database errors unhandled** — Prisma calls in planner API routes lack try/catch
- **No error tracking integration** — no Sentry, Datadog, or similar

---

## Developer Guidelines

1. **REST endpoints**: Use `HTTPException` with appropriate status codes. Catch specific exceptions where possible, not just `Exception`.
2. **Service functions**: Prefer returning fallback data over raising, but log the original error for debugging.
3. **WebSocket errors**: Broadcast structured error messages with a `code` and `message` field. Define error codes in a shared constants module.
4. **API routes (planner)**: Add try/catch around Prisma operations. Return consistent error response shapes.
5. **Frontend**: Add error boundaries for critical UI sections. Implement retry logic with backoff for WebSocket reconnection.
6. **Logging**: Replace bare `console.error`/`print` with a structured logging solution for production observability.
