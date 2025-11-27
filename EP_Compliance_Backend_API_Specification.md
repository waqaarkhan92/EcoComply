# Oblicore Backend API Specification

**Oblicore v1.0 — Launch-Ready / Last updated: 2024-12-27**

**Document Version:** 1.0  
**Status:** Complete  
**Created by:** Cursor  
**Depends on:**
- ✅ Product Logic Specification (1.1) - Complete
- ✅ Database Schema (2.2) - Complete
- ✅ Background Jobs (2.3) - Complete
- ✅ Notification & Messaging (2.4) - Complete

**Purpose:** Defines the complete REST API specification for the Oblicore platform, including all endpoints, request/response schemas, authentication, authorization, error handling, and integration points.

> [v1 UPDATE – Version Header – 2024-12-27]

---

# Table of Contents

1. [API Overview](#1-api-overview)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Standard Response Formats](#3-standard-response-formats)
4. [Error Handling](#4-error-handling)
5. [Pagination](#5-pagination)
6. [Filtering & Sorting](#6-filtering--sorting)
7. [Rate Limiting](#7-rate-limiting)
8. [Document Upload Endpoints](#8-document-upload-endpoints)
9. [Excel Import Endpoints](#85-excel-import-endpoints)
10. [AI Extraction Endpoints](#9-ai-extraction-endpoints)
11. [Obligations Endpoints](#10-obligations-endpoints)
12. [Deadlines Endpoints](#11-deadlines-endpoints)
13. [Evidence Linking Endpoints](#12-evidence-linking-endpoints)
14. [Scheduling Endpoints](#13-scheduling-endpoints)
15. [Review Queue Endpoints](#14-review-queue-endpoints)
16. [Alerts Endpoints](#15-alerts-endpoints)
17. [Audit Pack Generator Endpoints](#16-audit-pack-generator-endpoints)
18. [v1.0 Pack-Specific Endpoints](#16-v10-pack-specific-endpoints)
19. [Pack Distribution Endpoints](#16-pack-distribution-endpoints)
20. [Module 2 Endpoints](#17-module-2-endpoints)
21. [Module 3 Endpoints](#18-module-3-endpoints)
22. [Users Endpoints](#19-users-endpoints)
23. [Companies Endpoints](#20-companies-endpoints)
24. [Multi-Site Endpoints](#21-multi-site-endpoints)
25. [Module Activation Endpoints](#22-module-activation-endpoints)
26. [Admin Endpoints](#23-admin-endpoints)
27. [Regulator Questions Endpoints](#24-regulator-questions-endpoints)
28. [Background Jobs Endpoints](#25-background-jobs-endpoints)
29. [Consultant Control Centre Endpoints](#26-consultant-control-centre-endpoints)
30. [File Upload Specifications](#27-file-upload-specifications)
31. [Webhook Endpoints](#28-webhook-endpoints)
32. [OpenAPI Specification](#29-openapi-specification)
33. [TypeScript Interfaces](#30-typescript-interfaces)

---

# 1. API Overview

## 1.0 Health Check Endpoint

**GET /api/v1/health**

**Purpose:** Health check endpoint for monitoring and load balancers

**Authentication:** Not required

**Request:**
- **Method:** GET

**Response:** 200 OK
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T12:00:00Z",
  "version": "1.0.0",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "storage": "healthy"
  }
}
```

**Response Schema:**
```typescript
interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    database: 'healthy' | 'unhealthy';
    redis: 'healthy' | 'unhealthy';
    storage: 'healthy' | 'unhealthy';
  };
}
```

**Error Codes:**
- `503 SERVICE_UNAVAILABLE` - Service unhealthy

**Rate Limiting:** None

---

## 1.1 Base URLs

| Environment | Base URL |
|-------------|----------|
| Production | `https://api.epcompliance.com/api/v1` |
| Staging | `https://api-staging.epcompliance.com/api/v1` |
| Development | `http://localhost:3000/api/v1` |

## 1.2 API Versioning

**Version Strategy:** URL-based versioning (`/api/v1/...`)

**Version Header (Optional):**
```
X-API-Version: 1.0
```

**Deprecation Policy:**
- 6-month deprecation notice before version removal
- Deprecated endpoints return `X-API-Deprecated: true` header
- Deprecation notice includes migration guide URL

## 1.3 Request/Response Headers

### Required Headers

**Request:**
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Response:**
```
Content-Type: application/json
X-Request-ID: {uuid}
X-Rate-Limit-Remaining: {number}
X-Rate-Limit-Reset: {unix_timestamp}
```

### Optional Headers

**Request:**
```
X-API-Version: 1.0
X-Request-ID: {uuid}  # For request tracing
```

**Response:**
```
X-API-Deprecated: true  # If endpoint is deprecated
X-API-Deprecation-Date: {iso_date}  # Deprecation date
X-API-Migration-Guide: {url}  # Migration guide URL
```

## 1.4 Content-Type Specifications

| Content Type | Usage |
|--------------|-------|
| `application/json` | Default for all JSON requests/responses |
| `multipart/form-data` | File uploads (documents, evidence) |
| `application/pdf` | PDF file downloads (audit packs, documents) |
| `application/zip` | ZIP archive downloads |
| `text/csv` | CSV file downloads/exports |

---

# 2. Authentication & Authorization

## 2.1 Authentication Mechanism

**Method:** JWT (JSON Web Token) token-based authentication

### JWT Token Structure

**Header:**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload:**
```json
{
  "user_id": "uuid",
  "company_id": "uuid",
  "role": "OWNER" | "ADMIN" | "STAFF" | "CONSULTANT" | "VIEWER",
  "permissions": ["permission1", "permission2"],
  "exp": 1234567890,
  "iat": 1234567890
}
```

**Signature:** HMAC SHA256

### Token Expiration

- **Access Token:** 24 hours
- **Refresh Token:** 7 days

### Authentication Endpoints

**POST /api/v1/auth/login**

Authenticate user and receive access/refresh tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Response:** 200 OK
```json
{
  "data": {
    "access_token": "string",
    "refresh_token": "string",
    "expires_in": 86400,
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "string",
      "company_id": "uuid",
      "roles": ["OWNER"]
    }
  }
}
```

**Error Codes:**
- `401 UNAUTHORIZED` - Invalid credentials
- `422 UNPROCESSABLE_ENTITY` - Validation error

---

**POST /api/v1/auth/signup**

Register new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password",
  "full_name": "string",
  "company_name": "string"
}
```

**Response:** 201 Created
```json
{
  "data": {
    "access_token": "string",
    "refresh_token": "string",
    "expires_in": 86400,
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "string",
      "company_id": "uuid"
    }
  }
}
```

**Error Codes:**
- `409 CONFLICT` - Email already exists
- `422 UNPROCESSABLE_ENTITY` - Validation error

---

**POST /api/v1/auth/logout**

Invalidate refresh token (logout).

**Request:**
- **Method:** POST
- **Body (optional):**
```json
{
  "refresh_token": "string"
}
```

**Response:** 200 OK
```json
{
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

**POST /api/v1/auth/refresh**

Refresh an expired access token using a valid refresh token.

**Request:**
```json
{
  "refresh_token": "string"
}
```

**Response:** 200 OK
```json
{
  "data": {
    "access_token": "string",
    "refresh_token": "string",
    "expires_in": 86400
  }
}
```

**Error Codes:**
- `401 UNAUTHORIZED` - Invalid refresh token

---

**GET /api/v1/auth/me**

Get current authenticated user details.

**Request:**
- **Method:** GET

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "string",
    "company_id": "uuid",
    "roles": ["OWNER"],
    "sites": ["uuid1", "uuid2"]
  }
}
```

**Error Codes:**
- `401 UNAUTHORIZED` - Not authenticated

## 2.2 Authorization

### Role-Based Access Control

**Roles:**
- **OWNER:** Full access to company data
- **ADMIN:** Full access to assigned company/site data
- **STAFF:** Limited access (create, read, update, no delete)
- **CONSULTANT:** Read + limited update on assigned clients
- **VIEWER:** Read-only access (no create, update, delete)

**Reference:** PLS Section B.10.2.1 (CRUD matrix)

### RLS Integration

The API respects database Row Level Security (RLS) policies. All queries automatically filter results based on:
- User's company access (`user_roles.company_id`)
- User's site access (`user_site_assignments.site_id`)
- User's role permissions

**Reference:** Database Schema (2.2), RLS & Permissions (2.8)

### Permission Checks

Each endpoint performs permission checks before execution:

```typescript
async function checkPermission(
  userId: string,
  resource: string,
  operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'
): Promise<boolean> {
  const userRole = await getUserRole(userId);
  const crudMatrix = getCRUDMatrix(); // From PLS Section B.10.2.1
  
  return crudMatrix[userRole][resource][operation] === true;
}
```

### Viewer Role Restrictions

Viewer role has read-only access:
- **Allowed:** GET requests (read operations)
- **Denied:** POST, PUT, DELETE requests (write operations)

**Reference:** PLS Section B.10.2.2 (Viewer Role RLS Rules)

---

# 3. Standard Response Formats

## 3.1 Success Response Format

**Single Resource:**
```json
{
  "data": {
    "id": "uuid",
    "field1": "value1",
    "field2": "value2"
  }
}
```

**Collection:**
```json
{
  "data": [
    {
      "id": "uuid",
      "field1": "value1"
    }
  ],
  "pagination": {
    "cursor": "base64_encoded_cursor",
    "has_more": true,
    "total": 150
  }
}
```

## 3.2 Error Response Format

**Standard Error Response:**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "field-specific error message"
    },
    "request_id": "uuid",
    "timestamp": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `BAD_REQUEST` | Invalid request parameters |
| 401 | `UNAUTHORIZED` | Missing or invalid authentication token |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource conflict (e.g., already exists) |
| 422 | `UNPROCESSABLE_ENTITY` | Validation errors |
| 429 | `TOO_MANY_REQUESTS` | Rate limit exceeded |
| 500 | `INTERNAL_SERVER_ERROR` | Server error |
| 503 | `SERVICE_UNAVAILABLE` | Service temporarily unavailable |

**Example Error Response:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "site_id": "site_id is required",
      "document_type": "document_type must be one of: PERMIT, CONSENT, MCPD_REGISTRATION"
    },
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2025-01-01T12:00:00Z"
  }
}
```

---

# 4. Error Handling

## 4.1 Error Types

### Client Errors (4xx)

- **400 BAD_REQUEST:** Invalid request format or parameters
- **401 UNAUTHORIZED:** Missing or invalid authentication
- **403 FORBIDDEN:** Insufficient permissions
- **404 NOT_FOUND:** Resource not found
- **409 CONFLICT:** Resource conflict (e.g., duplicate, already exists)
- **422 UNPROCESSABLE_ENTITY:** Validation errors
- **429 TOO_MANY_REQUESTS:** Rate limit exceeded

### Server Errors (5xx)

- **500 INTERNAL_SERVER_ERROR:** Unexpected server error
- **503 SERVICE_UNAVAILABLE:** Service temporarily unavailable

## 4.2 Error Response Headers

**Rate Limit Exceeded (429):**
```
Retry-After: 3600
X-Rate-Limit-Limit: 100
X-Rate-Limit-Remaining: 0
X-Rate-Limit-Reset: 1234567890
```

---

# 5. Pagination

## 5.1 Pagination Strategy

**Primary:** Cursor-based pagination (recommended for large datasets)  
**Fallback:** Offset-based pagination (for simple lists)

## 5.2 Cursor-Based Pagination

**Request Parameters:**
```
?cursor={base64_encoded_cursor}&limit=20
```

**Response Format:**
```json
{
  "data": [...],
  "pagination": {
    "cursor": "base64_encoded_cursor",
    "has_more": true,
    "total": 150
  }
}
```

**Cursor Format:**
- Base64-encoded JSON: `{"id": "uuid", "created_at": "2025-01-01T12:00:00Z"}`
- Opaque to client (can change implementation)

## 5.3 Offset-Based Pagination

**Request Parameters:**
```
?offset=0&limit=20
```

**Response Format:**
```json
{
  "data": [...],
  "pagination": {
    "offset": 0,
    "limit": 20,
    "total": 150,
    "has_more": true
  }
}
```

## 5.4 Pagination Defaults

- **Default Page Size:** 20 items
- **Maximum Page Size:** 100 items
- **Minimum Page Size:** 1 item

---

# 6. Filtering & Sorting

## 6.1 Filter Parameter Format

**Query String Format:**
```
?filter[field]=value&filter[field2]=value2
```

**Operators:**
- `eq` - Equal (default)
- `ne` - Not equal
- `gt` - Greater than
- `gte` - Greater than or equal
- `lt` - Less than
- `lte` - Less than or equal
- `like` - Pattern match (SQL LIKE)
- `in` - In array
- `not_in` - Not in array

**Examples:**
```
?filter[status]=overdue
?filter[site_id][in]=uuid1,uuid2
?filter[deadline_date][gte]=2025-01-01
?filter[title][like]=%monitoring%
```

## 6.2 Sort Parameter Format

**Query String Format:**
```
?sort=field1,-field2
```

**Rules:**
- Comma-separated field names
- Prefix with `-` for descending order
- Default: ascending order

**Examples:**
```
?sort=deadline_date,-created_at
      sort=status,obligation_title
```

## 6.3 Available Filter/Sort Fields

**Per Endpoint:** Each endpoint documents its filterable/sortable fields in the endpoint specification.

**Common Fields:**
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp
- `status` - Status field (varies by resource)
- `site_id` - Site identifier
- `company_id` - Company identifier

---

# 7. Rate Limiting

## 7.1 Rate Limit Headers

**Response Headers:**
```
X-Rate-Limit-Limit: 100
X-Rate-Limit-Remaining: 95
X-Rate-Limit-Reset: 1234567890
```

## 7.2 Rate Limit Responses

**429 Too Many Requests:**
```json
{
  "error": {
    "code": "TOO_MANY_REQUESTS",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 100,
      "remaining": 0,
      "reset_at": "2025-01-01T13:00:00Z"
    },
    "request_id": "uuid",
    "timestamp": "2025-01-01T12:00:00Z"
  }
}
```

**Headers:**
```
Retry-After: 3600
X-Rate-Limit-Limit: 100
X-Rate-Limit-Remaining: 0
X-Rate-Limit-Reset: 1234567890
```

## 7.3 Per-Endpoint Rate Limits

| Endpoint Category | Rate Limit |
|-------------------|------------|
| Document upload | 10/hour per user |
| AI extraction | 5/hour per user |
| Evidence upload | 20/hour per user |
| Audit pack generation | 5/hour per user |
| Default | 100 requests/hour per user |

---

# 8. Document Upload Endpoints

## 8.1 POST /api/v1/documents

**Purpose:** Upload permit/consent/MCPD registration document

**Authentication:** Required (Owner, Admin, Staff)

**Request:**
- **Method:** POST
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file` (File, required) - Document file (PDF, DOC, DOCX)
  - `site_id` (UUID, required) - Site identifier
  - `document_type` (enum, required) - `PERMIT`, `CONSENT`, `MCPD_REGISTRATION`
  - `metadata` (JSON, optional) - Additional metadata

**Request Schema:**
```typescript
interface DocumentUploadRequest {
  file: File;
  site_id: string;
  document_type: 'PERMIT' | 'CONSENT' | 'MCPD_REGISTRATION';
  metadata?: {
    reference_number?: string;
    issue_date?: string;
    expiry_date?: string;
    regulator?: 'EA' | 'SEPA' | 'NRW' | 'NIEA';
    [key: string]: any;
  };
}
```

**Response:** 201 Created
```json
{
  "data": {
    "id": "uuid",
    "site_id": "uuid",
    "document_type": "PERMIT",
    "title": "string",
    "status": "UPLOADED",
    "extraction_status": "PENDING",
    "file_url": "string",
    "file_size": 12345,
    "page_count": 10,
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

**Response Schema:**
```typescript
interface DocumentResponse {
  id: string;
  site_id: string;
  document_type: string;
  title: string;
  status: 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  extraction_status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  file_url: string;
  file_size: number;
  page_count?: number;
  created_at: string;
}
```

**Error Codes:**
- `400 BAD_REQUEST` - Invalid file format or parameters
- `413 PAYLOAD_TOO_LARGE` - File too large (>50MB)
- `422 UNPROCESSABLE_ENTITY` - Validation error (file limits exceeded - see PLS Section B.1.1)
- `403 FORBIDDEN` - Insufficient permissions

**File Limits:**
- Maximum file size: 50MB per file
- Maximum pages: 200 pages
- Maximum images per page: 10 images
- DPI range: 150-600 DPI

**Reference:** PLS Section B.1.1 (Document Upload Validation)

**Rate Limiting:** 10 uploads/hour per user

**Example Request:**
```bash
curl -X POST https://api.epcompliance.com/api/v1/documents \
  -H "Authorization: Bearer {token}" \
  -F "file=@permit.pdf" \
  -F "site_id=550e8400-e29b-41d4-a716-446655440000" \
  -F "document_type=PERMIT" \
  -F 'metadata={"reference_number":"EPR/AB1234CD"}'
```

---

## 8.2 GET /api/v1/documents

**Purpose:** List documents with filtering and pagination

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Query Parameters:**
  - `filter[site_id]` (optional) - Filter by site
  - `filter[document_type]` (optional) - Filter by document type
  - `filter[status]` (optional) - Filter by status
  - `sort` (optional) - Sort field (e.g., `-created_at`)
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size (default: 20, max: 100)

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "site_id": "uuid",
      "document_type": "PERMIT",
      "title": "string",
      "status": "PROCESSED",
      "extraction_status": "COMPLETED",
      "obligation_count": 25,
      "created_at": "2025-01-01T12:00:00Z"
    }
  ],
  "pagination": {
    "cursor": "base64_encoded_cursor",
    "has_more": true,
    "total": 150
  }
}
```

**Filterable Fields:**
- `site_id` (UUID)
- `document_type` (enum: PERMIT, CONSENT, MCPD_REGISTRATION)
- `status` (enum: UPLOADED, PROCESSING, PROCESSED, FAILED)
- `extraction_status` (enum: PENDING, IN_PROGRESS, COMPLETED, FAILED)
- `created_at` (date range: `filter[created_at][gte]`, `filter[created_at][lte]`)

**Sortable Fields:**
- `created_at`, `updated_at`, `title`, `status`

**Error Codes:**
- `400 BAD_REQUEST` - Invalid filter/sort

**Rate Limiting:** 100 requests/hour per user

---

## 8.3 GET /api/v1/documents/{documentId}

**Purpose:** Retrieve document details

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `documentId` (UUID, required) - Document identifier

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "site_id": "uuid",
    "company_id": "uuid",
    "document_type": "PERMIT",
    "title": "string",
    "reference_number": "string",
    "status": "PROCESSED",
    "extraction_status": "COMPLETED",
    "file_url": "string",
    "file_size": 12345,
    "page_count": 10,
    "obligation_count": 25,
    "created_at": "2025-01-01T12:00:00Z",
    "updated_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Document not found
- `403 FORBIDDEN` - Insufficient permissions (RLS)

**Rate Limiting:** 100 requests/hour per user

---

## 8.4 PUT /api/v1/documents/{documentId}

**Purpose:** Update document metadata

**Authentication:** Required (Owner, Admin, Staff)

**Request:**
- **Method:** PUT
- **Path Parameters:**
  - `documentId` (UUID, required) - Document identifier
- **Body:**
```json
{
  "title": "string",
  "reference_number": "string",
  "metadata": {
    "issue_date": "2025-01-01",
    "expiry_date": "2026-01-01"
  }
}
```

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "title": "string",
    "reference_number": "string",
    "updated_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Document not found
- `403 FORBIDDEN` - Insufficient permissions
- `422 UNPROCESSABLE_ENTITY` - Validation error

**Rate Limiting:** 50 updates/hour per user

---

## 8.5 Excel Import Endpoints

### 8.5.1 POST /api/v1/obligations/import/excel

**Purpose:** Upload Excel/CSV file to import obligations in bulk

**Authentication:** Required (Owner, Admin, Staff)

**Request:**
- **Method:** POST
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file` (File, required) - Excel/CSV file (.xlsx, .xls, .csv)
  - `site_id` (UUID, required) - Site identifier
  - `import_options` (JSON, optional) - Import configuration

**Request Schema:**
```typescript
interface ExcelImportRequest {
  file: File; // .xlsx, .xls, or .csv
  site_id: string;
  import_options?: {
    create_missing_sites?: boolean;    // Default: false
    create_missing_permits?: boolean;   // Default: false
    skip_duplicates?: boolean;         // Default: true
    column_mapping?: Record<string, string>; // Optional: Custom column mapping
  };
}
```

**Response:** 202 Accepted (asynchronous processing)
```json
{
  "data": {
    "import_id": "uuid",
    "status": "PROCESSING",
    "file_name": "obligations.xlsx",
    "row_count": 150,
    "message": "Excel import is being processed. You will be notified when ready for review."
  }
}
```

**Response Schema:**
```typescript
interface ExcelImportResponse {
  import_id: string;
  status: 'PROCESSING' | 'PENDING_REVIEW' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  file_name: string;
  row_count: number;
  message: string;
}
```

**Error Codes:**
- `400 BAD_REQUEST` - Invalid file format (not .xlsx, .xls, or .csv)
- `413 PAYLOAD_TOO_LARGE` - File too large (>10MB)
- `422 UNPROCESSABLE_ENTITY` - Too many rows (>10,000) or validation error
- `403 FORBIDDEN` - Insufficient permissions

**File Limits:**
- Maximum file size: 10MB
- Maximum rows: 10,000 rows
- Supported formats: .xlsx, .xls, .csv

**Rate Limiting:** 5 imports/hour per user

**Integration:** Creates background job (Excel Import Processing Job - see Background Jobs 2.3)

**Example Request:**
```bash
curl -X POST https://api.epcompliance.com/api/v1/obligations/import/excel \
  -H "Authorization: Bearer {token}" \
  -F "file=@obligations.xlsx" \
  -F "site_id=550e8400-e29b-41d4-a716-446655440000" \
  -F 'import_options={"create_missing_permits":true,"skip_duplicates":true}'
```

---

### 8.5.2 GET /api/v1/obligations/import/excel/{importId}/preview

**Purpose:** Get import preview (valid rows, errors, warnings) before confirmation

**Authentication:** Required (Owner, Admin, Staff)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `importId` (UUID, required) - Import identifier

**Response:** 200 OK
```json
{
  "data": {
    "import_id": "uuid",
    "status": "PENDING_REVIEW",
    "file_name": "obligations.xlsx",
    "row_count": 150,
    "valid_count": 142,
    "error_count": 8,
    "valid_rows": [
      {
        "row_number": 2,
        "data": {
          "permit_number": "EPR/AB1234CD",
          "obligation_title": "Monitor emissions",
          "frequency": "monthly",
          "deadline_date": "2025-02-01"
        },
        "warnings": []
      }
    ],
    "errors": [
      {
        "row_number": 5,
        "errors": ["Missing required field: obligation_title"],
        "data": {
          "permit_number": "EPR/AB1234CD"
        }
      }
    ],
    "warnings": [
      {
        "row_number": 10,
        "warnings": ["Duplicate obligation detected"],
        "data": {...}
      }
    ]
  }
}
```

**Response Schema:**
```typescript
interface ExcelImportPreviewResponse {
  import_id: string;
  status: 'PENDING_REVIEW' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  file_name: string;
  row_count: number;
  valid_count: number;
  error_count: number;
  valid_rows: Array<{
    row_number: number;
    data: Record<string, any>;
    warnings: string[];
  }>;
  errors: Array<{
    row_number: number;
    errors: string[];
    data: Record<string, any>;
  }>;
  warnings: Array<{
    row_number: number;
    warnings: string[];
    data: Record<string, any>;
  }>;
}
```

**Error Codes:**
- `404 NOT_FOUND` - Import not found
- `422 UNPROCESSABLE_ENTITY` - Preview not ready (still processing)

**Rate Limiting:** 100 requests/hour per user

---

### 8.5.3 POST /api/v1/obligations/import/excel/{importId}/confirm

**Purpose:** Confirm and execute import after preview review

**Authentication:** Required (Owner, Admin, Staff)

**Request:**
- **Method:** POST
- **Path Parameters:**
  - `importId` (UUID, required) - Import identifier
- **Body:**
  ```json
  {
    "skip_errors": false,
    "create_missing_sites": false,
    "create_missing_permits": true
  }
  ```

**Request Schema:**
```typescript
interface ExcelImportConfirmRequest {
  skip_errors?: boolean;              // Default: false
  create_missing_sites?: boolean;      // Default: false
  create_missing_permits?: boolean;    // Default: true
}
```

**Response:** 200 OK
```json
{
  "data": {
    "import_id": "uuid",
    "status": "COMPLETED",
    "success_count": 142,
    "error_count": 8,
    "obligation_ids": ["uuid1", "uuid2", ...],
    "message": "142 obligations imported successfully"
  }
}
```

**Response Schema:**
```typescript
interface ExcelImportConfirmResponse {
  import_id: string;
  status: 'COMPLETED' | 'FAILED';
  success_count: number;
  error_count: number;
  obligation_ids: string[];
  message: string;
}
```

**Error Codes:**
- `404 NOT_FOUND` - Import not found
- `422 UNPROCESSABLE_ENTITY` - Import already confirmed or failed

**Integration:** Triggers background job (Excel Import Processing Job Phase 2 - bulk creation)

**Rate Limiting:** 10 confirmations/hour per user

---

### 8.5.4 GET /api/v1/obligations/import/excel/{importId}

**Purpose:** Get import status and details

**Authentication:** Required (Owner, Admin, Staff)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `importId` (UUID, required) - Import identifier

**Response:** 200 OK
```json
{
  "data": {
    "import_id": "uuid",
    "status": "COMPLETED",
    "file_name": "obligations.xlsx",
    "row_count": 150,
    "valid_count": 142,
    "error_count": 8,
    "success_count": 142,
    "errors": [...],
    "created_at": "2025-01-01T12:00:00Z",
    "completed_at": "2025-01-01T12:05:00Z"
  }
}
```

**Response Schema:**
```typescript
interface ExcelImportStatusResponse {
  import_id: string;
  status: 'PENDING' | 'PROCESSING' | 'PENDING_REVIEW' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  file_name: string;
  row_count: number;
  valid_count: number;
  error_count: number;
  success_count?: number;
  errors?: Array<any>;
  created_at: string;
  completed_at?: string;
}
```

**Error Codes:**
- `404 NOT_FOUND` - Import not found

**Rate Limiting:** 100 requests/hour per user

---

### 8.5.5 DELETE /api/v1/obligations/import/excel/{importId}

**Purpose:** Cancel pending import

**Authentication:** Required (Owner, Admin, Staff)

**Request:**
- **Method:** DELETE
- **Path Parameters:**
  - `importId` (UUID, required) - Import identifier

**Response:** 204 No Content

**Error Codes:**
- `404 NOT_FOUND` - Import not found
- `422 UNPROCESSABLE_ENTITY` - Import already completed or cancelled

**Rate Limiting:** 10 cancellations/hour per user

---

## 8.6 DELETE /api/v1/documents/{documentId}

**Purpose:** Delete document (soft delete)

**Authentication:** Required (Owner, Admin)

**Request:**
- **Method:** DELETE
- **Path Parameters:**
  - `documentId` (UUID, required) - Document identifier

**Response:** 200 OK
```json
{
  "data": {
    "message": "Document deleted successfully"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Document not found
- `403 FORBIDDEN` - Insufficient permissions
- `409 CONFLICT` - Document has linked obligations

**Rate Limiting:** 10 deletions/hour per user

---

## 8.7 GET /api/v1/documents/{documentId}/obligations

**Purpose:** List obligations for document

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `documentId` (UUID, required) - Document identifier
- **Query Parameters:**
  - `filter[status]` (optional) - Filter by status
  - `filter[review_status]` (optional) - Filter by review status
  - `sort` (optional) - Sort field
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "original_text": "string",
      "obligation_title": "string",
      "obligation_description": "string",
      "category": "MONITORING",
      "status": "PENDING",
      "review_status": "PENDING",
      "confidence_score": 0.95
    }
  ],
  "pagination": {...}
}
```

**Error Codes:**
- `404 NOT_FOUND` - Document not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 requests/hour per user

---

## 8.10 GET /api/v1/documents/{documentId}/download

**Purpose:** Download document file

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `documentId` (UUID, required) - Document identifier

**Response:** 200 OK
- **Content-Type:** `application/pdf` (or original file type)
- **Body:** File binary

**Headers:**
```
Content-Disposition: attachment; filename="{document_title}.pdf"
Content-Length: {file_size}
```

**Error Codes:**
- `404 NOT_FOUND` - Document not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 20 downloads/hour per user

---

## 8.11 GET /api/v1/documents/{documentId}/preview

**Purpose:** Preview document (if supported format)

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `documentId` (UUID, required) - Document identifier
- **Query Parameters:**
  - `page` (optional) - Page number (for PDFs)

**Response:** 200 OK
- **Content-Type:** `image/png` or `application/pdf`
- **Body:** Preview image or PDF

**Error Codes:**
- `404 NOT_FOUND` - Document not found
- `403 FORBIDDEN` - Insufficient permissions
- `415 UNSUPPORTED_MEDIA_TYPE` - Preview not available for this file type

**Rate Limiting:** 50 previews/hour per user

---

## 8.12 GET /api/v1/documents/{documentId}/extraction-logs

**Purpose:** List extraction logs for document

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `documentId` (UUID, required) - Document identifier
- **Query Parameters:**
  - `sort` (optional) - Sort field (e.g., `-extraction_timestamp`)
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "extraction_timestamp": "2025-01-01T12:00:00Z",
      "model_identifier": "gpt-4",
      "rule_library_version": "1.0",
      "obligations_extracted": 25,
      "processing_time_ms": 5000
    }
  ],
  "pagination": {...}
}
```

**Error Codes:**
- `404 NOT_FOUND` - Document not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 requests/hour per user

---

## 8.8 POST /api/v1/documents/{documentId}/sites

**Purpose:** Assign document to site

**Authentication:** Required (Owner, Admin, Staff)

**Request:**
- **Method:** POST
- **Path Parameters:**
  - `documentId` (UUID, required) - Document identifier
- **Body:**
```json
{
  "site_id": "uuid",
  "is_primary": false,
  "obligations_shared": true
}
```

**Response:** 201 Created
```json
{
  "data": {
    "document_id": "uuid",
    "site_id": "uuid",
    "is_primary": false,
    "obligations_shared": true,
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Document or site not found
- `409 CONFLICT` - Already assigned
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 50 assignments/hour per user

---

## 8.9 DELETE /api/v1/documents/{documentId}/sites/{siteId}

**Purpose:** Unassign document from site

**Authentication:** Required (Owner, Admin, Staff)

**Request:**
- **Method:** DELETE
- **Path Parameters:**
  - `documentId` (UUID, required) - Document identifier
  - `siteId` (UUID, required) - Site identifier

**Response:** 200 OK
```json
{
  "data": {
    "message": "Document unassigned successfully"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Assignment not found

**Rate Limiting:** 50 unassignments/hour per user

---

# 9. AI Extraction Endpoints

## 9.1 POST /api/v1/documents/{documentId}/extract

**Purpose:** Trigger LLM parsing for document

**Authentication:** Required (Owner, Admin, Staff)

**Request:**
- **Method:** POST
- **Path Parameters:**
  - `documentId` (UUID, required) - Document identifier
- **Body (optional):**
```json
{
  "force_reprocess": false
}
```

**Request Schema:**
```typescript
interface ExtractRequest {
  force_reprocess?: boolean;
}
```

**Response:** 202 Accepted
```json
{
  "data": {
    "job_id": "uuid",
    "status": "QUEUED",
    "estimated_completion_time": "2025-01-01T12:05:00Z"
  }
}
```

**Response Schema:**
```typescript
interface ExtractResponse {
  job_id: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  estimated_completion_time: string;
}
```

**Error Codes:**
- `404 NOT_FOUND` - Document not found
- `409 CONFLICT` - Extraction already in progress
- `403 FORBIDDEN` - Insufficient permissions

**Integration:** Creates background job (Document Processing Job - see Background Jobs 2.3)

**Rate Limiting:** 5 extractions/hour per user

**Example Request:**
```bash
curl -X POST https://api.epcompliance.com/api/v1/documents/{documentId}/extract \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"force_reprocess": false}'
```

---

## 9.2 GET /api/v1/documents/{documentId}/extraction-results

**Purpose:** Retrieve extraction results

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `documentId` (UUID, required) - Document identifier

**Response:** 200 OK
```json
{
  "data": {
    "document_id": "uuid",
    "extraction_status": "COMPLETED",
    "obligations": [
      {
        "id": "uuid",
        "original_text": "string",
        "obligation_title": "string",
      "obligation_description": "string",
        "category": "MONITORING",
        "confidence_score": 0.95,
        "review_status": "PENDING"
      }
    ],
    "extraction_logs": {
      "input_tokens": 50000,
      "output_tokens": 10000,
      "estimated_cost": 0.14,
      "rule_library_hits": 5,
      "api_calls_made": 1
    },
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

**Response Schema:**
```typescript
interface ExtractionResultsResponse {
  document_id: string;
  extraction_status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  obligations: Obligation[];
  extraction_logs: {
    input_tokens: number;
    output_tokens: number;
    estimated_cost: number;
    rule_library_hits: number;
    api_calls_made: number;
  };
  created_at: string;
}
```

**Error Codes:**
- `404 NOT_FOUND` - Document not found
- `202 ACCEPTED` - Extraction in progress (returns current status)

**Rate Limiting:** 100 requests/hour per user

---

# 10. Obligations Endpoints

## 10.1 GET /api/v1/obligations

**Purpose:** List obligations with filtering and pagination

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Query Parameters:**
  - `filter[site_id]` (optional) - Filter by site
  - `filter[document_id]` (optional) - Filter by document
  - `filter[status]` (optional) - Filter by status
  - `filter[review_status]` (optional) - Filter by review status
  - `filter[category]` (optional) - Filter by category
  - `filter[is_subjective]` (optional) - Filter by subjective flag
  - `filter[deadline_date][gte]` (optional) - Filter by deadline date range
  - `filter[deadline_date][lte]` (optional) - Filter by deadline date range
  - `sort` (optional) - Sort field (e.g., `deadline_date,-created_at`)
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size (default: 20, max: 100)

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "document_id": "uuid",
      "site_id": "uuid",
      "original_text": "string",
      "obligation_title": "string",
      "obligation_description": "string",
      "category": "MONITORING",
      "status": "PENDING",
      "review_status": "PENDING",
      "deadline_date": "2025-01-15",
      "confidence_score": 0.95,
      "is_subjective": false,
      "created_at": "2025-01-01T12:00:00Z"
    }
  ],
  "pagination": {
    "cursor": "base64_encoded_cursor",
    "has_more": true,
    "total": 150
  }
}
```

**Filterable Fields:**
- `site_id` (UUID)
- `document_id` (UUID)
- `company_id` (UUID)
- `status` (enum: PENDING, IN_PROGRESS, COMPLETED, OVERDUE, INCOMPLETE, LATE_COMPLETE, NOT_APPLICABLE, REJECTED)
- `review_status` (enum: PENDING, CONFIRMED, EDITED, REJECTED, PENDING_INTERPRETATION, INTERPRETED, NOT_APPLICABLE)
- `category` (enum: MONITORING, REPORTING, RECORD_KEEPING, OPERATIONAL, MAINTENANCE)
- `is_subjective` (boolean)
- `deadline_date` (date range)
- `assigned_to` (UUID)

**Sortable Fields:**
- `created_at`, `updated_at`, `deadline_date`, `status`, `review_status`, `confidence_score`

**Error Codes:**
- `400 BAD_REQUEST` - Invalid filter/sort

**Rate Limiting:** 100 requests/hour per user

---

## 10.2 GET /api/v1/obligations/{obligationId}

**Purpose:** Get obligation details

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `obligationId` (UUID, required) - Obligation identifier

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "document_id": "uuid",
    "site_id": "uuid",
    "company_id": "uuid",
    "original_text": "string",
    "obligation_title": "string",
    "obligation_description": "string",
    "category": "MONITORING",
    "frequency": "MONTHLY",
    "deadline_date": "2025-01-15",
    "is_subjective": false,
    "confidence_score": 0.95,
    "review_status": "PENDING",
    "status": "PENDING",
    "version_number": 1,
    "version_history": [],
    "evidence_count": 2,
    "assigned_to": "uuid",
    "created_at": "2025-01-01T12:00:00Z",
    "updated_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Obligation not found
- `403 FORBIDDEN` - Insufficient permissions (RLS)

**Rate Limiting:** 100 requests/hour per user

---

## 10.3 PUT /api/v1/obligations/{obligationId}

**Purpose:** Edit obligation

**Authentication:** Required (Owner, Admin, Staff)

**Request:**
- **Method:** PUT
- **Path Parameters:**
  - `obligationId` (UUID, required) - Obligation identifier
- **Body:**
```json
{
  "obligation_title": "string",
  "obligation_description": "string",
  "category": "MONITORING",
  "frequency": "MONTHLY",
  "deadline_date": "2025-01-15",
  "assigned_to": "uuid",
  "review_notes": "string"
}
```

**Request Schema:**
```typescript
interface UpdateObligationRequest {
  obligation_title?: string;
  obligation_description?: string;
  category?: 'MONITORING' | 'REPORTING' | 'RECORD_KEEPING' | 'OPERATIONAL' | 'MAINTENANCE';
  frequency?: string;
  deadline_date?: string;
  assigned_to?: string;
  review_notes?: string;
}
```

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "obligation_title": "string",
    "obligation_description": "string",
    "category": "MONITORING",
    "review_status": "EDITED",
    "version_number": 2,
    "updated_at": "2025-01-01T12:00:00Z"
  }
}
```

**Note:** Updates increment `version_number` and log to `version_history` (see PLS Section B.11)

**Error Codes:**
- `404 NOT_FOUND` - Obligation not found
- `403 FORBIDDEN` - Insufficient permissions
- `422 UNPROCESSABLE_ENTITY` - Validation error

**Rate Limiting:** 100 updates/hour per user

---

## 10.4 PUT /api/v1/obligations/{obligationId}/mark-na

**Purpose:** Mark obligation as Not Applicable

**Authentication:** Required (Owner, Admin, Staff)

**Request:**
- **Method:** PUT
- **Path Parameters:**
  - `obligationId` (UUID, required) - Obligation identifier
- **Body (optional):**
```json
{
  "reason": "string"
}
```

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "status": "NOT_APPLICABLE",
    "review_status": "NOT_APPLICABLE",
    "updated_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Obligation not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 50 marks/hour per user

---

## 10.5 PUT /api/v1/obligations/{obligationId}/review

**Purpose:** Update obligation review status

**Authentication:** Required (Owner, Admin, Staff)

**Request:**
- **Method:** PUT
- **Path Parameters:**
  - `obligationId` (UUID, required) - Obligation identifier
- **Body:**
```json
{
  "review_status": "CONFIRMED",
  "review_notes": "string"
}
```

**Request Schema:**
```typescript
interface UpdateReviewRequest {
  review_status: 'CONFIRMED' | 'EDITED' | 'REJECTED' | 'PENDING_INTERPRETATION' | 'INTERPRETED' | 'NOT_APPLICABLE';
  review_notes?: string;
}
```

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "review_status": "CONFIRMED",
    "reviewed_by": "uuid",
    "reviewed_at": "2025-01-01T12:00:00Z",
    "updated_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Obligation not found
- `403 FORBIDDEN` - Insufficient permissions
- `422 UNPROCESSABLE_ENTITY` - Invalid review_status

**Rate Limiting:** 100 reviews/hour per user

---

## 10.6 GET /api/v1/obligations/{obligationId}/deadlines

**Purpose:** List deadlines for obligation

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `obligationId` (UUID, required) - Obligation identifier
- **Query Parameters:**
  - `filter[status]` (optional) - Filter by status
  - `sort` (optional) - Sort field (e.g., `due_date`)
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "due_date": "2025-01-15",
      "status": "PENDING",
      "compliance_period": "2025-Q1",
      "is_late": false
    }
  ],
  "pagination": {...}
}
```

**Error Codes:**
- `404 NOT_FOUND` - Obligation not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 requests/hour per user

---

## 10.7 GET /api/v1/obligations/{obligationId}/escalations

**Purpose:** List escalations for obligation

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `obligationId` (UUID, required) - Obligation identifier
- **Query Parameters:**
  - `filter[status]` (optional) - Filter by resolved status
  - `sort` (optional) - Sort field (e.g., `-escalated_at`)
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "current_level": 2,
      "escalation_reason": "string",
      "escalated_to": "uuid",
      "escalated_at": "2025-01-01T12:00:00Z",
      "resolved_at": null
    }
  ],
  "pagination": {...}
}
```

**Error Codes:**
- `404 NOT_FOUND` - Obligation not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 requests/hour per user

---

# 11. Deadlines Endpoints

## 11.1 GET /api/v1/deadlines

**Purpose:** List deadlines with filtering and pagination

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Query Parameters:**
  - `filter[site_id]` (optional) - Filter by site
  - `filter[obligation_id]` (optional) - Filter by obligation
  - `filter[status]` (optional) - Filter by status
  - `filter[due_date][gte]` (optional) - Filter by due date range
  - `filter[due_date][lte]` (optional) - Filter by due date range
  - `sort` (optional) - Sort field (e.g., `due_date,-created_at`)
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size (default: 20, max: 100)

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "obligation_id": "uuid",
      "site_id": "uuid",
      "due_date": "2025-01-15",
      "status": "PENDING",
      "compliance_period": "2025-Q1",
      "is_late": false,
      "created_at": "2025-01-01T12:00:00Z"
    }
  ],
  "pagination": {
    "cursor": "base64_encoded_cursor",
    "has_more": true,
    "total": 150
  }
}
```

**Filterable Fields:**
- `site_id` (UUID)
- `obligation_id` (UUID)
- `company_id` (UUID)
- `status` (enum: PENDING, DUE_SOON, COMPLETED, OVERDUE, INCOMPLETE, LATE_COMPLETE, NOT_APPLICABLE)
- `due_date` (date range)
- `compliance_period` (string)

**Sortable Fields:**
- `due_date`, `created_at`, `status`, `compliance_period`

**Error Codes:**
- `400 BAD_REQUEST` - Invalid filter/sort

**Rate Limiting:** 100 requests/hour per user

---

## 11.2 GET /api/v1/deadlines/{deadlineId}

**Purpose:** Get deadline details

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `deadlineId` (UUID, required) - Deadline identifier

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "schedule_id": "uuid",
    "obligation_id": "uuid",
    "site_id": "uuid",
    "due_date": "2025-01-15",
    "status": "PENDING",
    "compliance_period": "2025-Q1",
    "completed_at": null,
    "completed_by": null,
    "completion_notes": null,
    "is_late": false,
    "created_at": "2025-01-01T12:00:00Z",
    "updated_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Deadline not found
- `403 FORBIDDEN` - Insufficient permissions (RLS)

**Rate Limiting:** 100 requests/hour per user

---

## 11.3 PUT /api/v1/deadlines/{deadlineId}/complete

**Purpose:** Mark deadline as completed

**Authentication:** Required (Owner, Admin, Staff)

**Request:**
- **Method:** PUT
- **Path Parameters:**
  - `deadlineId` (UUID, required) - Deadline identifier
- **Body (optional):**
```json
{
  "completion_notes": "string"
}
```

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "status": "COMPLETED",
    "completed_at": "2025-01-01T12:00:00Z",
    "completed_by": "uuid",
    "completion_notes": "string",
    "updated_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Deadline not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 completions/hour per user

---

## 11.4 GET /api/v1/schedules/{scheduleId}/deadlines

**Purpose:** List deadlines for schedule

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `scheduleId` (UUID, required) - Schedule identifier
- **Query Parameters:**
  - `filter[status]` (optional) - Filter by status
  - `filter[due_date][gte]` (optional) - Filter by due date range
  - `sort` (optional) - Sort field (e.g., `due_date`)
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "due_date": "2025-01-15",
      "status": "PENDING",
      "compliance_period": "2025-Q1"
    }
  ],
  "pagination": {...}
}
```

**Error Codes:**
- `404 NOT_FOUND` - Schedule not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 requests/hour per user

---

# 12. Evidence Linking Endpoints

## 12.1 POST /api/v1/evidence

**Purpose:** Upload evidence file

**Authentication:** Required (Owner, Admin, Staff)

**Request:**
- **Method:** POST
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file` (File, required) - Evidence file
  - `obligation_id` (UUID, required) - Obligation identifier
  - `evidence_type` (enum, required) - Evidence type
  - `metadata` (JSON, optional) - Additional metadata

**Request Schema:**
```typescript
interface EvidenceUploadRequest {
  file: File;
  obligation_id: string;
  evidence_type: string;
  metadata?: {
    description?: string;
    date?: string;
    [key: string]: any;
  };
}
```

**Response:** 201 Created
```json
{
  "data": {
    "id": "uuid",
    "obligation_id": "uuid",
    "site_id": "uuid",
    "evidence_type": "PHOTO",
    "file_url": "string",
    "file_size": 12345,
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `400 BAD_REQUEST` - Invalid file format
- `404 NOT_FOUND` - Obligation not found
- `413 PAYLOAD_TOO_LARGE` - File too large

**Rate Limiting:** 20 uploads/hour per user

---

## 12.2 GET /api/v1/evidence

**Purpose:** List evidence items with filtering and pagination

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Query Parameters:**
  - `filter[site_id]` (optional) - Filter by site
  - `filter[obligation_id]` (optional) - Filter by obligation (via links)
  - `filter[evidence_type]` (optional) - Filter by evidence type
  - `sort` (optional) - Sort field (e.g., `-created_at`)
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size (default: 20, max: 100)

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "site_id": "uuid",
      "file_name": "string",
      "evidence_type": "PHOTO",
      "file_size": 12345,
      "created_at": "2025-01-01T12:00:00Z"
    }
  ],
  "pagination": {
    "cursor": "base64_encoded_cursor",
    "has_more": true,
    "total": 50
  }
}
```

**Filterable Fields:**
- `site_id` (UUID)
- `company_id` (UUID)
- `evidence_type` (enum)
- `created_at` (date range)

**Sortable Fields:**
- `created_at`, `file_name`, `file_size`

**Error Codes:**
- `400 BAD_REQUEST` - Invalid filter/sort

**Rate Limiting:** 100 requests/hour per user

---

## 12.3 GET /api/v1/evidence/{evidenceId}

**Purpose:** Get evidence details

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `evidenceId` (UUID, required) - Evidence identifier

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "site_id": "uuid",
    "company_id": "uuid",
    "file_name": "string",
    "file_type": "IMAGE",
    "evidence_type": "PHOTO",
    "file_url": "string",
    "file_size": 12345,
    "linked_obligations": [
      {
        "obligation_id": "uuid",
        "linked_at": "2025-01-01T12:00:00Z"
      }
    ],
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Evidence not found
- `403 FORBIDDEN` - Insufficient permissions (RLS)

**Rate Limiting:** 100 requests/hour per user

---

## 12.4 GET /api/v1/obligations/{obligationId}/evidence

**Purpose:** List evidence linked to obligation

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `obligationId` (UUID, required) - Obligation identifier
- **Query Parameters:**
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "file_name": "string",
      "evidence_type": "PHOTO",
      "file_url": "string",
      "linked_at": "2025-01-01T12:00:00Z"
    }
  ],
  "pagination": {...}
}
```

**Error Codes:**
- `404 NOT_FOUND` - Obligation not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 requests/hour per user

---

## 12.5 POST /api/v1/obligations/{obligationId}/evidence/{evidenceId}/link

**Purpose:** Link existing evidence to obligation

**Authentication:** Required (Owner, Admin, Staff)

**Request:**
- **Method:** POST
- **Path Parameters:**
  - `obligationId` (UUID, required) - Obligation identifier
  - `evidenceId` (UUID, required) - Evidence identifier

**Response:** 200 OK
```json
{
  "data": {
    "obligation_id": "uuid",
    "evidence_id": "uuid",
    "linked_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Obligation or evidence not found
- `409 CONFLICT` - Already linked

**Rate Limiting:** 100 links/hour per user

---

## 12.6 DELETE /api/v1/obligations/{obligationId}/evidence/{evidenceId}/unlink

**Purpose:** Unlink evidence from obligation

**Authentication:** Required (Owner, Admin, Staff)

**Request:**
- **Method:** DELETE
- **Path Parameters:**
  - `obligationId` (UUID, required) - Obligation identifier
  - `evidenceId` (UUID, required) - Evidence identifier

**Response:** 200 OK
```json
{
  "data": {
    "message": "Evidence unlinked successfully"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Link not found

**Rate Limiting:** 100 unlinks/hour per user

---

## 12.7 GET /api/v1/evidence/{evidenceId}/download

**Purpose:** Download evidence file

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `evidenceId` (UUID, required) - Evidence identifier

**Response:** 200 OK
- **Content-Type:** Based on file type (image/png, application/pdf, etc.)
- **Body:** File binary

**Headers:**
```
Content-Disposition: attachment; filename="{file_name}"
Content-Length: {file_size}
```

**Error Codes:**
- `404 NOT_FOUND` - Evidence not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 20 downloads/hour per user

---

## 12.8 DELETE /api/v1/evidence/{evidenceId}

**Purpose:** Delete evidence item

**Authentication:** Required (Owner, Admin, Staff - own evidence only)

**Request:**
- **Method:** DELETE
- **Path Parameters:**
  - `evidenceId` (UUID, required) - Evidence identifier

**Response:** 200 OK
```json
{
  "data": {
    "message": "Evidence deleted successfully"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Evidence not found
- `403 FORBIDDEN` - Insufficient permissions
- `409 CONFLICT` - Evidence is linked to obligations

**Rate Limiting:** 20 deletions/hour per user

---

# 13. Scheduling Endpoints

## 13.1 GET /api/v1/schedules

**Purpose:** List schedules with filtering and pagination

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Query Parameters:**
  - `filter[obligation_id]` (optional) - Filter by obligation
  - `filter[site_id]` (optional) - Filter by site
  - `filter[status]` (optional) - Filter by status
  - `filter[frequency]` (optional) - Filter by frequency
  - `sort` (optional) - Sort field (e.g., `next_due_date`)
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "obligation_id": "uuid",
      "frequency": "MONTHLY",
      "next_due_date": "2025-02-01",
      "status": "ACTIVE",
      "created_at": "2025-01-01T12:00:00Z"
    }
  ],
  "pagination": {...}
}
```

**Filterable Fields:**
- `obligation_id` (UUID)
- `site_id` (UUID - via obligation)
- `status` (enum: ACTIVE, PAUSED, ARCHIVED)
- `frequency` (enum)
- `next_due_date` (date range)

**Sortable Fields:**
- `next_due_date`, `created_at`, `status`

**Error Codes:**
- `400 BAD_REQUEST` - Invalid filter/sort

**Rate Limiting:** 100 requests/hour per user

---

## 13.2 GET /api/v1/schedules/{scheduleId}

**Purpose:** Get schedule details

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `scheduleId` (UUID, required) - Schedule identifier

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "obligation_id": "uuid",
    "frequency": "MONTHLY",
    "base_date": "2025-01-01",
    "next_due_date": "2025-02-01",
    "last_completed_date": null,
    "status": "ACTIVE",
    "modified_by": null,
    "modified_at": null,
    "previous_values": null,
    "created_at": "2025-01-01T12:00:00Z",
    "updated_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Schedule not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 requests/hour per user

---

## 13.3 GET /api/v1/obligations/{obligationId}/schedule

**Purpose:** Get schedule for obligation

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `obligationId` (UUID, required) - Obligation identifier

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "obligation_id": "uuid",
    "frequency": "MONTHLY",
    "next_due_date": "2025-02-01",
    "status": "ACTIVE"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Obligation or schedule not found

**Rate Limiting:** 100 requests/hour per user

---

## 13.4 POST /api/v1/schedules

**Purpose:** Create monitoring schedule

**Authentication:** Required (Owner, Admin, Staff)

**Request:**
- **Method:** POST
- **Body:**
```json
{
  "obligation_id": "uuid",
  "frequency": "MONTHLY",
  "start_date": "2025-01-01",
  "custom_schedule": {
    "day_of_month": 15,
    "adjust_for_business_days": true
  }
}
```

**Request Schema:**
```typescript
interface CreateScheduleRequest {
  obligation_id: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'ONE_TIME' | 'CONTINUOUS' | 'EVENT_TRIGGERED';
  start_date: string; // ISO date
  custom_schedule?: {
    day_of_month?: number;
    day_of_week?: number;
    adjust_for_business_days?: boolean;
    reminder_days?: number[];
    [key: string]: any;
  };
}
```

**Response:** 201 Created
```json
{
  "data": {
    "id": "uuid",
    "obligation_id": "uuid",
    "frequency": "MONTHLY",
    "base_date": "2025-01-01",
    "next_due_date": "2025-02-01",
    "status": "ACTIVE",
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `422 UNPROCESSABLE_ENTITY` - Validation error
- `404 NOT_FOUND` - Obligation not found

**Rate Limiting:** 50 schedules/hour per user

---

## 13.5 PUT /api/v1/schedules/{scheduleId}

**Purpose:** Update monitoring schedule

**Authentication:** Required (Owner, Admin, Staff)

**Request:**
- **Method:** PUT
- **Path Parameters:**
  - `scheduleId` (UUID, required) - Schedule identifier
- **Body:**
```json
{
  "frequency": "QUARTERLY",
  "custom_schedule": {
    "day_of_month": 1,
    "adjust_for_business_days": false
  }
}
```

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "obligation_id": "uuid",
    "frequency": "QUARTERLY",
    "base_date": "2025-01-01",
    "next_due_date": "2025-04-01",
    "status": "ACTIVE",
    "modified_by": "uuid",
    "modified_at": "2025-01-01T12:00:00Z",
    "previous_values": {
      "frequency": "MONTHLY",
      "custom_schedule": {...}
    },
    "updated_at": "2025-01-01T12:00:00Z"
  }
}
```

**Audit Trail:** Logs schedule modifications (modified_by, modified_at, previous_values)

**Reference:** PLS Section B.7.3 (Schedule Modifications Logged)

**Error Codes:**
- `404 NOT_FOUND` - Schedule not found
- `422 UNPROCESSABLE_ENTITY` - Validation error

**Rate Limiting:** 50 updates/hour per user

---

## 13.6 DELETE /api/v1/schedules/{scheduleId}

**Purpose:** Delete schedule (archive)

**Authentication:** Required (Owner, Admin, Staff)

**Request:**
- **Method:** DELETE
- **Path Parameters:**
  - `scheduleId` (UUID, required) - Schedule identifier

**Response:** 200 OK
```json
{
  "data": {
    "message": "Schedule deleted successfully"
  }
}
```

**Note:** Sets status to ARCHIVED rather than hard delete

**Error Codes:**
- `404 NOT_FOUND` - Schedule not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 20 deletions/hour per user

---

# 14. Review Queue Endpoints

## 14.1 GET /api/v1/review-queue

**Purpose:** List items in review queue

**Authentication:** Required (Owner, Admin, Staff)

**Request:**
- **Method:** GET
- **Query Parameters:**
  - `filter[review_status]` (optional) - Filter by review status
  - `filter[is_subjective]` (optional) - Filter by subjective flag
  - `filter[document_id]` (optional) - Filter by document
  - `sort` (optional) - Sort field (e.g., `-created_at`)
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "obligation_id": "uuid",
      "document_id": "uuid",
      "review_status": "PENDING_INTERPRETATION",
      "is_subjective": true,
      "confidence_score": 0.75,
      "original_text": "string",
      "created_at": "2025-01-01T12:00:00Z"
    }
  ],
  "pagination": {...}
}
```

**Filterable Fields:**
- `review_status` (enum: PENDING, PENDING_INTERPRETATION)
- `is_subjective` (boolean)
- `document_id` (UUID)
- `confidence_score` (range)

**Sortable Fields:**
- `created_at`, `confidence_score`, `review_status`

**Error Codes:**
- `400 BAD_REQUEST` - Invalid filter/sort

**Rate Limiting:** 100 requests/hour per user

---

## 14.2 PUT /api/v1/review-queue/{itemId}/confirm

**Purpose:** Confirm extraction (mark as confirmed)

**Authentication:** Required (Owner, Admin, Staff)

**Request:**
- **Method:** PUT
- **Path Parameters:**
  - `itemId` (UUID, required) - Review queue item ID (obligation ID)

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "review_status": "CONFIRMED",
    "reviewed_by": "uuid",
    "reviewed_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Item not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 confirms/hour per user

---

## 14.3 PUT /api/v1/review-queue/{itemId}/reject

**Purpose:** Reject extraction

**Authentication:** Required (Owner, Admin, Staff)

**Request:**
- **Method:** PUT
- **Path Parameters:**
  - `itemId` (UUID, required) - Review queue item ID
- **Body (optional):**
```json
{
  "rejection_reason": "string"
}
```

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "review_status": "REJECTED",
    "reviewed_by": "uuid",
    "reviewed_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Item not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 rejects/hour per user

---

## 14.4 PUT /api/v1/review-queue/{itemId}/edit

**Purpose:** Edit extraction (update obligation)

**Authentication:** Required (Owner, Admin, Staff)

**Request:**
- **Method:** PUT
- **Path Parameters:**
  - `itemId` (UUID, required) - Review queue item ID
- **Body:**
```json
{
  "obligation_title": "string",
  "obligation_description": "string",
  "category": "MONITORING",
  "frequency": "MONTHLY",
  "deadline_date": "2025-01-15"
}
```

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "review_status": "EDITED",
    "reviewed_by": "uuid",
    "reviewed_at": "2025-01-01T12:00:00Z",
    "version_number": 2
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Item not found
- `403 FORBIDDEN` - Insufficient permissions
- `422 UNPROCESSABLE_ENTITY` - Validation error

**Rate Limiting:** 100 edits/hour per user

---

# 15. Alerts Endpoints

## 15.1 GET /api/v1/users/{userId}/notification-preferences

**Purpose:** Retrieve user notification preferences

**Authentication:** Required (all roles, own preferences or Admin)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `userId` (UUID, required) - User identifier

**Response:** 200 OK
```json
{
  "data": {
    "user_id": "uuid",
    "preferences": [
      {
        "notification_type": "DEADLINE_WARNING_7D",
        "channel_preference": "EMAIL_AND_SMS",
        "frequency_preference": "IMMEDIATE",
        "enabled": true
      }
    ]
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - User not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 requests/hour per user

**Reference:** Notification & Messaging (2.4) Section 7

---

## 15.2 PUT /api/v1/users/{userId}/notification-preferences

**Purpose:** Update user notification preferences

**Authentication:** Required (all roles, own preferences or Admin)

**Request:**
- **Method:** PUT
- **Path Parameters:**
  - `userId` (UUID, required) - User identifier
- **Body:**
```json
{
  "notification_type": "DEADLINE_WARNING_7D",
  "channel_preference": "EMAIL_ONLY",
  "frequency_preference": "DAILY_DIGEST",
  "enabled": true
}
```

**Request Schema:**
```typescript
interface UpdateNotificationPreferenceRequest {
  notification_type: string;
  channel_preference: 'EMAIL_ONLY' | 'SMS_ONLY' | 'EMAIL_AND_SMS' | 'IN_APP_ONLY' | 'ALL_CHANNELS';
  frequency_preference: 'IMMEDIATE' | 'DAILY_DIGEST' | 'WEEKLY_DIGEST' | 'NEVER';
  enabled: boolean;
}
```

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "notification_type": "DEADLINE_WARNING_7D",
    "channel_preference": "EMAIL_ONLY",
    "frequency_preference": "DAILY_DIGEST",
    "enabled": true,
    "updated_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - User not found
- `422 UNPROCESSABLE_ENTITY` - Validation error

**Rate Limiting:** 10 updates/hour per user

**Reference:** Notification & Messaging (2.4) Section 7

---

## 15.3 GET /api/v1/notifications

**Purpose:** Retrieve notification history

**Authentication:** Required (all roles, own notifications or Admin)

**Request:**
- **Method:** GET
- **Query Parameters:**
  - `filter[notification_type]` (optional) - Filter by notification type
  - `filter[channel]` (optional) - Filter by channel
  - `filter[status]` (optional) - Filter by status
  - `filter[read_at]` (optional) - Filter by read status (null = unread)
  - `sort` (optional) - Sort field (e.g., `-created_at`)
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size (default: 20, max: 100)

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "notification_type": "DEADLINE_WARNING_7D",
      "channel": "EMAIL",
      "subject": "string",
      "status": "DELIVERED",
      "read_at": "2025-01-01T12:00:00Z",
      "created_at": "2025-01-01T12:00:00Z"
    }
  ],
  "pagination": {
    "cursor": "base64_encoded_cursor",
    "has_more": true,
    "total": 150
  }
}
```

**Error Codes:**
- `400 BAD_REQUEST` - Invalid filter/sort

**Rate Limiting:** 100 requests/hour per user

**Reference:** Notification & Messaging (2.4) Section 8.3

---

## 15.4 GET /api/v1/notifications/unread-count

**Purpose:** Get unread notification count

**Authentication:** Required (all roles)

**Request:**
- **Method:** GET

**Response:** 200 OK
```json
{
  "data": {
    "unread_count": 5,
    "unread_by_channel": {
      "EMAIL": 2,
      "IN_APP": 3,
      "SMS": 0
    }
  }
}
```

**Rate Limiting:** 100 requests/hour per user

---

## 15.5 PUT /api/v1/notifications/{notificationId}/read

**Purpose:** Mark notification as read

**Authentication:** Required (all roles, own notification)

**Request:**
- **Method:** PUT
- **Path Parameters:**
  - `notificationId` (UUID, required) - Notification identifier

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "read_at": "2025-01-01T12:00:00Z",
    "updated_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Notification not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 200 marks/hour per user

---

## 15.6 PUT /api/v1/notifications/{notificationId}/unread

**Purpose:** Mark notification as unread

**Authentication:** Required (all roles, own notification)

**Request:**
- **Method:** PUT
- **Path Parameters:**
  - `notificationId` (UUID, required) - Notification identifier

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "read_at": null,
    "updated_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Notification not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 200 marks/hour per user

---

# 16. Audit Pack Generator Endpoints

## 16.1 GET /api/v1/audit-packs

**Purpose:** List audit packs

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Query Parameters:**
  - `filter[site_id]` (optional) - Filter by site
  - `filter[status]` (optional) - Filter by status
  - `filter[date_range_start][gte]` (optional) - Filter by date range
  - `sort` (optional) - Sort field (e.g., `-created_at`)
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "site_id": "uuid",
      "title": "string",
      "status": "COMPLETED",
      "date_range_start": "2025-01-01",
      "date_range_end": "2025-12-31",
      "obligation_count": 25,
      "evidence_count": 50,
      "generated_at": "2025-01-01T12:10:00Z",
      "created_at": "2025-01-01T12:00:00Z"
    }
  ],
  "pagination": {...}
}
```

**Filterable Fields:**
- `site_id` (UUID)
- `company_id` (UUID - via site)
- `status` (enum)
- `date_range_start` (date range)
- `created_at` (date range)

**Sortable Fields:**
- `created_at`, `generated_at`, `date_range_start`

**Error Codes:**
- `400 BAD_REQUEST` - Invalid filter/sort

**Rate Limiting:** 100 requests/hour per user

---

## 16.2 POST /api/v1/audit-packs

> [v1 UPDATE – Pack Type Parameter – 2024-12-27]

**Purpose:** Trigger audit pack generation (supports all pack types)

**Authentication:** Required (Owner, Admin, Staff, Consultant for assigned clients)

**Request:**
- **Method:** POST
- **Body:**
```json
{
  "site_id": "uuid",
  "pack_type": "AUDIT_PACK",
  "date_range": {
    "start": "2025-01-01",
    "end": "2025-12-31"
  },
  "obligation_ids": ["uuid1", "uuid2"],
  "include_archived": false,
  "recipient_type": "INTERNAL",
  "recipient_name": "Internal Audit",
  "purpose": "Annual compliance review"
}
```

**Request Schema:**
```typescript
interface CreateAuditPackRequest {
  pack_type: 'AUDIT_PACK' | 'REGULATOR_INSPECTION' | 'TENDER_CLIENT_ASSURANCE' | 'BOARD_MULTI_SITE_RISK' | 'INSURER_BROKER';
  // Board Pack: company_id required, site_id must be null
  // All other packs: site_id required, company_id derived from site
  company_id?: string;  // Required for Board Pack only
  site_id?: string;     // Required for all packs except Board Pack
  document_id?: string; // Optional for Board Pack (multi-site), required for other packs
  date_range: {
    start: string; // ISO date
    end: string; // ISO date
  };
  obligation_ids?: string[]; // Optional: specific obligations
  include_archived?: boolean; // Default: false
  recipient_type?: 'REGULATOR' | 'CLIENT' | 'BOARD' | 'INSURER' | 'INTERNAL';
  recipient_name?: string;
  purpose?: string;
}
```

**Validation Rules:**
- **If** `pack_type === 'BOARD_MULTI_SITE_RISK'`:
  - `company_id` MUST be provided
  - `site_id` MUST be `null` or omitted
  - User MUST be Owner or Admin
- **Else** (all other pack types):
  - `site_id` MUST be provided
  - `company_id` is derived from `site_id` (not required in request)
  - `document_id` is required (except for Audit Pack which can be multi-document)

**Plan-Based Access Control:**
- Core Plan: `REGULATOR_INSPECTION`, `AUDIT_PACK` only
- Growth Plan: All pack types
- Consultant Edition: All pack types (for assigned clients)

**Validation:**
- Validates user plan has access to requested `pack_type`
- **If** `pack_type === 'BOARD_MULTI_SITE_RISK'`:
  - Validates `company_id` is provided and `site_id` is null
  - Validates user is Owner or Admin (returns `403 FORBIDDEN` if Staff)
- **Else**:
  - Validates `site_id` is provided
  - Validates user has access to site
- Returns `403 FORBIDDEN` if pack type not available for user's plan
- Returns `422 UNPROCESSABLE_ENTITY` if validation fails (missing company_id for Board Pack, missing site_id for other packs)

**Response:** 202 Accepted
```json
{
  "data": {
    "job_id": "uuid",
    "status": "QUEUED",
    "estimated_completion_time": "2025-01-01T12:10:00Z"
  }
}
```

**Integration:** Creates background job (Audit Pack Generation Job - see Background Jobs 2.3)

**Reference Integrity:** Validates evidence/obligation references (see PLS Section B.8.3)

**Error Codes:**
- `404 NOT_FOUND` - Site not found
- `422 UNPROCESSABLE_ENTITY` - Validation error

**Rate Limiting:** 5 generations/hour per user

---

## 16.3 GET /api/v1/audit-packs/{auditPackId}

**Purpose:** Retrieve audit pack details

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `auditPackId` (UUID, required) - Audit pack identifier

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "site_id": "uuid",
    "status": "COMPLETED",
    "download_url": "string",
    "preview_url": "string",
    "obligation_count": 25,
    "evidence_count": 50,
    "generated_at": "2025-01-01T12:10:00Z",
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Audit pack not found
- `202 ACCEPTED` - Generation in progress (returns current status)

**Rate Limiting:** 100 requests/hour per user

---

## 16.4 GET /api/v1/audit-packs/{auditPackId}/download

**Purpose:** Download audit pack PDF

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `auditPackId` (UUID, required) - Audit pack identifier

**Response:** 200 OK
- **Content-Type:** `application/pdf`
- **Body:** PDF file binary

**Headers:**
```
Content-Disposition: attachment; filename="audit-pack-{id}.pdf"
Content-Length: {file_size}
```

**Error Codes:**
- `404 NOT_FOUND` - Audit pack not found
- `202 ACCEPTED` - Generation in progress

**Rate Limiting:** 10 downloads/hour per user

---

> [v1 UPDATE – Pack-Specific Endpoints – 2024-12-27]

# 16. v1.0 Pack-Specific Endpoints

## 16.6 POST /api/v1/packs/regulator

**Purpose:** Generate Regulator/Inspection Pack (Core plan, included)

**Authentication:** Required (Owner, Admin, Staff)

**Plan Requirement:** Core Plan or higher

**Request:**
- **Method:** POST
- **Body:**
```json
{
  "site_id": "uuid",
  "document_id": "uuid",
  "date_range": {
    "start": "2025-01-01",
    "end": "2025-12-31"
  },
  "recipient_name": "Environment Agency Inspector"
}
```

**Response:** 202 Accepted (same as Section 16.2)

**Reference:** Product Logic Specification Section I.8.2 (Regulator/Inspection Pack Logic)

---

## 16.7 POST /api/v1/packs/tender

**Purpose:** Generate Tender/Client Assurance Pack (Growth plan)

**Authentication:** Required (Owner, Admin, Staff, Consultant for assigned clients)

**Plan Requirement:** Growth Plan or Consultant Edition

**Request:**
- **Method:** POST
- **Body:**
```json
{
  "site_id": "uuid",
  "document_id": "uuid",
  "date_range": {
    "start": "2025-01-01",
    "end": "2025-12-31"
  },
  "recipient_name": "Client Name",
  "purpose": "Tender submission"
}
```

**Response:** 202 Accepted (same as Section 16.2)

**Reference:** Product Logic Specification Section I.8.3 (Tender/Client Assurance Pack Logic)

---

## 16.8 POST /api/v1/packs/board

**Purpose:** Generate Board/Multi-Site Risk Pack (Growth plan)

**Authentication:** Required (Owner, Admin)

**Plan Requirement:** Growth Plan or Consultant Edition

**Request:**
- **Method:** POST
- **Body:**
```json
{
  "company_id": "uuid",
  "date_range": {
    "start": "2025-01-01",
    "end": "2025-12-31"
  },
  "include_all_sites": true
}
```

**Note:** Board Pack requires `company_id` (not `site_id`) for multi-site aggregation.

**Response:** 202 Accepted (same as Section 16.2)

**Reference:** Product Logic Specification Section I.8.4 (Board/Multi-Site Risk Pack Logic)

---

## 16.9 POST /api/v1/packs/insurer

**Purpose:** Generate Insurer/Broker Pack (Growth plan, requires Growth Plan same as Tender Pack — independent pack type)

**Authentication:** Required (Owner, Admin, Staff, Consultant for assigned clients)

**Plan Requirement:** Growth Plan or Consultant Edition

**Request:**
- **Method:** POST
- **Body:**
```json
{
  "site_id": "uuid",
  "document_id": "uuid",
  "date_range": {
    "start": "2025-01-01",
    "end": "2025-12-31"
  },
  "recipient_name": "Insurance Broker",
  "purpose": "Insurance renewal"
}
```

**Response:** 202 Accepted (same as Section 16.2)

**Reference:** Product Logic Specification Section I.8.5 (Insurer/Broker Pack Logic)

---

> [v1 UPDATE – Pack Distribution Endpoints – 2024-12-27]

# 16. Pack Distribution Endpoints

## 16.10 GET /api/v1/packs/{packId}/share

**Purpose:** Generate shareable link for pack

**Authentication:** Required (Owner, Admin, Staff)

**Plan Requirement:** Growth Plan or Consultant Edition

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `packId` (UUID, required) - Pack identifier
- **Query Parameters:**
  - `expires_in_days` (optional, default: 30) - Link expiration in days

**Response:** 200 OK
```json
{
  "data": {
    "shareable_link": "https://app.oblicore.com/share/packs/{token}",
    "token": "uuid-token",
    "expires_at": "2025-02-01T12:00:00Z",
    "view_count": 0
  }
}
```

**Error Codes:**
- `403 FORBIDDEN` - Pack type doesn't support sharing (Core Plan packs)
- `404 NOT_FOUND` - Pack not found

---

## 16.11 POST /api/v1/packs/{packId}/distribute

**Purpose:** Distribute pack via email or shared link

**Authentication:** Required (Owner, Admin, Staff)

**Plan Requirement:** Growth Plan or Consultant Edition

**Request:**
- **Method:** POST
- **Path Parameters:**
  - `packId` (UUID, required) - Pack identifier
- **Body:**
```json
{
  "distribution_method": "EMAIL",
  "recipients": [
    {
      "email": "recipient@example.com",
      "name": "Recipient Name"
    }
  ],
  "message": "Please find attached compliance pack"
}
```

**Distribution Methods:**
- `EMAIL`: Send pack via email attachment
- `SHARED_LINK`: Generate and send shareable link

**Response:** 200 OK
```json
{
  "data": {
    "distribution_id": "uuid",
    "status": "SENT",
    "sent_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `403 FORBIDDEN` - Pack type doesn't support distribution
- `404 NOT_FOUND` - Pack not found
- `422 UNPROCESSABLE_ENTITY` - Invalid recipients

**Reference:** Product Logic Specification Section I.8.7 (Pack Distribution Logic)

---

# 17. Module 2 Endpoints

## 17.1 GET /api/v1/module-2/consents

**Purpose:** List consents

**Authentication:** Required (all roles, Module 2 active, RLS applies)

**Request:**
- **Method:** GET
- **Query Parameters:**
  - `filter[site_id]` (optional) - Filter by site
  - `sort` (optional) - Sort field
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "site_id": "uuid",
      "reference_number": "string",
      "water_company": "string",
      "created_at": "2025-01-01T12:00:00Z"
    }
  ],
  "pagination": {...}
}
```

**Error Codes:**
- `403 FORBIDDEN` - Module 2 not active

**Rate Limiting:** 100 requests/hour per user

---

## 17.2 GET /api/v1/module-2/consents/{consentId}

**Purpose:** Get consent details

**Authentication:** Required (all roles, Module 2 active, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `consentId` (UUID, required) - Consent identifier

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "site_id": "uuid",
    "reference_number": "string",
    "water_company": "string",
    "parameters": [
      {
        "parameter_name": "BOD",
        "limit_value": 40.0
      }
    ],
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Consent not found
- `403 FORBIDDEN` - Module 2 not active

**Rate Limiting:** 100 requests/hour per user

---

## 17.3 POST /api/v1/module-2/consents

**Purpose:** Upload consent document

**Authentication:** Required (Owner, Admin, Staff, Module 2 active)

**Request:**
- **Method:** POST
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file` (File, required) - Consent document
  - `site_id` (UUID, required) - Site identifier
  - `metadata` (JSON, optional) - Additional metadata

**Response:** 201 Created
```json
{
  "data": {
    "id": "uuid",
    "site_id": "uuid",
    "status": "UPLOADED",
    "extraction_status": "PENDING",
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `400 BAD_REQUEST` - Invalid file
- `403 FORBIDDEN` - Module 2 not active

**Rate Limiting:** 10 uploads/hour per user

---

## 17.4 POST /api/v1/module-2/lab-results

**Purpose:** Import lab results (CSV/PDF)

**Authentication:** Required (Owner, Admin, Staff, Module 2 active)

**Request:**
- **Method:** POST
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file` (File, required) - Lab results file (CSV or PDF)
  - `consent_id` (UUID, required) - Consent identifier
  - `import_format` (enum, required) - `CSV`, `PDF`

**Response:** 201 Created
```json
{
  "data": {
    "job_id": "uuid",
    "status": "QUEUED",
    "estimated_completion_time": "2025-01-01T12:05:00Z"
  }
}
```

**Error Codes:**
- `400 BAD_REQUEST` - Invalid file format
- `404 NOT_FOUND` - Consent not found
- `403 FORBIDDEN` - Module 2 not active

**Rate Limiting:** 10 imports/hour per user

---

## 17.5 GET /api/v1/module-2/lab-results/{resultId}

**Purpose:** Get lab result details

**Authentication:** Required (all roles, Module 2 active, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `resultId` (UUID, required) - Lab result identifier

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "consent_id": "uuid",
    "sample_date": "2025-01-01",
    "parameters": [
      {
        "parameter_name": "BOD",
        "value": 35.5,
        "limit": 40.0
      }
    ],
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Lab result not found
- `403 FORBIDDEN` - Module 2 not active

**Rate Limiting:** 100 requests/hour per user

---

## 17.6 GET /api/v1/module-2/parameters

**Purpose:** Retrieve parameter tracking data

**Authentication:** Required (all roles, Module 2 active, RLS applies)

**Request:**
- **Method:** GET
- **Query Parameters:**
  - `filter[consent_id]` (optional) - Filter by consent
  - `filter[parameter_name]` (optional) - Filter by parameter name
  - `filter[exceeded]` (optional) - Filter by exceedance status
  - `sort` (optional) - Sort field
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "consent_id": "uuid",
      "parameter_name": "BOD",
      "current_value": 35.5,
      "limit_value": 40.0,
      "percentage": 88.75,
      "sample_date": "2025-01-01",
      "exceeded": false
    }
  ],
  "pagination": {...}
}
```

**Error Codes:**
- `400 BAD_REQUEST` - Invalid filter/sort
- `403 FORBIDDEN` - Module 2 not active

**Rate Limiting:** 100 requests/hour per user

---

## 17.7 GET /api/v1/module-2/exceedances

**Purpose:** Retrieve exceedance alerts

**Authentication:** Required (all roles, Module 2 active, RLS applies)

**Request:**
- **Method:** GET
- **Query Parameters:**
  - `filter[threshold]` (optional) - Filter by threshold (80, 90, 100)
  - `filter[consent_id]` (optional) - Filter by consent
  - `sort` (optional) - Sort field
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "parameter_id": "uuid",
      "threshold": 80,
      "current_value": 35.5,
      "limit_value": 40.0,
      "percentage": 88.75,
      "alerted_at": "2025-01-01T12:00:00Z"
    }
  ],
  "pagination": {...}
}
```

**Error Codes:**
- `400 BAD_REQUEST` - Invalid filter/sort
- `403 FORBIDDEN` - Module 2 not active

**Rate Limiting:** 100 requests/hour per user

---

## 17.8 POST /api/v1/module-2/water-company-reports

**Purpose:** Generate water company report

**Authentication:** Required (Owner, Admin, Staff, Module 2 active)

**Request:**
- **Method:** POST
- **Body:**
```json
{
  "consent_id": "uuid",
  "date_range": {
    "start": "2025-01-01",
    "end": "2025-12-31"
  },
  "parameters": ["BOD", "COD", "pH"]
}
```

**Response:** 202 Accepted
```json
{
  "data": {
    "job_id": "uuid",
    "status": "QUEUED",
    "estimated_completion_time": "2025-01-01T12:05:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Consent not found
- `422 UNPROCESSABLE_ENTITY` - Validation error
- `403 FORBIDDEN` - Module 2 not active

**Rate Limiting:** 5 reports/hour per user

---

## 17.9 GET /api/v1/module-2/water-company-reports/{reportId}

**Purpose:** Get water company report details/download

**Authentication:** Required (all roles, Module 2 active, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `reportId` (UUID, required) - Report identifier

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "consent_id": "uuid",
    "status": "COMPLETED",
    "download_url": "string",
    "generated_at": "2025-01-01T12:05:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Report not found
- `202 ACCEPTED` - Generation in progress

**Rate Limiting:** 100 requests/hour per user

---

## 17.10 GET /api/v1/module-2/discharge-volumes

**Purpose:** List discharge volume records

**Authentication:** Required (all roles, Module 2 active, RLS applies)

**Request:**
- **Method:** GET
- **Query Parameters:**
  - `filter[consent_id]` (optional) - Filter by consent
  - `filter[date][gte]` (optional) - Filter by date range
  - `filter[date][lte]` (optional) - Filter by date range
  - `sort` (optional) - Sort field (e.g., `-date`)
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "consent_id": "uuid",
      "date": "2025-01-01",
      "volume_m3": 1500.5,
      "created_at": "2025-01-01T12:00:00Z"
    }
  ],
  "pagination": {...}
}
```

**Error Codes:**
- `403 FORBIDDEN` - Module 2 not active

**Rate Limiting:** 100 requests/hour per user

---

## 17.11 POST /api/v1/module-2/discharge-volumes

**Purpose:** Create discharge volume record

**Authentication:** Required (Owner, Admin, Staff, Module 2 active)

**Request:**
- **Method:** POST
- **Body:**
```json
{
  "consent_id": "uuid",
  "date": "2025-01-01",
  "volume_m3": 1500.5,
  "source": "MANUAL"
}
```

**Response:** 201 Created
```json
{
  "data": {
    "id": "uuid",
    "consent_id": "uuid",
    "date": "2025-01-01",
    "volume_m3": 1500.5,
    "source": "MANUAL",
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Consent not found
- `422 UNPROCESSABLE_ENTITY` - Validation error
- `403 FORBIDDEN` - Module 2 not active

**Rate Limiting:** 100 entries/hour per user

---

## 17.12 GET /api/v1/module-2/discharge-volumes/{volumeId}

**Purpose:** Get discharge volume record details

**Authentication:** Required (all roles, Module 2 active, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `volumeId` (UUID, required) - Discharge volume identifier

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "consent_id": "uuid",
    "date": "2025-01-01",
    "volume_m3": 1500.5,
    "source": "MANUAL",
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Record not found
- `403 FORBIDDEN` - Module 2 not active

**Rate Limiting:** 100 requests/hour per user

---

# 18. Module 3 Endpoints

## 18.1 GET /api/v1/module-3/mcpd-registrations

**Purpose:** List MCPD registrations

**Authentication:** Required (all roles, Module 3 active, RLS applies)

**Request:**
- **Method:** GET
- **Query Parameters:**
  - `filter[site_id]` (optional) - Filter by site
  - `sort` (optional) - Sort field
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "site_id": "uuid",
      "reference_number": "string",
      "created_at": "2025-01-01T12:00:00Z"
    }
  ],
  "pagination": {...}
}
```

**Error Codes:**
- `403 FORBIDDEN` - Module 3 not active

**Rate Limiting:** 100 requests/hour per user

---

## 18.2 GET /api/v1/module-3/mcpd-registrations/{registrationId}

**Purpose:** Get MCPD registration details

**Authentication:** Required (all roles, Module 3 active, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `registrationId` (UUID, required) - Registration identifier

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "site_id": "uuid",
    "reference_number": "string",
    "generators": [
      {
        "id": "uuid",
        "name": "string",
        "type": "MCPD_1_5MW"
      }
    ],
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Registration not found
- `403 FORBIDDEN` - Module 3 not active

**Rate Limiting:** 100 requests/hour per user

---

## 18.3 POST /api/v1/module-3/mcpd-registrations

**Purpose:** Upload MCPD registration document

**Authentication:** Required (Owner, Admin, Staff, Module 3 active)

**Request:**
- **Method:** POST
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file` (File, required) - MCPD registration document
  - `site_id` (UUID, required) - Site identifier
  - `metadata` (JSON, optional) - Additional metadata

**Response:** 201 Created
```json
{
  "data": {
    "id": "uuid",
    "site_id": "uuid",
    "status": "UPLOADED",
    "extraction_status": "PENDING",
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `400 BAD_REQUEST` - Invalid file
- `403 FORBIDDEN` - Module 3 not active

**Rate Limiting:** 10 uploads/hour per user

---

## 18.4 GET /api/v1/module-3/generators

**Purpose:** List generators

**Authentication:** Required (all roles, Module 3 active, RLS applies)

**Request:**
- **Method:** GET
- **Query Parameters:**
  - `filter[mcpd_registration_id]` (optional) - Filter by registration
  - `filter[site_id]` (optional) - Filter by site
  - `sort` (optional) - Sort field
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "mcpd_registration_id": "uuid",
      "name": "string",
      "type": "MCPD_1_5MW",
      "annual_limit_hours": 8760,
      "created_at": "2025-01-01T12:00:00Z"
    }
  ],
  "pagination": {...}
}
```

**Error Codes:**
- `403 FORBIDDEN` - Module 3 not active

**Rate Limiting:** 100 requests/hour per user

---

## 18.5 GET /api/v1/module-3/generators/{generatorId}

**Purpose:** Get generator details

**Authentication:** Required (all roles, Module 3 active, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `generatorId` (UUID, required) - Generator identifier

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "mcpd_registration_id": "uuid",
    "name": "string",
    "type": "MCPD_1_5MW",
    "annual_limit_hours": 8760,
    "monthly_limit_hours": 730,
    "current_hours": 150.5,
    "percentage_used": 1.72,
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Generator not found
- `403 FORBIDDEN` - Module 3 not active

**Rate Limiting:** 100 requests/hour per user

---

## 18.6 GET /api/v1/module-3/run-hours

**Purpose:** List run-hour records

**Authentication:** Required (all roles, Module 3 active, RLS applies)

**Request:**
- **Method:** GET
- **Query Parameters:**
  - `filter[generator_id]` (optional) - Filter by generator
  - `filter[date][gte]` (optional) - Filter by date range
  - `filter[date][lte]` (optional) - Filter by date range
  - `sort` (optional) - Sort field (e.g., `-date`)
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "generator_id": "uuid",
      "hours": 150.5,
      "date": "2025-01-01",
      "source": "MANUAL",
      "created_at": "2025-01-01T12:00:00Z"
    }
  ],
  "pagination": {...}
}
```

**Error Codes:**
- `403 FORBIDDEN` - Module 3 not active

**Rate Limiting:** 100 requests/hour per user

---

## 18.7 GET /api/v1/module-3/run-hours/{recordId}

**Purpose:** Get run-hour record details

**Authentication:** Required (all roles, Module 3 active, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `recordId` (UUID, required) - Run-hour record identifier

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "generator_id": "uuid",
    "hours": 150.5,
    "date": "2025-01-01",
    "source": "MANUAL",
    "maintenance_record_id": null,
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Record not found
- `403 FORBIDDEN` - Module 3 not active

**Rate Limiting:** 100 requests/hour per user

---

## 18.8 PUT /api/v1/module-3/run-hours/{recordId}

**Purpose:** Update run-hour record

**Authentication:** Required (Owner, Admin, Staff, Module 3 active)

**Request:**
- **Method:** PUT
- **Path Parameters:**
  - `recordId` (UUID, required) - Run-hour record identifier
- **Body:**
```json
{
  "hours": 155.0,
  "date": "2025-01-01"
}
```

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "hours": 155.0,
    "date": "2025-01-01",
    "updated_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Record not found
- `403 FORBIDDEN` - Module 3 not active
- `422 UNPROCESSABLE_ENTITY` - Validation error

**Rate Limiting:** 100 updates/hour per user

---

## 18.9 POST /api/v1/module-3/run-hours

## 15.1 POST /api/v1/module-3/run-hours

**Purpose:** Create run-hour entry

**Authentication:** Required (Owner, Admin, Staff, Module 3 active)

**Request:**
- **Method:** POST
- **Body:**
```json
{
  "generator_id": "uuid",
  "hours": 150.5,
  "date": "2025-01-01",
  "source": "MANUAL",
  "maintenance_record_id": "uuid"
}
```

**Request Schema:**
```typescript
interface CreateRunHourRequest {
  generator_id: string;
  hours: number;
  date: string; // ISO date
  source: 'MANUAL' | 'AUTOMATIC';
  maintenance_record_id?: string; // Optional: link to maintenance record
}
```

**Response:** 201 Created
```json
{
  "data": {
    "id": "uuid",
    "generator_id": "uuid",
    "hours": 150.5,
    "date": "2025-01-01",
    "source": "MANUAL",
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Generator not found
- `422 UNPROCESSABLE_ENTITY` - Validation error
- `403 FORBIDDEN` - Module 3 not active

**Rate Limiting:** 100 entries/hour per user

---

## 18.10 GET /api/v1/module-3/aer/{aerId}

**Purpose:** Get AER details/download

**Authentication:** Required (all roles, Module 3 active, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `aerId` (UUID, required) - AER identifier

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "mcpd_registration_id": "uuid",
    "year": 2025,
    "status": "COMPLETED",
    "download_url": "string",
    "generated_at": "2025-01-01T12:10:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - AER not found
- `202 ACCEPTED` - Generation in progress

**Rate Limiting:** 100 requests/hour per user

---

## 18.11 POST /api/v1/module-3/aer/generate

**Purpose:** Trigger AER generation

**Authentication:** Required (Owner, Admin, Staff, Module 3 active)

**Request:**
- **Method:** POST
- **Body:**
```json
{
  "mcpd_registration_id": "uuid",
  "year": 2025,
  "generators": ["uuid1", "uuid2"]
}
```

**Response:** 202 Accepted
```json
{
  "data": {
    "job_id": "uuid",
    "status": "QUEUED",
    "estimated_completion_time": "2025-01-01T12:10:00Z"
  }
}
```

**Integration:** Creates background job (AER Generation Job - see Background Jobs 2.3)

**Error Codes:**
- `404 NOT_FOUND` - Registration not found
- `422 UNPROCESSABLE_ENTITY` - Validation error
- `403 FORBIDDEN` - Module 3 not active

**Rate Limiting:** 5 generations/hour per user

---

## 18.12 GET /api/v1/module-3/stack-tests

**Purpose:** List stack tests

**Authentication:** Required (all roles, Module 3 active, RLS applies)

**Request:**
- **Method:** GET
- **Query Parameters:**
  - `filter[generator_id]` (optional) - Filter by generator
  - `sort` (optional) - Sort field
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "generator_id": "uuid",
      "scheduled_date": "2025-06-01",
      "test_type": "ANNUAL",
      "status": "SCHEDULED",
      "created_at": "2025-01-01T12:00:00Z"
    }
  ],
  "pagination": {...}
}
```

**Error Codes:**
- `403 FORBIDDEN` - Module 3 not active

**Rate Limiting:** 100 requests/hour per user

---

## 18.13 GET /api/v1/module-3/stack-tests/{testId}

**Purpose:** Get stack test details

**Authentication:** Required (all roles, Module 3 active, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `testId` (UUID, required) - Stack test identifier

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "generator_id": "uuid",
    "scheduled_date": "2025-06-01",
    "test_type": "ANNUAL",
    "status": "SCHEDULED",
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Stack test not found
- `403 FORBIDDEN` - Module 3 not active

**Rate Limiting:** 100 requests/hour per user

---

## 18.14 POST /api/v1/module-3/stack-tests

**Purpose:** Create stack test schedule

**Authentication:** Required (Owner, Admin, Staff, Module 3 active)

**Request:**
- **Method:** POST
- **Body:**
```json
{
  "generator_id": "uuid",
  "scheduled_date": "2025-06-01",
  "test_type": "ANNUAL"
}
```

**Response:** 201 Created
```json
{
  "data": {
    "id": "uuid",
    "generator_id": "uuid",
    "scheduled_date": "2025-06-01",
    "test_type": "ANNUAL",
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Generator not found
- `422 UNPROCESSABLE_ENTITY` - Validation error
- `403 FORBIDDEN` - Module 3 not active

**Rate Limiting:** 20 schedules/hour per user

---

## 18.15 GET /api/v1/module-3/maintenance-records

**Purpose:** List maintenance records

**Authentication:** Required (all roles, Module 3 active, RLS applies)

**Request:**
- **Method:** GET
- **Query Parameters:**
  - `filter[generator_id]` (optional) - Filter by generator
  - `filter[maintenance_type]` (optional) - Filter by type
  - `sort` (optional) - Sort field
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "generator_id": "uuid",
      "maintenance_type": "SCHEDULED",
      "date": "2025-01-01",
      "created_at": "2025-01-01T12:00:00Z"
    }
  ],
  "pagination": {...}
}
```

**Error Codes:**
- `403 FORBIDDEN` - Module 3 not active

**Rate Limiting:** 100 requests/hour per user

---

## 18.16 GET /api/v1/module-3/maintenance-records/{recordId}

**Purpose:** Get maintenance record details

**Authentication:** Required (all roles, Module 3 active, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `recordId` (UUID, required) - Maintenance record identifier

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "generator_id": "uuid",
    "maintenance_type": "SCHEDULED",
    "date": "2025-01-01",
    "description": "string",
    "file_url": "string",
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Record not found
- `403 FORBIDDEN` - Module 3 not active

**Rate Limiting:** 100 requests/hour per user

---

## 18.17 POST /api/v1/module-3/maintenance-records

**Purpose:** Create maintenance record

**Authentication:** Required (Owner, Admin, Staff, Module 3 active)

**Request:**
- **Method:** POST
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file` (File, optional) - Maintenance record file
  - `generator_id` (UUID, required) - Generator identifier
  - `maintenance_type` (enum, required) - Maintenance type
  - `date` (date, required) - Maintenance date
  - `description` (string, optional) - Description

**Response:** 201 Created
```json
{
  "data": {
    "id": "uuid",
    "generator_id": "uuid",
    "maintenance_type": "SCHEDULED",
    "date": "2025-01-01",
    "description": "string",
    "file_url": "string",
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Generator not found
- `422 UNPROCESSABLE_ENTITY` - Validation error
- `403 FORBIDDEN` - Module 3 not active

**Rate Limiting:** 50 records/hour per user

---

# 19. Users Endpoints

## 19.1 GET /api/v1/users/{userId}

**Purpose:** Get user details

**Authentication:** Required (all roles, own user or Admin)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `userId` (UUID, required) - User identifier

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "string",
    "company_id": "uuid",
    "roles": ["OWNER"],
    "sites": ["uuid1", "uuid2"],
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - User not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 requests/hour per user

---

## 19.2 GET /api/v1/users

**Purpose:** List users (Admin only)

**Authentication:** Required (Owner, Admin)

**Request:**
- **Method:** GET
- **Query Parameters:**
  - `filter[company_id]` (optional) - Filter by company
  - `filter[is_active]` (optional) - Filter by active status
  - `sort` (optional) - Sort field
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "string",
      "company_id": "uuid",
      "is_active": true,
      "created_at": "2025-01-01T12:00:00Z"
    }
  ],
  "pagination": {...}
}
```

**Error Codes:**
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 requests/hour per user

---

## 19.3 POST /api/v1/users

**Purpose:** Create user (Admin only)

**Authentication:** Required (Owner, Admin)

**Request:**
- **Method:** POST
- **Body:**
```json
{
  "email": "user@example.com",
  "password": "string",
  "full_name": "string",
  "company_id": "uuid",
  "phone": "string"
}
```

**Response:** 201 Created
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "string",
    "company_id": "uuid",
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `409 CONFLICT` - Email already exists
- `422 UNPROCESSABLE_ENTITY` - Validation error
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 10 creations/hour per user

---

## 19.4 PUT /api/v1/users/{userId}

**Purpose:** Update user profile

**Authentication:** Required (all roles, own user or Admin)

**Request:**
- **Method:** PUT
- **Path Parameters:**
  - `userId` (UUID, required) - User identifier
- **Body:**
```json
{
  "full_name": "string",
  "phone": "string"
}
```

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "full_name": "string",
    "phone": "string",
    "updated_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - User not found
- `403 FORBIDDEN` - Insufficient permissions
- `422 UNPROCESSABLE_ENTITY` - Validation error

**Rate Limiting:** 10 updates/hour per user

---

## 19.5 DELETE /api/v1/users/{userId}

**Purpose:** Delete user (Admin only)

**Authentication:** Required (Owner, Admin)

**Request:**
- **Method:** DELETE
- **Path Parameters:**
  - `userId` (UUID, required) - User identifier

**Response:** 200 OK
```json
{
  "data": {
    "message": "User deleted successfully"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - User not found
- `403 FORBIDDEN` - Insufficient permissions
- `409 CONFLICT` - Cannot delete own account

**Rate Limiting:** 5 deletions/hour per user

---

## 19.6 GET /api/v1/users/{userId}/sites

**Purpose:** List sites assigned to user

**Authentication:** Required (all roles, own user or Admin)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `userId` (UUID, required) - User identifier

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "site_id": "uuid",
      "site_name": "string",
      "assigned_at": "2025-01-01T12:00:00Z"
    }
  ]
}
```

**Error Codes:**
- `404 NOT_FOUND` - User not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 requests/hour per user

---

## 19.7 POST /api/v1/users/{userId}/sites

**Purpose:** Assign user to site

**Authentication:** Required (Owner, Admin)

**Request:**
- **Method:** POST
- **Path Parameters:**
  - `userId` (UUID, required) - User identifier
- **Body:**
```json
{
  "site_id": "uuid"
}
```

**Response:** 201 Created
```json
{
  "data": {
    "user_id": "uuid",
    "site_id": "uuid",
    "assigned_by": "uuid",
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - User or site not found
- `409 CONFLICT` - Already assigned
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 50 assignments/hour per user

---

## 19.8 DELETE /api/v1/users/{userId}/sites/{siteId}

**Purpose:** Unassign user from site

**Authentication:** Required (Owner, Admin)

**Request:**
- **Method:** DELETE
- **Path Parameters:**
  - `userId` (UUID, required) - User identifier
  - `siteId` (UUID, required) - Site identifier

**Response:** 200 OK
```json
{
  "data": {
    "message": "User unassigned from site successfully"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Assignment not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 50 unassignments/hour per user

---

## 19.9 GET /api/v1/users/{userId}/roles

**Purpose:** List user roles

**Authentication:** Required (all roles, own user or Admin)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `userId` (UUID, required) - User identifier

**Response:** 200 OK
```json
{
  "data": [
    {
      "role": "OWNER",
      "assigned_at": "2025-01-01T12:00:00Z",
      "assigned_by": "uuid"
    }
  ]
}
```

**Error Codes:**
- `404 NOT_FOUND` - User not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 requests/hour per user

---

## 19.10 POST /api/v1/users/{userId}/roles

**Purpose:** Assign role to user

**Authentication:** Required (Owner, Admin)

**Request:**
- **Method:** POST
- **Path Parameters:**
  - `userId` (UUID, required) - User identifier
- **Body:**
```json
{
  "role": "ADMIN"
}
```

**Request Schema:**
```typescript
interface AssignRoleRequest {
  role: 'OWNER' | 'ADMIN' | 'STAFF' | 'CONSULTANT' | 'VIEWER';
}
```

**Response:** 201 Created
```json
{
  "data": {
    "user_id": "uuid",
    "role": "ADMIN",
    "assigned_by": "uuid",
    "assigned_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - User not found
- `409 CONFLICT` - Role already assigned
- `403 FORBIDDEN` - Insufficient permissions
- `422 UNPROCESSABLE_ENTITY` - Invalid role

**Rate Limiting:** 20 assignments/hour per user

---

## 19.11 DELETE /api/v1/users/{userId}/roles/{role}

**Purpose:** Remove role from user

**Authentication:** Required (Owner, Admin)

**Request:**
- **Method:** DELETE
- **Path Parameters:**
  - `userId` (UUID, required) - User identifier
  - `role` (string, required) - Role name

**Response:** 200 OK
```json
{
  "data": {
    "message": "Role removed successfully"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Role assignment not found
- `403 FORBIDDEN` - Insufficient permissions
- `409 CONFLICT` - Cannot remove last role

**Rate Limiting:** 20 removals/hour per user

---

# 20. Companies Endpoints

## 20.1 GET /api/v1/companies

**Purpose:** List companies (Admin only)

**Authentication:** Required (Owner, Admin)

**Request:**
- **Method:** GET
- **Query Parameters:**
  - `filter[is_active]` (optional) - Filter by active status
  - `filter[subscription_tier]` (optional) - Filter by subscription tier
  - `sort` (optional) - Sort field
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "subscription_tier": "professional",
      "is_active": true,
      "created_at": "2025-01-01T12:00:00Z"
    }
  ],
  "pagination": {...}
}
```

**Error Codes:**
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 requests/hour per user

---

## 20.2 GET /api/v1/companies/{companyId}

**Purpose:** Get company details

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `companyId` (UUID, required) - Company identifier

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "name": "string",
    "billing_email": "string",
    "subscription_tier": "professional",
    "is_active": true,
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Company not found
- `403 FORBIDDEN` - Insufficient permissions (RLS)

**Rate Limiting:** 100 requests/hour per user

---

## 20.3 PUT /api/v1/companies/{companyId}

**Purpose:** Update company

**Authentication:** Required (Owner, Admin)

**Request:**
- **Method:** PUT
- **Path Parameters:**
  - `companyId` (UUID, required) - Company identifier
- **Body:**
```json
{
  "name": "string",
  "billing_email": "string"
}
```

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "name": "string",
    "billing_email": "string",
    "updated_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Company not found
- `403 FORBIDDEN` - Insufficient permissions
- `422 UNPROCESSABLE_ENTITY` - Validation error

**Rate Limiting:** 10 updates/hour per user

---

## 20.4 GET /api/v1/companies/{companyId}/sites

**Purpose:** List sites for company

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `companyId` (UUID, required) - Company identifier
- **Query Parameters:**
  - `filter[is_active]` (optional) - Filter by active status
  - `sort` (optional) - Sort field
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "regulator": "EA",
      "is_active": true
    }
  ],
  "pagination": {...}
}
```

**Error Codes:**
- `404 NOT_FOUND` - Company not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 requests/hour per user

---

## 20.5 GET /api/v1/companies/{companyId}/users

**Purpose:** List users for company

**Authentication:** Required (Owner, Admin)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `companyId` (UUID, required) - Company identifier
- **Query Parameters:**
  - `filter[is_active]` (optional) - Filter by active status
  - `sort` (optional) - Sort field
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "string",
      "is_active": true
    }
  ],
  "pagination": {...}
}
```

**Error Codes:**
- `404 NOT_FOUND` - Company not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 requests/hour per user

---

## 20.6 GET /api/v1/companies/{companyId}/module-activations

**Purpose:** List module activations for company

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `companyId` (UUID, required) - Company identifier
- **Query Parameters:**
  - `filter[module_id]` (optional) - Filter by module
  - `filter[status]` (optional) - Filter by status
  - `sort` (optional) - Sort field

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "module_id": "uuid",
      "module_name": "Trade Effluent",
      "status": "ACTIVE",
      "activated_at": "2025-01-01T12:00:00Z"
    }
  ]
}
```

**Error Codes:**
- `404 NOT_FOUND` - Company not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 requests/hour per user

---

# 21. Multi-Site Endpoints

## 21.1 GET /api/v1/sites

**Purpose:** Retrieve user's accessible sites

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Query Parameters:**
  - `filter[company_id]` (optional) - Filter by company
  - `filter[regulator]` (optional) - Filter by regulator
  - `sort` (optional) - Sort field
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "company_id": "uuid",
      "name": "string",
      "address_line_1": "string",
      "city": "string",
      "postcode": "string",
      "regulator": "EA",
      "is_active": true,
      "created_at": "2025-01-01T12:00:00Z"
    }
  ],
  "pagination": {...}
}
```

**Error Codes:**
- `400 BAD_REQUEST` - Invalid filter/sort

**Rate Limiting:** 100 requests/hour per user

---

## 21.2 POST /api/v1/sites

**Purpose:** Create site

**Authentication:** Required (Owner, Admin)

**Request:**
- **Method:** POST
- **Body:**
```json
{
  "company_id": "uuid",
  "name": "string",
  "address_line_1": "string",
  "city": "string",
  "postcode": "string",
  "regulator": "EA"
}
```

**Request Schema:**
```typescript
interface CreateSiteRequest {
  company_id: string;
  name: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  postcode?: string;
  country?: string;
  regulator?: 'EA' | 'SEPA' | 'NRW' | 'NIEA';
  grace_period_days?: number;
}
```

**Response:** 201 Created
```json
{
  "data": {
    "id": "uuid",
    "company_id": "uuid",
    "name": "string",
    "regulator": "EA",
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `422 UNPROCESSABLE_ENTITY` - Validation error
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 20 sites/hour per user

---

## 21.3 GET /api/v1/sites/{siteId}

**Purpose:** Get site details

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `siteId` (UUID, required) - Site identifier

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "company_id": "uuid",
    "name": "string",
    "address_line_1": "string",
    "city": "string",
    "postcode": "string",
    "regulator": "EA",
    "grace_period_days": 7,
    "is_active": true,
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Site not found
- `403 FORBIDDEN` - Insufficient permissions (RLS)

**Rate Limiting:** 100 requests/hour per user

---

## 21.4 PUT /api/v1/sites/{siteId}

**Purpose:** Update site

**Authentication:** Required (Owner, Admin)

**Request:**
- **Method:** PUT
- **Path Parameters:**
  - `siteId` (UUID, required) - Site identifier
- **Body:**
```json
{
  "name": "string",
  "address_line_1": "string",
  "grace_period_days": 7
}
```

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "name": "string",
    "updated_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Site not found
- `403 FORBIDDEN` - Insufficient permissions
- `422 UNPROCESSABLE_ENTITY` - Validation error

**Rate Limiting:** 20 updates/hour per user

---

## 21.5 DELETE /api/v1/sites/{siteId}

**Purpose:** Delete site (soft delete)

**Authentication:** Required (Owner, Admin)

**Request:**
- **Method:** DELETE
- **Path Parameters:**
  - `siteId` (UUID, required) - Site identifier

**Response:** 200 OK
```json
{
  "data": {
    "message": "Site deleted successfully"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Site not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 5 deletions/hour per user

---

## 21.6 GET /api/v1/sites/{siteId}/obligations

**Purpose:** List obligations for site

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `siteId` (UUID, required) - Site identifier
- **Query Parameters:**
  - `filter[status]` (optional) - Filter by status
  - `filter[review_status]` (optional) - Filter by review status
  - `sort` (optional) - Sort field
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "original_text": "string",
      "obligation_title": "string",
      "obligation_description": "string",
      "category": "MONITORING",
      "status": "PENDING",
      "deadline_date": "2025-01-15"
    }
  ],
  "pagination": {...}
}
```

**Error Codes:**
- `404 NOT_FOUND` - Site not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 requests/hour per user

---

## 21.7 GET /api/v1/sites/{siteId}/documents

**Purpose:** List documents for site

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `siteId` (UUID, required) - Site identifier
- **Query Parameters:**
  - `filter[document_type]` (optional) - Filter by document type
  - `filter[status]` (optional) - Filter by status
  - `sort` (optional) - Sort field
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "document_type": "PERMIT",
      "title": "string",
      "status": "PROCESSED",
      "obligation_count": 25,
      "created_at": "2025-01-01T12:00:00Z"
    }
  ],
  "pagination": {...}
}
```

**Error Codes:**
- `404 NOT_FOUND` - Site not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 requests/hour per user

---

## 21.8 GET /api/v1/sites/{siteId}/deadlines

**Purpose:** List deadlines for site

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `siteId` (UUID, required) - Site identifier
- **Query Parameters:**
  - `filter[status]` (optional) - Filter by status
  - `filter[due_date][gte]` (optional) - Filter by due date range
  - `sort` (optional) - Sort field (e.g., `due_date`)
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "obligation_id": "uuid",
      "due_date": "2025-01-15",
      "status": "PENDING",
      "compliance_period": "2025-Q1"
    }
  ],
  "pagination": {...}
}
```

**Error Codes:**
- `404 NOT_FOUND` - Site not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 requests/hour per user

---

## 21.9 GET /api/v1/sites/{siteId}/consolidated-view

**Purpose:** Retrieve consolidated multi-site view

**Authentication:** Required (all roles, multi-site access)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `siteId` (UUID, required) - Site identifier (primary site)
- **Query Parameters:**
  - `date_range` (optional) - Date range filter
  - `include_sites` (optional) - Array of site IDs to include

**Response:** 200 OK
```json
{
  "data": {
    "primary_site_id": "uuid",
    "included_sites": ["uuid1", "uuid2"],
    "obligations": {
      "total": 150,
      "overdue": 5,
      "due_soon": 10,
      "completed": 135
    },
    "deadlines": [
      {
        "id": "uuid",
        "obligation_id": "uuid",
        "site_id": "uuid",
        "due_date": "2025-01-15",
        "status": "DUE_SOON"
      }
    ],
    "compliance_status": "AT_RISK"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Site not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 50 requests/hour per user

---

# 22. Module Activation Endpoints

## 22.1 POST /api/v1/modules/{moduleId}/activate

**Purpose:** Activate module for company

**Authentication:** Required (Owner, Admin)

**Request:**
- **Method:** POST
- **Path Parameters:**
  - `moduleId` (UUID, required) - Module identifier
- **Body (optional):**
```json
{
  "site_ids": ["uuid1", "uuid2"]
}
```

**Request Schema:**
```typescript
interface ActivateModuleRequest {
  site_ids?: string[]; // Optional: activate for specific sites only
}
```

**Response:** 200 OK
```json
{
  "data": {
    "module_id": "uuid",
    "company_id": "uuid",
    "activated_at": "2025-01-01T12:00:00Z",
    "site_ids": ["uuid1", "uuid2"]
  }
}
```

**Prerequisites:** Checks `modules.requires_module_id` from `modules` table

**Cross-Sell:** Handles cross-sell triggers (see PLS Section C.4)

**Error Codes:**
- `404 NOT_FOUND` - Module not found
- `422 UNPROCESSABLE_ENTITY` - Prerequisites not met
- `409 CONFLICT` - Module already active

**Rate Limiting:** 5 activations/hour per user

---

## 22.2 GET /api/v1/modules

**Purpose:** Retrieve available modules

**Authentication:** Required (all roles)

**Request:**
- **Method:** GET
- **Query Parameters:**
  - `filter[is_active]` (optional) - Filter by active status
  - `filter[is_default]` (optional) - Filter by default modules
  - `sort` (optional) - Sort field

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "module_code": "MODULE_2",
      "module_name": "Trade Effluent",
      "module_description": "string",
      "requires_module_id": null,
      "pricing_model": "per_site",
      "base_price": 59.00,
      "is_active": true,
      "is_default": false
    }
  ]
}
```

**Error Codes:** None

**Rate Limiting:** 100 requests/hour per user

---

## 22.3 GET /api/v1/module-activations

**Purpose:** List module activations

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Query Parameters:**
  - `filter[company_id]` (optional) - Filter by company
  - `filter[module_id]` (optional) - Filter by module
  - `filter[status]` (optional) - Filter by status
  - `sort` (optional) - Sort field
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "company_id": "uuid",
      "module_id": "uuid",
      "module_name": "Trade Effluent",
      "status": "ACTIVE",
      "activated_at": "2025-01-01T12:00:00Z"
    }
  ],
  "pagination": {...}
}
```

**Error Codes:**
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 requests/hour per user

---

## 22.4 GET /api/v1/module-activations/{activationId}

**Purpose:** Get module activation details

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `activationId` (UUID, required) - Module activation identifier

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "company_id": "uuid",
    "site_id": "uuid",
    "module_id": "uuid",
    "module_name": "Trade Effluent",
    "status": "ACTIVE",
    "activated_at": "2025-01-01T12:00:00Z",
    "activated_by": "uuid",
    "billing_start_date": "2025-01-01"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Activation not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 requests/hour per user

---

## 22.5 PUT /api/v1/module-activations/{activationId}/deactivate

**Purpose:** Deactivate module

**Authentication:** Required (Owner, Admin)

**Request:**
- **Method:** PUT
- **Path Parameters:**
  - `activationId` (UUID, required) - Module activation identifier
- **Body (optional):**
```json
{
  "deactivation_reason": "string"
}
```

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "status": "INACTIVE",
    "deactivated_at": "2025-01-01T12:00:00Z",
    "deactivated_by": "uuid",
    "deactivation_reason": "string"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Activation not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 5 deactivations/hour per user

---

# 23. Admin Endpoints

## 23.1 GET /api/v1/admin/dead-letter-queue

**Purpose:** List failed jobs in dead-letter queue (Admin only)

**Authentication:** Required (Owner, Admin)

**Request:**
- **Method:** GET
- **Query Parameters:**
  - `filter[job_type]` (optional) - Filter by job type
  - `filter[created_at][gte]` (optional) - Filter by date range
  - `sort` (optional) - Sort field (e.g., `-created_at`)
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "job_id": "uuid",
      "job_type": "DOCUMENT_PROCESSING",
      "error_message": "string",
      "failed_at": "2025-01-01T12:00:00Z",
      "retry_count": 2
    }
  ],
  "pagination": {...}
}
```

**Error Codes:**
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 50 requests/hour per user

**Reference:** Background Jobs (2.3) Section 7.2

---

## 23.2 GET /api/v1/admin/audit-logs

**Purpose:** List audit logs (Admin only)

**Authentication:** Required (Owner, Admin)

**Request:**
- **Method:** GET
- **Query Parameters:**
  - `filter[entity_type]` (optional) - Filter by entity type
  - `filter[user_id]` (optional) - Filter by user
  - `filter[action]` (optional) - Filter by action
  - `filter[created_at][gte]` (optional) - Filter by date range
  - `sort` (optional) - Sort field (e.g., `-created_at`)
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "entity_type": "obligation",
      "entity_id": "uuid",
      "action": "UPDATE",
      "user_id": "uuid",
      "changes": {},
      "created_at": "2025-01-01T12:00:00Z"
    }
  ],
  "pagination": {...}
}
```

**Error Codes:**
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 requests/hour per user

---

## 23.3 GET /api/v1/admin/system-settings

**Purpose:** Get system settings (Admin only)

**Authentication:** Required (Owner, Admin)

**Request:**
- **Method:** GET

**Response:** 200 OK
```json
{
  "data": {
    "key": "value",
    "maintenance_mode": false,
    "feature_flags": {}
  }
}
```

**Error Codes:**
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 requests/hour per user

---

## 23.4 PUT /api/v1/admin/system-settings

**Purpose:** Update system settings (Admin only)

**Authentication:** Required (Owner, Admin)

**Request:**
- **Method:** PUT
- **Body:**
```json
{
  "maintenance_mode": false,
  "feature_flags": {
    "new_feature": true
  }
}
```

**Response:** 200 OK
```json
{
  "data": {
    "maintenance_mode": false,
    "feature_flags": {},
    "updated_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `403 FORBIDDEN` - Insufficient permissions
- `422 UNPROCESSABLE_ENTITY` - Validation error

**Rate Limiting:** 10 updates/hour per user

---

## 23.5 GET /api/v1/escalations

**Purpose:** List escalations

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Query Parameters:**
  - `filter[obligation_id]` (optional) - Filter by obligation
  - `filter[site_id]` (optional) - Filter by site
  - `filter[current_level]` (optional) - Filter by escalation level
  - `filter[resolved_at]` (optional) - Filter by resolved status
  - `sort` (optional) - Sort field (e.g., `-escalated_at`)
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "obligation_id": "uuid",
      "current_level": 2,
      "escalation_reason": "string",
      "escalated_to": "uuid",
      "escalated_at": "2025-01-01T12:00:00Z",
      "resolved_at": null
    }
  ],
  "pagination": {...}
}
```

**Error Codes:**
- `400 BAD_REQUEST` - Invalid filter/sort

**Rate Limiting:** 100 requests/hour per user

---

## 23.6 GET /api/v1/escalations/{escalationId}

**Purpose:** Get escalation details

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `escalationId` (UUID, required) - Escalation identifier

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "obligation_id": "uuid",
    "company_id": "uuid",
    "site_id": "uuid",
    "current_level": 2,
    "escalation_reason": "string",
    "escalated_to": "uuid",
    "escalated_at": "2025-01-01T12:00:00Z",
    "resolved_at": null,
    "resolved_by": null,
    "resolution_notes": null
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Escalation not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 requests/hour per user

---

## 23.7 PUT /api/v1/escalations/{escalationId}/resolve

**Purpose:** Resolve escalation

**Authentication:** Required (Owner, Admin, Staff)

**Request:**
- **Method:** PUT
- **Path Parameters:**
  - `escalationId` (UUID, required) - Escalation identifier
- **Body:**
```json
{
  "resolution_notes": "string"
}
```

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "resolved_at": "2025-01-01T12:00:00Z",
    "resolved_by": "uuid",
    "resolution_notes": "string",
    "updated_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Escalation not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 50 resolutions/hour per user

---

## 23.8 GET /api/v1/cross-sell-triggers

**Purpose:** List cross-sell triggers

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Query Parameters:**
  - `filter[company_id]` (optional) - Filter by company
  - `filter[target_module_id]` (optional) - Filter by target module
  - `filter[status]` (optional) - Filter by status
  - `sort` (optional) - Sort field (e.g., `-created_at`)
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "target_module_id": "uuid",
      "target_module_name": "Trade Effluent",
      "trigger_type": "KEYWORD",
      "detected_keywords": ["effluent", "discharge"],
      "status": "PENDING",
      "created_at": "2025-01-01T12:00:00Z"
    }
  ],
  "pagination": {...}
}
```

**Error Codes:**
- `400 BAD_REQUEST` - Invalid filter/sort

**Rate Limiting:** 100 requests/hour per user

---

## 23.9 GET /api/v1/cross-sell-triggers/{triggerId}

**Purpose:** Get cross-sell trigger details

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `triggerId` (UUID, required) - Cross-sell trigger identifier

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "company_id": "uuid",
    "site_id": "uuid",
    "document_id": "uuid",
    "target_module_id": "uuid",
    "target_module_name": "Trade Effluent",
    "trigger_type": "KEYWORD",
    "trigger_source": "document_extraction",
    "detected_keywords": ["effluent", "discharge"],
    "status": "PENDING",
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Trigger not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 requests/hour per user

---

## 23.10 PUT /api/v1/cross-sell-triggers/{triggerId}

**Purpose:** Update cross-sell trigger status (convert or dismiss)

**Authentication:** Required (Owner, Admin)

**Request:**
- **Method:** PUT
- **Path Parameters:**
  - `triggerId` (UUID, required) - Cross-sell trigger identifier
- **Body:**
```json
{
  "status": "CONVERTED",
  "response_action": "activated_module"
}
```

**OR**

```json
{
  "status": "DISMISSED",
  "dismissed_reason": "string"
}
```

**Request Schema:**
```typescript
interface UpdateCrossSellTriggerRequest {
  status: 'CONVERTED' | 'DISMISSED';
  response_action?: string; // If CONVERTED
  dismissed_reason?: string; // If DISMISSED
}
```

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "status": "CONVERTED",
    "responded_at": "2025-01-01T12:00:00Z",
    "response_action": "activated_module",
    "updated_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Trigger not found
- `403 FORBIDDEN` - Insufficient permissions
- `422 UNPROCESSABLE_ENTITY` - Invalid status or missing required fields

**Rate Limiting:** 20 updates/hour per user

---

# 24. Regulator Questions Endpoints

## 24.1 GET /api/v1/regulator-questions

**Purpose:** List regulator questions

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Query Parameters:**
  - `filter[site_id]` (optional) - Filter by site
  - `filter[obligation_id]` (optional) - Filter by obligation
  - `filter[status]` (optional) - Filter by status
  - `filter[question_type]` (optional) - Filter by question type
  - `filter[response_deadline][lte]` (optional) - Filter by deadline approaching
  - `sort` (optional) - Sort field (e.g., `response_deadline`)
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "obligation_id": "uuid",
      "question_type": "OBLIGATION_CLARIFICATION",
      "question_text": "string",
      "response_deadline": "2025-01-15",
      "status": "OPEN",
      "created_at": "2025-01-01T12:00:00Z"
    }
  ],
  "pagination": {...}
}
```

**Filterable Fields:**
- `site_id` (UUID)
- `company_id` (UUID - via site)
- `obligation_id` (UUID)
- `document_id` (UUID)
- `status` (enum: OPEN, RESPONSE_SUBMITTED, RESPONSE_ACKNOWLEDGED, FOLLOW_UP_REQUIRED, CLOSED, RESPONSE_OVERDUE)
- `question_type` (enum: OBLIGATION_CLARIFICATION, EVIDENCE_REQUEST, COMPLIANCE_QUERY, URGENT, INFORMAL)
- `response_deadline` (date range)
- `assigned_to` (UUID)

**Sortable Fields:**
- `response_deadline`, `created_at`, `status`

**Error Codes:**
- `400 BAD_REQUEST` - Invalid filter/sort

**Rate Limiting:** 100 requests/hour per user

---

## 24.2 GET /api/v1/regulator-questions/{questionId}

**Purpose:** Get regulator question details

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `questionId` (UUID, required) - Regulator question identifier

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "company_id": "uuid",
    "site_id": "uuid",
    "obligation_id": "uuid",
    "question_type": "OBLIGATION_CLARIFICATION",
    "question_text": "string",
    "question_document_id": "uuid",
    "raised_date": "2025-01-01",
    "response_deadline": "2025-01-15",
    "status": "OPEN",
    "response_text": null,
    "response_submitted_date": null,
    "response_evidence_ids": [],
    "assigned_to": "uuid",
    "created_by": "uuid",
    "created_at": "2025-01-01T12:00:00Z",
    "updated_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Question not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 requests/hour per user

---

## 24.3 POST /api/v1/regulator-questions

**Purpose:** Create regulator question

**Authentication:** Required (Owner, Admin, Staff)

**Request:**
- **Method:** POST
- **Body:**
```json
{
  "site_id": "uuid",
  "obligation_id": "uuid",
  "question_type": "OBLIGATION_CLARIFICATION",
  "question_text": "string",
  "question_document_id": "uuid",
  "response_deadline": "2025-01-15",
  "assigned_to": "uuid"
}
```

**Request Schema:**
```typescript
interface CreateRegulatorQuestionRequest {
  site_id?: string;
  obligation_id?: string;
  document_id?: string;
  question_type: 'OBLIGATION_CLARIFICATION' | 'EVIDENCE_REQUEST' | 'COMPLIANCE_QUERY' | 'URGENT' | 'INFORMAL';
  question_text: string;
  question_document_id?: string;
  response_deadline: string; // ISO date
  assigned_to?: string;
}
```

**Response:** 201 Created
```json
{
  "data": {
    "id": "uuid",
    "question_type": "OBLIGATION_CLARIFICATION",
    "question_text": "string",
    "response_deadline": "2025-01-15",
    "status": "OPEN",
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `422 UNPROCESSABLE_ENTITY` - Validation error
- `404 NOT_FOUND` - Site/obligation/document not found

**Rate Limiting:** 20 questions/hour per user

---

## 24.4 PUT /api/v1/regulator-questions/{questionId}

**Purpose:** Update regulator question (submit response)

**Authentication:** Required (Owner, Admin, Staff)

**Request:**
- **Method:** PUT
- **Path Parameters:**
  - `questionId` (UUID, required) - Regulator question identifier
- **Body:**
```json
{
  "response_text": "string",
  "response_evidence_ids": ["uuid1", "uuid2"],
  "status": "RESPONSE_SUBMITTED"
}
```

**Request Schema:**
```typescript
interface UpdateRegulatorQuestionRequest {
  response_text?: string;
  response_evidence_ids?: string[];
  status?: 'RESPONSE_SUBMITTED' | 'CLOSED';
  assigned_to?: string;
}
```

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "response_text": "string",
    "response_submitted_date": "2025-01-01",
    "status": "RESPONSE_SUBMITTED",
    "updated_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Question not found
- `403 FORBIDDEN` - Insufficient permissions
- `422 UNPROCESSABLE_ENTITY` - Validation error

**Rate Limiting:** 50 updates/hour per user

---

## 24.5 PUT /api/v1/regulator-questions/{questionId}/close

**Purpose:** Close regulator question

**Authentication:** Required (Owner, Admin)

**Request:**
- **Method:** PUT
- **Path Parameters:**
  - `questionId` (UUID, required) - Regulator question identifier

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "status": "CLOSED",
    "closed_date": "2025-01-01",
    "updated_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Question not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 20 closes/hour per user

---

# 25. Background Jobs Endpoints

## 25.1 GET /api/v1/background-jobs/{jobId}

**Purpose:** Get background job status

**Authentication:** Required (all roles, RLS applies)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `jobId` (UUID, required) - Background job identifier

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "job_type": "DOCUMENT_PROCESSING",
    "status": "RUNNING",
    "progress": 50,
    "result": null,
    "error_message": null,
    "started_at": "2025-01-01T12:00:00Z",
    "estimated_completion_time": "2025-01-01T12:05:00Z"
  }
}
```

**Response Schema:**
```typescript
interface BackgroundJobResponse {
  id: string;
  job_type: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress?: number; // 0-100
  result?: any;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  estimated_completion_time?: string;
}
```

**Error Codes:**
- `404 NOT_FOUND` - Job not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 requests/hour per user

**Reference:** Background Jobs (2.3)

---

> [v1 UPDATE – Consultant Control Centre Endpoints – 2024-12-27]

# 26. Consultant Control Centre Endpoints

## 26.1 GET /api/v1/consultant/clients

**Purpose:** List consultant's assigned clients

**Authentication:** Required (Consultant role only)

**Request:**
- **Method:** GET
- **Query Parameters:**
  - `status` (optional, default: ACTIVE) - Filter by assignment status
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "client_company_id": "uuid",
      "company_name": "Client Company Name",
      "status": "ACTIVE",
      "assigned_at": "2025-01-01T12:00:00Z",
      "site_count": 3,
      "compliance_summary": {
        "total_obligations": 45,
        "overdue_count": 2,
        "compliance_score": 0.95
      }
    }
  ],
  "pagination": {...}
}
```

**Error Codes:**
- `403 FORBIDDEN` - User is not a consultant

**Rate Limiting:** 100 requests/hour per consultant

**Reference:** Product Logic Specification Section C.5.3 (Consultant Dashboard Logic)

---

## 26.2 GET /api/v1/consultant/dashboard

**Purpose:** Get consultant dashboard with aggregated client data

**Authentication:** Required (Consultant role only)

**Request:**
- **Method:** GET

**Response:** 200 OK
```json
{
  "data": {
    "total_clients": 12,
    "active_clients": 10,
    "total_sites": 25,
    "compliance_overview": {
      "total_obligations": 450,
      "overdue_count": 8,
      "approaching_deadline_count": 15,
      "avg_compliance_score": 0.92
    },
    "recent_activity": [
      {
        "client_company_id": "uuid",
        "client_name": "Client Name",
        "activity_type": "PACK_GENERATED",
        "activity_description": "Regulator pack generated",
        "timestamp": "2025-01-01T12:00:00Z"
      }
    ],
    "upcoming_deadlines": [
      {
        "client_company_id": "uuid",
        "client_name": "Client Name",
        "deadline_date": "2025-01-15",
        "obligation_title": "Monthly monitoring report"
      }
    ]
  }
}
```

**Error Codes:**
- `403 FORBIDDEN` - User is not a consultant

**Rate Limiting:** 60 requests/hour per consultant

**Reference:** Product Logic Specification Section C.5.3 (Consultant Dashboard Logic)

---

## 26.3 POST /api/v1/consultant/clients/{clientId}/packs

**Purpose:** Generate pack for assigned client

**Authentication:** Required (Consultant role only)

**Request:**
- **Method:** POST
- **Path Parameters:**
  - `clientId` (UUID, required) - Client company ID
- **Body:**
```json
{
  "pack_type": "REGULATOR_INSPECTION",
  "site_id": "uuid",
  "document_id": "uuid",
  "date_range": {
    "start": "2025-01-01",
    "end": "2025-12-31"
  },
  "recipient_name": "Client Contact Name"
}
```

**Response:** 202 Accepted (same as Section 16.2)

**Validation:**
- Validates consultant has `ACTIVE` assignment to client company
- **If** `pack_type === 'BOARD_MULTI_SITE_RISK'`:
  - Returns `403 FORBIDDEN` - "Consultants cannot generate Board Packs (requires Owner/Admin role)"
  - **Rationale:** Board Pack contains company-wide risk data requiring executive-level access
- Validates pack type access based on client's plan
- Returns `403 FORBIDDEN` if consultant not assigned to client
- Returns `422 UNPROCESSABLE_ENTITY` if Board Pack requested (consultants cannot generate)

**Error Codes:**
- `403 FORBIDDEN` - Consultant not assigned to client
- `404 NOT_FOUND` - Client company not found

**Rate Limiting:** 10 generations/hour per consultant per client

**Reference:** Product Logic Specification Section C.5.4 (Consultant Pack Generation)

---

## 26.4 POST /api/v1/consultant/clients/{clientId}/packs/{packId}/distribute

**Purpose:** Distribute client pack to client contacts

**Authentication:** Required (Consultant role only)

**Request:**
- **Method:** POST
- **Path Parameters:**
  - `clientId` (UUID, required) - Client company ID
  - `packId` (UUID, required) - Pack identifier
- **Body:**
```json
{
  "distribution_method": "EMAIL",
  "recipients": [
    {
      "email": "client@example.com",
      "name": "Client Contact"
    }
  ],
  "message": "Please find attached compliance pack"
}
```

**Response:** 200 OK (same as Section 16.11)

**Validation:**
- Validates consultant has `ACTIVE` assignment to client company
- Validates pack belongs to client company

**Error Codes:**
- `403 FORBIDDEN` - Consultant not assigned to client or pack not accessible
- `404 NOT_FOUND` - Client or pack not found

**Reference:** Product Logic Specification Section C.5.4 (Consultant Pack Generation)

---

## 26.5 GET /api/v1/consultant/clients/{clientId}

**Purpose:** Get client company details and compliance summary

**Authentication:** Required (Consultant role only)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `clientId` (UUID, required) - Client company ID

**Response:** 200 OK
```json
{
  "data": {
    "company_id": "uuid",
    "company_name": "Client Company Name",
    "site_count": 3,
    "sites": [
      {
        "site_id": "uuid",
        "site_name": "Site Name",
        "compliance_status": "COMPLIANT",
        "overdue_obligations": 0
      }
    ],
    "compliance_summary": {
      "total_obligations": 45,
      "complete_count": 43,
      "overdue_count": 2,
      "compliance_score": 0.95
    },
    "assignment": {
      "status": "ACTIVE",
      "assigned_at": "2025-01-01T12:00:00Z"
    }
  }
}
```

**Error Codes:**
- `403 FORBIDDEN` - Consultant not assigned to client
- `404 NOT_FOUND` - Client company not found

**Rate Limiting:** 100 requests/hour per consultant

---

# 27. File Upload Specifications

## 18.1 File Size Limits

- **Maximum file size:** 50MB per file
- **Maximum total upload:** 200MB per request
- **Maximum pages:** 200 pages (for documents)
- **Maximum images per page:** 10 images
- **DPI range:** 150-600 DPI

**Reference:** PLS Section B.1.1 (Document Upload Validation)

## 18.2 Allowed File Types

| Category | File Types | Extensions |
|----------|------------|------------|
| Documents | PDF, Word | `.pdf`, `.doc`, `.docx` |
| Images | JPEG, PNG, GIF, WebP | `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp` |
| Data | CSV, Excel | `.csv`, `.xlsx` |
| Archives | ZIP | `.zip` |

## 18.3 Upload Progress Tracking

**Chunked Upload Support:**
- Large files (>10MB) use chunked upload
- Progress endpoint: `GET /api/v1/uploads/{uploadId}/progress`

**Progress Response:**
```json
{
  "data": {
    "upload_id": "uuid",
    "status": "UPLOADING",
    "bytes_uploaded": 5242880,
    "total_bytes": 10485760,
    "percentage": 50
  }
}
```

---

## 18.4 GET /api/v1/uploads/{uploadId}/progress

**Purpose:** Get upload progress

**Authentication:** Required (all roles, own upload)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `uploadId` (UUID, required) - Upload identifier

**Response:** 200 OK
```json
{
  "data": {
    "upload_id": "uuid",
    "status": "UPLOADING",
    "bytes_uploaded": 5242880,
    "total_bytes": 10485760,
    "percentage": 50,
    "estimated_time_remaining_seconds": 30
  }
}
```

**Response Schema:**
```typescript
interface UploadProgressResponse {
  upload_id: string;
  status: 'UPLOADING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  bytes_uploaded: number;
  total_bytes: number;
  percentage: number;
  estimated_time_remaining_seconds?: number;
}
```

**Error Codes:**
- `404 NOT_FOUND` - Upload not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 requests/hour per user

---

# 28. Webhook Endpoints

## 27.1 POST /api/v1/webhooks

**Purpose:** Register webhook

**Authentication:** Required (Owner, Admin)

**Request:**
- **Method:** POST
- **Body:**
```json
{
  "url": "https://example.com/webhook",
  "events": ["document.extracted", "obligation.deadline_approaching"],
  "secret": "webhook_secret_key"
}
```

**Request Schema:**
```typescript
interface CreateWebhookRequest {
  url: string;
  events: WebhookEvent[];
  secret: string;
}

type WebhookEvent =
  | 'document.extracted'
  | 'obligation.deadline_approaching'
  | 'obligation.overdue'
  | 'audit_pack.generated'
  | 'module.activated';
```

**Response:** 201 Created
```json
{
  "data": {
    "id": "uuid",
    "url": "https://example.com/webhook",
    "events": ["document.extracted"],
    "is_active": true,
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

## 27.2 GET /api/v1/webhooks

**Purpose:** List registered webhooks

**Authentication:** Required (Owner, Admin)

**Request:**
- **Method:** GET
- **Query Parameters:**
  - `filter[is_active]` (optional) - Filter by active status
  - `sort` (optional) - Sort field
  - `cursor` (optional) - Cursor for pagination
  - `limit` (optional) - Page size

**Response:** 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "url": "https://example.com/webhook",
      "events": ["document.extracted"],
      "is_active": true,
      "created_at": "2025-01-01T12:00:00Z"
    }
  ],
  "pagination": {...}
}
```

**Error Codes:**
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 requests/hour per user

---

## 27.3 GET /api/v1/webhooks/{webhookId}

**Purpose:** Get webhook details

**Authentication:** Required (Owner, Admin)

**Request:**
- **Method:** GET
- **Path Parameters:**
  - `webhookId` (UUID, required) - Webhook identifier

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "url": "https://example.com/webhook",
    "events": ["document.extracted", "obligation.deadline_approaching"],
    "is_active": true,
    "last_delivery_at": "2025-01-01T12:00:00Z",
    "last_delivery_status": "SUCCESS",
    "created_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Webhook not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 100 requests/hour per user

---

## 27.4 PUT /api/v1/webhooks/{webhookId}

**Purpose:** Update webhook

**Authentication:** Required (Owner, Admin)

**Request:**
- **Method:** PUT
- **Path Parameters:**
  - `webhookId` (UUID, required) - Webhook identifier
- **Body:**
```json
{
  "url": "https://example.com/webhook",
  "events": ["document.extracted"],
  "is_active": true
}
```

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "url": "https://example.com/webhook",
    "events": ["document.extracted"],
    "is_active": true,
    "updated_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Webhook not found
- `403 FORBIDDEN` - Insufficient permissions
- `422 UNPROCESSABLE_ENTITY` - Validation error

**Rate Limiting:** 20 updates/hour per user

---

## 27.5 DELETE /api/v1/webhooks/{webhookId}

**Purpose:** Delete webhook

**Authentication:** Required (Owner, Admin)

**Request:**
- **Method:** DELETE
- **Path Parameters:**
  - `webhookId` (UUID, required) - Webhook identifier

**Response:** 200 OK
```json
{
  "data": {
    "message": "Webhook deleted successfully"
  }
}
```

**Error Codes:**
- `404 NOT_FOUND` - Webhook not found
- `403 FORBIDDEN` - Insufficient permissions

**Rate Limiting:** 10 deletions/hour per user

---

## 27.6 Webhook Delivery

**HTTP Method:** POST

**Headers:**
```
Content-Type: application/json
X-Webhook-Signature: {hmac_sha256_signature}
X-Webhook-Id: {webhook_id}
X-Webhook-Timestamp: {unix_timestamp}
```

**Signature Verification:**
- HMAC-SHA256 signature of request body
- Secret: Webhook secret key
- Format: `HMAC-SHA256(body, secret)`

**Retry Logic:**
- 3 attempts maximum
- Exponential backoff: 1s, 5s, 30s
- Dead-letter queue after max retries

**Webhook Payload Example:**
```json
{
  "event": "document.extracted",
  "data": {
    "document_id": "uuid",
    "obligation_count": 25,
    "extracted_at": "2025-01-01T12:00:00Z"
  },
  "timestamp": "2025-01-01T12:00:00Z"
}
```

---

# 29. OpenAPI Specification

## 28.1 OpenAPI 3.0 Structure

The complete OpenAPI 3.0 specification is provided as a separate file: `EP_Compliance_API_OpenAPI.yaml`

**Key Components:**
- **Info:** API metadata (title, version, description)
- **Servers:** Base URLs (production, staging, development)
- **Paths:** All endpoint definitions
- **Components:** Reusable schemas (request/response models)
- **Security Schemes:** JWT authentication
- **Examples:** Request/response examples

## 28.2 Schema Definitions

All request/response schemas are defined in the OpenAPI specification using JSON Schema format.

**Example Schema:**
```yaml
DocumentResponse:
  type: object
  properties:
    id:
      type: string
      format: uuid
    site_id:
      type: string
      format: uuid
    document_type:
      type: string
      enum: [PERMIT, CONSENT, MCPD_REGISTRATION]
    title:
      type: string
    status:
      type: string
      enum: [UPLOADED, PROCESSING, PROCESSED, FAILED]
    created_at:
      type: string
      format: date-time
  required:
    - id
    - site_id
    - document_type
    - title
    - status
    - created_at
```

---

# 30. TypeScript Interfaces

## 29.1 Common Interfaces

```typescript
// Pagination
interface PaginationResponse<T> {
  data: T[];
  pagination: {
    cursor?: string;
    has_more: boolean;
    total: number;
  };
}

// Error Response
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
    request_id: string;
    timestamp: string;
  };
}

// Filter Parameters
interface FilterParams {
  [field: string]: string | {
    [operator: string]: string | string[];
  };
}
```

## 29.2 Document Interfaces

```typescript
interface Document {
  id: string;
  site_id: string;
  company_id: string;
  document_type: 'PERMIT' | 'CONSENT' | 'MCPD_REGISTRATION';
  title: string;
  reference_number?: string;
  status: 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  extraction_status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  file_url: string;
  file_size: number;
  page_count?: number;
  obligation_count?: number;
  created_at: string;
  updated_at: string;
}
```

## 29.3 Obligation Interfaces

```typescript
interface Obligation {
  id: string;
  document_id: string;
  company_id: string;
  site_id: string;
  module_id: string;
  original_text: string;
  summary?: string;
  category: 'MONITORING' | 'REPORTING' | 'RECORD_KEEPING' | 'OPERATIONAL' | 'MAINTENANCE';
  frequency?: string;
  deadline_date?: string;
  is_subjective: boolean;
  confidence_score: number;
  review_status: 'PENDING' | 'CONFIRMED' | 'EDITED' | 'REJECTED' | 'PENDING_INTERPRETATION' | 'INTERPRETED' | 'NOT_APPLICABLE';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'INCOMPLETE' | 'LATE_COMPLETE' | 'NOT_APPLICABLE' | 'REJECTED';
  created_at: string;
  updated_at: string;
}
```

## 29.4 Schedule Interfaces

```typescript
interface Schedule {
  id: string;
  obligation_id: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'ONE_TIME' | 'CONTINUOUS' | 'EVENT_TRIGGERED';
  base_date: string;
  next_due_date?: string;
  last_completed_date?: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  modified_by?: string;
  modified_at?: string;
  previous_values?: Record<string, any>;
  created_at: string;
  updated_at: string;
}
```

## 29.5 Notification Interfaces

```typescript
interface Notification {
  id: string;
  user_id: string;
  company_id: string;
  site_id?: string;
  notification_type: string;
  channel: 'EMAIL' | 'SMS' | 'IN_APP' | 'PUSH';
  subject: string;
  message: string;
  status: 'PENDING' | 'QUEUED' | 'SENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'RETRYING' | 'CANCELLED';
  read_at?: string;
  created_at: string;
}

interface NotificationPreference {
  id: string;
  user_id: string;
  notification_type: string;
  channel_preference: 'EMAIL_ONLY' | 'SMS_ONLY' | 'EMAIL_AND_SMS' | 'IN_APP_ONLY' | 'ALL_CHANNELS';
  frequency_preference: 'IMMEDIATE' | 'DAILY_DIGEST' | 'WEEKLY_DIGEST' | 'NEVER';
  enabled: boolean;
  created_at: string;
  updated_at: string;
}
```

## 29.6 Module Interfaces

```typescript
interface Module {
  id: string;
  module_code: string;
  module_name: string;
  module_description?: string;
  requires_module_id?: string;
  pricing_model: 'per_site' | 'per_company' | 'per_document';
  base_price: number;
  is_active: boolean;
  is_default: boolean;
}

interface ModuleActivation {
  module_id: string;
  company_id: string;
  activated_at: string;
  site_ids?: string[];
}
```

---

# Appendix A: Reference Links

- **Product Logic Specification (1.1):** Business logic, validation rules, CRUD matrix
- **Database Schema (2.2):** Table structures, field definitions, relationships
- **Background Jobs (2.3):** Job creation endpoints, job status
- **Notification & Messaging (2.4):** Notification preferences API
- **RLS & Permissions (2.8):** Authorization rules, RLS policies

---

# Appendix B: API Versioning Strategy

## B.1 Version Lifecycle

1. **Current Version:** v1 (active)
2. **Deprecation Notice:** 6 months before removal
3. **Migration Period:** 6 months
4. **Version Removal:** After migration period

## B.2 Breaking Changes

Breaking changes require a new API version:
- Removing endpoints
- Removing required fields
- Changing field types
- Changing authentication/authorization

Non-breaking changes can be made in the same version:
- Adding new endpoints
- Adding optional fields
- Adding new enum values
- Adding new response fields

---

**Document End**

