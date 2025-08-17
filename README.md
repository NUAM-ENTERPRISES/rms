# Affiniks Recruitment Management System (RMS)

A production-grade, enterprise-level recruitment management system built with modern technologies and best practices.

## 🏗️ Architecture Overview

This project follows a **modular monolith** architecture with clean separation of concerns:

- **Frontend**: React + Vite + TypeScript + Tailwind CSS + ShadCN UI
- **Backend**: NestJS + TypeScript + Prisma ORM + PostgreSQL
- **State Management**: Redux Toolkit + RTK Query
- **Authentication**: JWT + Refresh Tokens
- **Styling**: Tailwind CSS with Apple-inspired design system

## 📁 Project Structure

```
rms/
├── backend/                 # NestJS Backend
│   ├── src/
│   │   ├── auth/           # Authentication module
│   │   ├── users/          # User management
│   │   ├── roles/          # Role-based access control
│   │   ├── teams/          # Team management
│   │   ├── clients/        # Client management
│   │   ├── projects/       # Project management
│   │   ├── candidates/     # Candidate management
│   │   ├── documents/      # Document verification
│   │   ├── interviews/     # Interview scheduling
│   │   ├── processing/     # Post-selection workflows
│   │   ├── notifications/  # Notification system
│   │   ├── analytics/      # Analytics and reporting
│   │   ├── common/         # Shared utilities
│   │   └── config/         # Configuration
│   ├── prisma/             # Database schema and migrations
│   └── package.json
├── web/                    # React Frontend
│   ├── src/
│   │   ├── app/           # Redux store and providers
│   │   ├── features/      # Feature-based modules
│   │   ├── components/    # Reusable UI components
│   │   │   ├── ui/        # ShadCN base components
│   │   │   ├── atoms/     # Atomic components
│   │   │   ├── molecules/ # Molecular components
│   │   │   └── organisms/ # Complex components
│   │   ├── pages/         # Route-specific views
│   │   ├── services/      # RTK Query API endpoints
│   │   ├── hooks/         # Custom React hooks
│   │   ├── utils/         # Utility functions
│   │   ├── constants/     # Constants and enums
│   │   └── types/         # TypeScript type definitions
│   └── package.json
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for background jobs)

### Backend Setup

1. **Navigate to backend directory:**

   ```bash
   cd backend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**

   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Set up database:**

   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

5. **Start development server:**
   ```bash
   npm run start:dev
   ```

The backend will be available at `http://localhost:3000`

### Frontend Setup

1. **Navigate to web directory:**

   ```bash
   cd web
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**

   ```bash
   cp .env.example .env
   # Edit .env with your API URL
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:5173`

## 🎨 Design System

The application uses a **Apple-inspired design system** with:

- **Colors**: Soft, muted palette with primary blue and accent purple
- **Typography**: Inter font family for clean, modern look
- **Spacing**: Consistent 4px grid system
- **Shadows**: Subtle, layered shadows for depth
- **Border Radius**: Rounded corners (xl, 2xl) for modern feel

### Theme Tokens

All colors, spacing, and typography are defined as CSS custom properties in `tailwind.config.ts`:

```typescript
colors: {
  background: '#f9fafb',
  foreground: '#111827',
  primary: { /* Blue palette */ },
  accent: { /* Purple palette */ },
  muted: { /* Gray palette */ },
  // ... more colors
}
```

## 🔐 Authentication & Authorization

### JWT Strategy

- **Access Token**: 15-minute lifespan
- **Refresh Token**: 7-day lifespan with rotation
- **Secure Storage**: HTTP-only cookies (web) / encrypted storage (mobile)

### Role-Based Access Control (RBAC)

- **CEO/Director**: Full system access
- **Manager**: Multi-team access
- **Team Head**: Assigned team access
- **Team Lead**: Task monitoring
- **Recruiter**: Candidate handling
- **Documentation Executive**: Document verification
- **Processing Executive**: Post-selection workflows

## 📊 Database Schema

The system uses **PostgreSQL** with **Prisma ORM** for type-safe database operations:

### Core Entities

- **Users**: System users with roles and team assignments
- **Roles**: Permission definitions and access control
- **Teams**: Organizational structure
- **Clients**: Hospital/agency information
- **Projects**: Recruitment projects with role requirements
- **Candidates**: Applicant profiles and status tracking
- **Documents**: File uploads and verification
- **Interviews**: Scheduling and outcomes
- **Processing**: Post-selection workflow tracking

## 🔄 State Management

### Redux Toolkit + RTK Query

- **Centralized State**: User authentication, app settings
- **API Integration**: Automatic caching, background updates
- **Optimistic Updates**: Immediate UI feedback
- **Error Handling**: Centralized error management

### API Structure

```typescript
// Example RTK Query service
export const projectsApi = createApi({
  reducerPath: "projectsApi",
  baseQuery,
  tagTypes: ["Project"],
  endpoints: (builder) => ({
    getProjects: builder.query<Project[], void>({
      query: () => "/projects",
      providesTags: ["Project"],
    }),
    // ... more endpoints
  }),
});
```

## 🧪 Testing Strategy

### Frontend Testing

- **Unit Tests**: Vitest + React Testing Library
- **Component Testing**: Isolated component testing
- **Integration Tests**: API integration testing
- **E2E Tests**: Cypress (planned)

### Backend Testing

- **Unit Tests**: Jest for services and utilities
- **Integration Tests**: Supertest for API endpoints
- **E2E Tests**: Full workflow testing

## 🚀 Deployment

### Frontend (Vercel)

- **Feature Branches**: Preview deployments
- **Main Branch**: Production deployment
- **Environment Variables**: Per-environment configuration

### Backend (DigitalOcean)

- **Docker Containers**: Containerized deployment
- **Managed PostgreSQL**: Database hosting
- **Load Balancing**: Traffic distribution
- **Monitoring**: Sentry for error tracking

## 📋 Development Guidelines

### Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint + Prettier**: Code formatting and linting
- **Conventional Commits**: Standardized commit messages
- **Atomic Design**: Component architecture principles

### Security Practices

- **Input Validation**: Zod schemas for all inputs
- **SQL Injection Prevention**: Prisma ORM usage
- **XSS Protection**: React's built-in protection
- **CSRF Protection**: Token-based validation
- **Rate Limiting**: API request throttling

### Performance Optimization

- **Code Splitting**: Lazy-loaded routes and components
- **Image Optimization**: WebP format with fallbacks
- **Caching**: RTK Query automatic caching
- **Database Indexing**: Optimized queries

## 🔧 Available Scripts

### Backend

```bash
npm run start:dev    # Development server
npm run build        # Production build
npm run test         # Run tests
npm run test:e2e     # Run E2E tests
npm run lint         # Lint code
npm run format       # Format code
```

### Frontend

```bash
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview production build
npm run test         # Run tests
npm run lint         # Lint code
npm run format       # Format code
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Follow coding standards**: ESLint, Prettier, TypeScript
4. **Write tests**: Unit and integration tests
5. **Commit changes**: Use conventional commit format
6. **Push to branch**: `git push origin feature/amazing-feature`
7. **Open Pull Request**: Detailed description of changes

## 📄 License

This project is proprietary software developed for Affiniks. All rights reserved.

## 🆘 Support

For technical support or questions:

- **Email**: tech@affiniks.com
- **Documentation**: Internal wiki
- **Issues**: GitHub Issues (internal)

---

**Built with ❤️ by the Affiniks Development Team**
