# EcoComply Platform

**Compliance Management SaaS for Environmental Permits**

EcoComply is a comprehensive compliance management platform designed to help UK businesses manage environmental permits, track obligations, and maintain regulatory compliance.

## 🚀 Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- Git
- Supabase account
- OpenAI API key
- SendGrid account (for email notifications)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/waqaarkhan92/EcoComply.git
   cd EcoComply
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Fill in your actual values in .env.local
   ```

4. Validate environment variables:
   ```bash
   npm run validate-env
   ```

5. Start development server:
   ```bash
   npm run dev
   ```

## 📚 Documentation

All specification documents are in `docs/specs/`:
- `docs/specs/90_Build_Order_Implementation.md` - Complete build guide
- `docs/specs/20_Database_Schema.md` - Database structure
- `docs/specs/40_Backend_API_Specification.md` - API endpoints
- `docs/specs/30_Product_Business_Logic.md` - Business logic
- And more... (see `docs/specs/` for all 19 specification documents)

## 🏗️ Build Order

Follow the build order in `docs/specs/90_Build_Order_Implementation.md`:
- **Phase 0:** Prerequisites & Setup (current)
- **Phase 1:** Foundation (Database, Auth, RLS)
- **Phase 2:** Core API Layer
- **Phase 3:** AI Extraction Layer
- **Phase 4:** Background Jobs
- **Phase 5:** Frontend (Next.js)
- **Phase 6:** Advanced Features
- **Phase 7:** Integration & Testing
- **Phase 8:** Module Extensions (Module 2 & 3)

## 🛠️ Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **Backend:** Next.js API Routes, Supabase
- **Database:** PostgreSQL (Supabase)
- **AI:** OpenAI GPT-4o, GPT-4o-mini
- **Background Jobs:** BullMQ with Redis
- **Deployment:** Vercel (frontend), Railway/Render (workers)

## 📝 License

Proprietary - All rights reserved

