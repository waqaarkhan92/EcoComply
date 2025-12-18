# Calendar Integration Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      EcoComply Platform                          │
│                                                                  │
│  ┌────────────────┐         ┌──────────────────┐               │
│  │  Web UI        │────────▶│  API Routes      │               │
│  │  (Settings)    │         │  /api/v1/        │               │
│  └────────────────┘         │  integrations/   │               │
│         │                   │  calendar/*      │               │
│         │                   └────────┬─────────┘               │
│         │                            │                          │
│         ▼                            ▼                          │
│  ┌────────────────────────────────────────────┐                │
│  │     Calendar Integration Layer             │                │
│  │                                            │                │
│  │  ┌──────────────┐  ┌──────────────┐      │                │
│  │  │   Google     │  │   Outlook    │      │                │
│  │  │   Calendar   │  │   Calendar   │      │                │
│  │  │   Client     │  │   Client     │      │                │
│  │  └──────┬───────┘  └──────┬───────┘      │                │
│  │         │                  │              │                │
│  │         └─────────┬────────┘              │                │
│  │                   ▼                       │                │
│  │         ┌──────────────────┐             │                │
│  │         │  Calendar Sync   │             │                │
│  │         │     Service      │             │                │
│  │         └────────┬─────────┘             │                │
│  └──────────────────┼───────────────────────┘                │
│                     │                                          │
│         ┌───────────┴──────────┐                              │
│         ▼                      ▼                              │
│  ┌─────────────┐      ┌──────────────┐                       │
│  │  Supabase   │      │  Obligation  │                       │
│  │  Database   │      │  Management  │                       │
│  └─────────────┘      └──────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
         │                      │
         │                      │
         ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│  Google         │    │  Microsoft      │
│  Calendar API   │    │  Graph API      │
└─────────────────┘    └─────────────────┘
```

## Component Architecture

### 1. User Interface Layer

```
Settings Page
    │
    ├─── General Tab
    ├─── Calendar Tab ───┐
    │                    │
    │                    ├─── OAuth Calendar Integration (NEW)
    │                    │    │
    │                    │    ├─── Google Calendar Card
    │                    │    │    ├─── Connect Button
    │                    │    │    ├─── Calendar Selector
    │                    │    │    ├─── Auto-sync Toggle
    │                    │    │    └─── Disconnect Button
    │                    │    │
    │                    │    └─── Outlook Calendar Card
    │                    │         ├─── Connect Button
    │                    │         ├─── Calendar Selector
    │                    │         ├─── Auto-sync Toggle
    │                    │         └─── Disconnect Button
    │                    │
    │                    └─── iCal Feeds (EXISTING)
    │                         ├─── Token Management
    │                         └─── Feed URLs
    │
    ├─── Webhooks Tab
    ├─── Notifications Tab
    └─── API Keys Tab
```

### 2. API Route Structure

```
/api/v1/integrations/calendar/
    │
    ├─── /authorize (GET)
    │    └─── Initiates OAuth flow
    │
    ├─── /callback (GET)
    │    └─── Handles OAuth redirect
    │
    ├─── /status (GET, PATCH)
    │    ├─── GET: Fetch integration status
    │    └─── PATCH: Update settings
    │
    ├─── /sync (POST)
    │    └─── Manual sync trigger
    │
    └─── / (DELETE)
         └─── Disconnect integration
```

### 3. Data Flow

#### OAuth Connection Flow

```
User                Settings UI           API Routes           OAuth Provider        Database
  │                     │                     │                      │                  │
  │ 1. Click Connect    │                     │                      │                  │
  ├────────────────────▶│                     │                      │                  │
  │                     │ 2. GET /authorize   │                      │                  │
  │                     ├────────────────────▶│                      │                  │
  │                     │                     │ 3. Generate state    │                  │
  │                     │                     │    & auth URL        │                  │
  │                     │                     │                      │                  │
  │                     │ 4. Redirect         │                      │                  │
  │◀────────────────────┴─────────────────────┤                      │                  │
  │                                           │                      │                  │
  │ 5. User authorizes                        │                      │                  │
  ├──────────────────────────────────────────────────────────────────▶                  │
  │                                           │                      │                  │
  │ 6. Callback with code                     │                      │                  │
  │◀──────────────────────────────────────────────────────────────────                  │
  │                                           │                      │                  │
  │                     │ 7. GET /callback    │                      │                  │
  ├────────────────────▶│────────────────────▶│                      │                  │
  │                     │                     │ 8. Exchange code     │                  │
  │                     │                     ├─────────────────────▶│                  │
  │                     │                     │ 9. Return tokens     │                  │
  │                     │                     │◀─────────────────────┤                  │
  │                     │                     │ 10. Store integration│                  │
  │                     │                     ├─────────────────────────────────────────▶│
  │                     │ 11. Redirect        │                      │                  │
  │◀────────────────────┴─────────────────────┤                      │                  │
  │                                           │                      │                  │
```

#### Deadline Sync Flow

```
Obligation Event       Calendar Sync         Integration         External Calendar
                          Service                Layer
      │                     │                     │                      │
      │ 1. Created/Updated  │                     │                      │
      ├────────────────────▶│                     │                      │
      │                     │ 2. Get integrations │                      │
      │                     ├────────────────────▶│                      │
      │                     │ 3. Check tokens     │                      │
      │                     │◀────────────────────┤                      │
      │                     │ 4. Create/update    │                      │
      │                     │    event            │                      │
      │                     ├────────────────────▶│                      │
      │                     │                     │ 5. API call          │
      │                     │                     ├─────────────────────▶│
      │                     │                     │ 6. Event ID          │
      │                     │                     │◀─────────────────────┤
      │                     │ 7. Store mapping    │                      │
      │                     ├────────────────────▶│                      │
      │                     │                     │                      │
```

### 4. Database Schema

```
┌─────────────────────────────────────┐
│      calendar_integrations          │
├─────────────────────────────────────┤
│ id              UUID PK              │
│ user_id         UUID FK → users     │
│ provider        VARCHAR(50)         │ ─┐
│ access_token    TEXT                │  │
│ refresh_token   TEXT                │  │ OAuth Tokens
│ token_expires_at TIMESTAMPTZ        │  │
│ calendar_id     VARCHAR(255)        │ ─┘
│ sync_enabled    BOOLEAN             │
│ last_synced_at  TIMESTAMPTZ         │
│ created_at      TIMESTAMPTZ         │
│ updated_at      TIMESTAMPTZ         │
└─────────────────────────────────────┘
                  │
                  │ 1:N
                  ▼
┌─────────────────────────────────────┐
│     calendar_event_mappings         │
├─────────────────────────────────────┤
│ id               UUID PK             │
│ integration_id   UUID FK ───────────┘
│ obligation_id    UUID FK → obligations
│ external_event_id VARCHAR(255)      │
│ synced_at        TIMESTAMPTZ        │
│ updated_at       TIMESTAMPTZ        │
└─────────────────────────────────────┘
```

### 5. Service Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Calendar Sync Service                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  syncDeadlineToCalendar()                                   │
│  ├─── Check user integrations                               │
│  ├─── Validate access tokens                                │
│  ├─── Check for existing event mapping                      │
│  ├─── Create or update event                                │
│  └─── Store event mapping                                   │
│                                                              │
│  removeDeadlineFromCalendar()                               │
│  ├─── Get event mappings                                    │
│  ├─── Delete events from external calendars                 │
│  └─── Remove mappings                                       │
│                                                              │
│  syncAllDeadlines()                                         │
│  ├─── Get user's pending obligations                        │
│  ├─── Filter obligations with deadlines                     │
│  └─── Batch sync to calendars                               │
│                                                              │
│  getValidAccessToken()                                      │
│  ├─── Check token expiration                                │
│  └─── Refresh if needed                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
              │                              │
              ▼                              ▼
┌──────────────────────┐      ┌──────────────────────┐
│  Google Calendar     │      │  Outlook Calendar    │
│      Client          │      │      Client          │
├──────────────────────┤      ├──────────────────────┤
│ - getAuthUrl()       │      │ - getAuthUrl()       │
│ - exchangeToken()    │      │ - exchangeToken()    │
│ - refreshToken()     │      │ - refreshToken()     │
│ - listCalendars()    │      │ - listCalendars()    │
│ - createEvent()      │      │ - createEvent()      │
│ - updateEvent()      │      │ - updateEvent()      │
│ - deleteEvent()      │      │ - deleteEvent()      │
└──────────────────────┘      └──────────────────────┘
```

### 6. Token Management Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Token Lifecycle                           │
└─────────────────────────────────────────────────────────────┘

Initial Authorization
    │
    ├─── User authorizes app
    │
    ├─── Receive authorization code
    │
    ├─── Exchange code for tokens
    │    ├─── Access Token (expires in 1 hour for Google)
    │    └─── Refresh Token (long-lived)
    │
    └─── Store tokens in database

Token Usage
    │
    ├─── Before API call
    │    │
    │    ├─── Check expiration
    │    │    │
    │    │    ├─── If expired ────▶ Refresh
    │    │    │                     │
    │    │    │                     ├─── Use refresh token
    │    │    │                     │
    │    │    │                     ├─── Get new access token
    │    │    │                     │
    │    │    │                     └─── Update database
    │    │    │
    │    │    └─── If valid ──────▶ Use existing token
    │    │
    │    └─── Make API call
    │
    └─── Handle errors
         │
         └─── If 401 Unauthorized ─▶ Try refresh ─▶ Retry once
```

### 7. Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Security Layers                          │
└─────────────────────────────────────────────────────────────┘

1. Authentication
   ├─── Supabase Auth
   └─── User must be logged in

2. OAuth Security
   ├─── State parameter with CSRF token
   ├─── Timestamp validation (10 min expiry)
   └─── User ID validation

3. Database Security
   ├─── Row Level Security (RLS)
   │    ├─── Users can only access their own integrations
   │    └─── Event mappings restricted to integration owner
   │
   └─── Encrypted at rest

4. API Security
   ├─── Rate limiting
   ├─── Input validation
   └─── Error handling (no sensitive data in responses)

5. Token Security
   ├─── Stored encrypted in database
   ├─── Automatic expiration
   ├─── Refresh token rotation (where supported)
   └─── Minimal scope (calendar read/write only)
```

### 8. Error Handling Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    Error Handling Flow                       │
└─────────────────────────────────────────────────────────────┘

Calendar Sync Error
    │
    ├─── Log error (console, monitoring)
    │
    ├─── Check error type
    │    │
    │    ├─── Network Error
    │    │    └─── Retry with backoff
    │    │
    │    ├─── Auth Error (401)
    │    │    ├─── Try token refresh
    │    │    └─── If refresh fails, mark integration as disconnected
    │    │
    │    ├─── Rate Limit (429)
    │    │    └─── Exponential backoff
    │    │
    │    └─── Other Errors
    │         └─── Log and continue
    │
    └─── NEVER block primary operation
         (Obligation creation/update should succeed even if sync fails)
```

## Performance Considerations

### Optimization Strategies

1. **Async Operations**
   - Calendar sync runs asynchronously
   - Doesn't block obligation operations
   - Fire-and-forget with error logging

2. **Batch Processing**
   - `syncMultipleObligations()` for bulk operations
   - Reduces API calls
   - Better rate limit handling

3. **Token Caching**
   - Validate token expiration before API calls
   - Minimize token refresh requests
   - In-memory cache for frequently accessed tokens

4. **Database Optimization**
   - Indexes on user_id, provider, obligation_id
   - Efficient queries with proper joins
   - RLS policies with optimal performance

## Scalability

### Horizontal Scaling

```
Load Balancer
    │
    ├─── App Server 1 ──┐
    ├─── App Server 2 ──┼─── Shared Database
    └─── App Server 3 ──┘
```

- Stateless services
- Database connection pooling
- No shared state between servers

### Rate Limit Management

```
Provider Rate Limits:
- Google Calendar API: 1,000 requests/100 seconds per user
- Microsoft Graph API: Varies by license

Strategy:
- Queue sync requests
- Batch operations where possible
- Implement exponential backoff
- Monitor quota usage
```

## Monitoring & Observability

### Metrics to Track

1. **Sync Success Rate**
   - Number of successful syncs
   - Number of failed syncs
   - Failure reasons

2. **Performance**
   - Sync duration
   - API response times
   - Token refresh frequency

3. **Usage**
   - Active integrations per provider
   - Sync frequency per user
   - Most synced obligation types

4. **Errors**
   - Auth errors
   - Network errors
   - Rate limit hits

### Logging Strategy

```typescript
// Example log structure
{
  timestamp: '2025-02-18T10:30:00Z',
  level: 'info',
  service: 'calendar-sync',
  action: 'sync_obligation',
  provider: 'google',
  user_id: 'user-123',
  obligation_id: 'obl-456',
  duration_ms: 234,
  success: true
}
```

## Future Architecture Considerations

### Potential Enhancements

1. **Event Queue System**
   - BullMQ or similar for async processing
   - Retry logic for failed syncs
   - Priority queuing

2. **Webhook Support**
   - Real-time updates from external calendars
   - Two-way sync capabilities

3. **Caching Layer**
   - Redis for token caching
   - Calendar data caching
   - Reduce API calls

4. **Microservices**
   - Separate calendar sync service
   - Independent scaling
   - Dedicated database

5. **Additional Providers**
   - Apple Calendar (CalDAV)
   - Yahoo Calendar
   - Custom calendar providers
