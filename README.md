<div align="center">

# Thodemy

**Enterprise Learning Management System for Workforce Development**

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

A full-stack LMS platform built for structured onboarding, training management, and learner evaluation with role-based access control, real-time updates, and audit-ready reporting.

</div>

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Deployment](#deployment)
- [API Overview](#api-overview)
- [User Roles](#user-roles)
- [License](#license)

## Features

### Learner Experience
- Enroll in courses and structured learning paths via enrollment codes
- Track progress across topics, courses, and learning paths
- Submit activities with file uploads for admin verification
- Take quizzes and view scores
- Complete external forms within configurable time windows
- Receive real-time notifications via WebSocket
- Email-based multi-factor authentication (MFA)
- Multi-device session management with force logout

### Admin Dashboard
- Review and approve/reject learner submissions
- Manage users, courses, topics, and learning paths
- Create and manage admin tasks with status tracking
- Score learners using rubric-based evaluations
- Export checklists and reports to CSV/XLSX
- Full audit trail of all administrative actions

### Super Admin Controls
- Complete CRUD operations across all system entities
- Configure evaluation rubrics and scoring criteria
- Assign and revoke roles (user, admin, superadmin)
- Define learning paths with ordered course sequences
- Auto-populate evaluation scores from quiz data
- Export detailed evaluation workbooks with scoring breakdowns

### Platform
- Role-based access control (RBAC) with three tiers
- Real-time updates via Pusher WebSocket channels
- SMTP email notifications and MFA code delivery
- File uploads to local storage or Cloudinary
- Comprehensive input validation and sanitization
- Rate limiting, CSRF protection, and security headers
- Soft deletes for data retention and compliance

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite 5, Tailwind CSS 3, React Router 6 |
| **Backend** | Node.js 20, Express 5 |
| **Database** | PostgreSQL via Supabase |
| **Auth** | Supabase Auth (JWT) with email-based MFA |
| **Real-time** | Pusher (WebSocket) |
| **File Storage** | Multer (local), Cloudinary (cloud) |
| **Email** | Nodemailer (SMTP) |
| **Reporting** | ExcelJS (XLSX), CSV export |
| **Security** | Helmet, CORS, express-rate-limit, express-validator, CSRF |
| **Testing** | Jest, Supertest |
| **Deployment** | Docker (backend), Vercel (frontend) |

## Architecture

```
thodemy/
├── client/                     # React frontend (Vite)
│   └── src/
│       ├── components/         # Reusable UI components
│       │   ├── admin/          # Admin-specific components
│       │   ├── auth/           # Auth flows (MFA, profile setup)
│       │   └── dashboard/      # Dashboard widgets
│       ├── context/            # React context (AuthContext)
│       ├── hooks/              # Custom hooks
│       ├── lib/                # Supabase, Axios, Pusher clients
│       ├── pages/              # Route-level page components
│       │   └── admin/          # Admin & super admin views
│       ├── services/           # API service modules
│       ├── types/              # TypeScript type definitions
│       └── utils/              # Helper functions
│
├── server/                     # Express backend
│   └── src/
│       ├── config/             # Environment and client setup
│       ├── controllers/        # Request handlers
│       ├── middleware/         # Auth, validation, rate limiting
│       ├── routes/             # API route definitions
│       ├── services/           # Business logic layer
│       ├── validators/         # Input validation schemas
│       ├── templates/          # Email templates
│       ├── utils/              # Error classes, response helpers
│       └── __tests__/          # Jest test suites
│
├── sql/                        # Individual migration scripts
├── setup-database.sql          # Complete database schema
└── docs/                       # Documentation
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20 or higher
- [Supabase](https://supabase.com/) project (free tier works)
- [Pusher](https://pusher.com/) account (for real-time features)
- SMTP email account (Gmail app password recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/MarkJaven/thodemy.git
cd thodemy

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### Running Locally

```bash
# Terminal 1 - Start the backend
cd server
npm run dev          # http://localhost:5000

# Terminal 2 - Start the frontend
cd client
npm run dev          # http://localhost:5173
```

## Environment Variables

### Backend (`server/.env`)

```env
NODE_ENV=development
PORT=5000
FRONTEND_ORIGIN=http://localhost:5173

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_JWT_AUDIENCE=authenticated

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Pusher (Real-time)
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_key
PUSHER_SECRET=your_secret
PUSHER_CLUSTER=mt1

# MFA
MFA_CODE_TTL_MINUTES=10
MFA_MAX_ATTEMPTS=5

# Cloudinary (optional)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Frontend (`client/.env`)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_BASE_URL=http://localhost:5000
```

> See `.env.example` files in each directory for the full template.

## Database Setup

1. Open your Supabase project's **SQL Editor**
2. Run `setup-database.sql` to create all tables, or run the individual scripts in `sql/` in order:
   - `supabase-auth.sql` - Auth and profile tables
   - `cleanup-and-schema.sql` - Schema cleanup
   - `profile_setup_schema.sql` - Profile setup fields
   - `supabase-dashboard.sql` - Dashboard-related tables
   - `supabase-superadmin.sql` - Super admin tables
   - `add-learning-paths.sql` - Learning path schema

## Deployment

### Backend (Docker)

```bash
cd server
docker build -t thodemy-backend .
docker run -p 5000:5000 --env-file .env thodemy-backend
```

### Frontend (Vercel)

The client is configured for Vercel deployment. Push to your connected branch or:

```bash
cd client
npx vercel --prod
```

## API Overview

| Endpoint Group | Base Path | Auth |
|---------------|-----------|:----:|
| Health Check | `GET /health` | None |
| Authentication | `/api/auth/*` | Varies |
| MFA | `/api/mfa/*` | User |
| Courses | `/api/courses/*` | User |
| Learning Paths | `/api/learning-paths/*` | User |
| Topics | `/api/topics/*` | User |
| Activities | `/api/activities/*` | User |
| Submissions | `/api/submissions/*` | Admin |
| Forms | `/api/forms/*` | User |
| Sessions | `/api/session/*` | User |
| Admin | `/api/admin/*` | Admin+ |
| Evaluations | `/api/admin/evaluations/*` | Admin+ |

## User Roles

| Role | Access Level |
|------|-------------|
| **User** | Enroll in courses, complete topics, submit activities, take quizzes, view progress |
| **Admin** | All user permissions + verify submissions, manage users, generate reports, create tasks |
| **Super Admin** | Full system access + CRUD all entities, configure evaluations, assign roles |

## License

This project is licensed under the [MIT License](./LICENSE).

Copyright &copy; 2026 [Systems and Software Consulting Group, Inc.](https://github.com/MarkJaven)
