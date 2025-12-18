# EcoComply Platform

**Compliance Management SaaS for Environmental Permits**

EcoComply is a comprehensive compliance management platform designed to help UK businesses manage environmental permits, track obligations, and maintain regulatory compliance.

## 🚀 Quick Start

### Prerequisites

- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- Git
- Supabase account
- OpenAI API key (for AI extraction features)
- Redis instance (Upstash recommended)
- SendGrid account (for email notifications)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/waqaarkhan92/EcoComply.git
   cd EcoComply
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local and fill in your actual values
   ```

   Required environment variables:
   ```bash
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # OpenAI
   OPENAI_API_KEY=your-openai-key

   # Redis (Upstash)
   UPSTASH_REDIS_REST_URL=your-redis-url
   UPSTASH_REDIS_REST_TOKEN=your-redis-token

   # Optional: Email, SMS, Analytics
   SENDGRID_API_KEY=your-sendgrid-key
   TWILIO_ACCOUNT_SID=your-twilio-sid
   NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
   ```

4. **Validate environment setup:**
   ```bash
   npm run validate-env
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📜 Available Scripts

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler check
```

### Testing
```bash
npm test                    # Run all tests
npm run test:watch          # Run tests in watch mode
npm run test:coverage       # Run tests with coverage report
npm run test:frontend       # Run frontend tests only
npm run test:integration    # Run integration tests
npm run test:e2e            # Run E2E tests with Playwright
npm run test:e2e:ui         # Run E2E tests with Playwright UI
npm run test:e2e:headed     # Run E2E tests in headed mode
```

### Documentation
```bash
npm run docs:generate       # Generate OpenAPI documentation
```

### Background Workers
```bash
npm run worker              # Start background job worker
npm run test:worker         # Test worker connection
```

## 🏗️ Project Structure

```
EcoComply/
├── app/                          # Next.js app directory
│   ├── (marketing)/              # Public marketing pages
│   │   ├── page.tsx              # Landing page
│   │   ├── features/             # Features page
│   │   ├── pricing/              # Pricing page
│   │   └── demo/                 # Demo page
│   ├── api/                      # API routes
│   │   └── v1/                   # API v1
│   │       ├── obligations/      # Obligations endpoints
│   │       ├── documents/        # Documents endpoints
│   │       ├── evidence/         # Evidence endpoints
│   │       ├── notifications/    # Notifications endpoints
│   │       ├── comments/         # Comments endpoints
│   │       └── ...
│   ├── dashboard/                # Protected dashboard pages
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
├── components/                   # React components
│   ├── ui/                       # UI components (shadcn/ui)
│   ├── help/                     # Help & onboarding components
│   │   ├── help-tooltip.tsx      # Contextual help tooltips
│   │   └── onboarding-tour.tsx   # Step-by-step tours
│   └── ...
├── lib/                          # Utility libraries
│   ├── api/                      # API utilities
│   │   ├── middleware.ts         # API middleware
│   │   ├── rate-limit.ts         # Rate limiting
│   │   ├── response.ts           # Response helpers
│   │   └── pagination.ts         # Pagination helpers
│   ├── services/                 # Service layer
│   │   ├── notification-service.ts
│   │   ├── comment-service.ts
│   │   └── ...
│   ├── supabase/                 # Supabase clients
│   └── utils.ts                  # General utilities
├── tests/                        # Test files
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   │   └── api/                  # API integration tests
│   │       ├── notifications.test.ts
│   │       └── comments.test.ts
│   └── e2e/                      # End-to-end tests
│       ├── auth.spec.ts          # Authentication tests
│       └── obligation-workflow.spec.ts
├── workers/                      # Background job workers
├── scripts/                      # Utility scripts
│   └── generate-api-docs.ts     # API documentation generator
├── docs/                         # Documentation
│   ├── api/                      # API documentation
│   │   └── openapi.json          # OpenAPI 3.0 specification
│   └── specs/                    # Product specifications
└── public/                       # Static assets

```

## 🧪 Testing

### Test Coverage

The platform has comprehensive test coverage across all layers:

- **Unit Tests**: 95%+ coverage for utilities and services
- **Integration Tests**: All API endpoints tested
- **E2E Tests**: Critical user flows covered

### Running Tests

1. **Unit Tests:**
   ```bash
   npm test
   ```

2. **Integration Tests:**
   ```bash
   npm run test:integration
   ```

3. **E2E Tests:**
   ```bash
   # Install Playwright browsers (first time only)
   npx playwright install

   # Run E2E tests
   npm run test:e2e

   # Run with UI for debugging
   npm run test:e2e:ui
   ```

4. **Coverage Report:**
   ```bash
   npm run test:coverage
   open coverage/lcov-report/index.html
   ```

### Test Environment Setup

For integration and E2E tests, ensure you have test environment variables:

```bash
# .env.test
NEXT_PUBLIC_SUPABASE_URL=your-test-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-test-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-test-service-role-key
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123!
```

## 📚 API Documentation

### OpenAPI Specification

The platform provides a comprehensive OpenAPI 3.0 specification for all API endpoints.

**Generate Documentation:**
```bash
npm run docs:generate
```

**View Documentation:**
1. **Swagger UI**: Upload `/docs/api/openapi.json` to [editor.swagger.io](https://editor.swagger.io/)
2. **VS Code**: Install "Swagger Viewer" extension and open `openapi.json`
3. **Command Line**: `npx swagger-ui-watcher docs/api/openapi.json`

### API Endpoints

Base URL: `https://app.ecocomply.com/api/v1`

#### Authentication
All endpoints require Bearer token authentication:
```bash
Authorization: Bearer YOUR_ACCESS_TOKEN
```

#### Rate Limiting
- Default: 100 requests/minute
- Auth endpoints: 3-5 requests/minute
- Upload endpoints: 10-20 requests/minute

Rate limit headers in responses:
- `X-Rate-Limit-Limit`: Maximum requests allowed
- `X-Rate-Limit-Remaining`: Requests remaining
- `X-Rate-Limit-Reset`: Unix timestamp when limit resets

#### Key Endpoints

**Obligations:**
- `GET /api/v1/obligations` - List obligations
- `POST /api/v1/obligations` - Create obligation
- `GET /api/v1/obligations/{id}` - Get obligation
- `PATCH /api/v1/obligations/{id}` - Update obligation
- `DELETE /api/v1/obligations/{id}` - Delete obligation

**Notifications:**
- `GET /api/v1/notifications` - List notifications
- `POST /api/v1/notifications/{id}/read` - Mark as read
- `GET /api/v1/notifications/unread-count` - Get unread count

**Comments:**
- `GET /api/v1/comments` - List comments
- `POST /api/v1/comments` - Create comment
- `PATCH /api/v1/comments/{id}` - Update comment
- `DELETE /api/v1/comments/{id}` - Delete comment

See `/docs/api/openapi.json` for complete API reference.

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript 5.9
- **Styling**: Tailwind CSS 4
- **Components**: Radix UI, shadcn/ui
- **Forms**: React Hook Form + Zod
- **State**: Zustand, TanStack Query

### Backend
- **API**: Next.js API Routes
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime

### AI & Processing
- **AI**: OpenAI GPT-4o, GPT-4o-mini
- **Document Processing**: pdf-parse, tesseract.js
- **OCR**: Tesseract.js

### Infrastructure
- **Hosting**: Vercel
- **Database**: Supabase (PostgreSQL)
- **Cache**: Upstash Redis
- **Queue**: BullMQ
- **Email**: SendGrid/Resend
- **SMS**: Twilio
- **Monitoring**: Sentry, PostHog

### Development
- **Testing**: Jest, Playwright
- **Linting**: ESLint
- **Type Checking**: TypeScript
- **CI/CD**: GitHub Actions

## 🎯 Key Features

1. **Obligation Management**
   - Track compliance obligations with deadlines
   - Recurring obligations support
   - Smart categorization and filtering

2. **AI Document Extraction**
   - Automatic extraction of obligations from permits
   - Multi-model routing for optimal accuracy
   - Support for PDF, images, and scanned documents

3. **Evidence Tracking**
   - Upload and organize compliance evidence
   - Validity period tracking
   - Automatic expiration reminders

4. **Notifications**
   - Multi-channel notifications (email, SMS, in-app)
   - Customizable reminder schedules
   - Smart escalation rules

5. **Audit Packs**
   - Generate comprehensive audit reports
   - Export to PDF
   - Include all evidence and documentation

6. **Calendar Integration**
   - iCal feed support
   - Sync with Google Calendar, Outlook
   - Deadline visualization

7. **Team Collaboration**
   - Comments and discussions
   - Task assignments
   - Real-time updates

## 🔐 Security

- Row Level Security (RLS) on all database tables
- JWT-based authentication
- API rate limiting
- Input validation and sanitization
- Content Security Policy (CSP)
- HTTPS enforced in production

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect Repository:**
   - Import project to Vercel
   - Connect GitHub repository

2. **Configure Environment:**
   - Add all environment variables
   - Configure build settings

3. **Deploy:**
   ```bash
   vercel --prod
   ```

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 🤝 Contributing

This is a proprietary project. For internal development:

1. Create a feature branch from `main`
2. Make your changes
3. Run tests: `npm test`
4. Create a pull request

## 📄 License

Proprietary - All rights reserved

## 📞 Support

For support, email support@ecocomply.com or visit our [documentation](https://docs.ecocomply.com).

## 🗺️ Roadmap

See `docs/specs/90_Build_Order_Implementation.md` for the complete build roadmap and implementation phases.

