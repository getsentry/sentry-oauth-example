# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

This is a complete Sentry OAuth authentication example with full-stack implementation:

1. **Frontend** (`sentryauth-frontend/`): React 19 + TypeScript + Vite SPA with authentication
2. **Backend** (`server/`): Express.js server with SQLite database and OAuth integration

### Backend Architecture
- **Express.js** server with session-based authentication
- **SQLite** database for user storage with automatic schema initialization
- **Sentry OAuth Service** (`server/services/sentry-oauth.ts`) handles complete OAuth 2.0 flow
- **Session management** using express-session with SQLite store
- **CORS enabled** for frontend communication

### Frontend Architecture
- **React Context** (`AuthContext`) for global authentication state
- **Beautiful login page** with modern CSS design and animations
- **Protected dashboard** showing user information and account details
- **OAuth callback handling** with success/error pages
- **Simple routing** without external router dependencies

## Development Commands

### Quick Start (Root Directory)
```bash
npm run setup        # Install all dependencies and create .env files
npm run dev          # Start both frontend and backend concurrently
```

### Individual Services
```bash
# Backend only
npm run dev:backend  # Start backend development server (port 3001)

# Frontend only  
npm run dev:frontend # Start frontend development server (port 5173)
```

### Production
```bash
npm run build        # Build frontend for production
npm start            # Start both services in production mode
```

### Utility Commands
```bash
npm run install:all  # Install dependencies for all packages
npm run lint         # Run ESLint on frontend
npm run setup:env    # Create .env files from examples
```

## Setup Instructions

### Option 1: Quick Setup (Recommended)
```bash
npm run setup        # Installs all dependencies and creates .env files
# Edit server/.env with your Sentry OAuth credentials
npm run dev          # Starts both frontend and backend
```

### Option 2: Manual Setup
1. **Install Dependencies:**
   ```bash
   npm run install:all  # Installs dependencies for root, server, and frontend
   ```

2. **Configure Environment:**
   ```bash
   cp server/.env.example server/.env
   cp sentryauth-frontend/.env.example sentryauth-frontend/.env
   # Edit server/.env with your Sentry OAuth credentials
   ```

3. **Start Development:**
   ```bash
   npm run dev          # Starts both services concurrently
   ```

## Environment Variables

### Backend (server/.env)
- `SENTRY_OAUTH_CLIENT_ID` (required) - Your Sentry OAuth app client ID
- `SENTRY_OAUTH_CLIENT_SECRET` (required) - Your Sentry OAuth app client secret
- `SENTRY_OAUTH_REDIRECT_URI` (required) - OAuth callback URL (default: http://localhost:3001/api/auth/callback)
- `SENTRY_BASE_URL` (optional) - Sentry instance URL (defaults to https://sentry.io)
- `PORT` (optional) - Server port (defaults to 3001)
- `SESSION_SECRET` (required) - Secret key for session encryption
- `FRONTEND_URL` (optional) - Frontend URL for CORS and redirects (defaults to http://localhost:5173)

### Frontend (sentryauth-frontend/.env)
- `VITE_API_URL` (optional) - Backend API URL (defaults to http://localhost:3001)

## API Endpoints

- `GET /api/auth/login` - Initiate OAuth login, returns Sentry auth URL
- `GET /api/auth/callback` - OAuth callback handler, redirects to frontend
- `GET /api/auth/me` - Get current authenticated user (protected)
- `POST /api/auth/logout` - Logout and destroy session
- `GET /api/protected` - Example protected endpoint
- `GET /health` - Health check endpoint

## Database Schema

### Users Table
- `id` - Primary key (auto-increment)
- `sentry_id` - Unique Sentry user ID
- `email` - User email address
- `name` - User display name
- `username` - Sentry username
- `avatar_url` - User avatar URL
- `access_token` - Encrypted OAuth access token
- `created_at` - Account creation timestamp
- `updated_at` - Last update timestamp

## Key Implementation Details

- **OAuth Flow**: Complete OAuth 2.0 implementation with state verification
- **Session Security**: HTTPOnly cookies with proper security settings
- **Database**: Auto-initializing SQLite with prepared statements
- **Error Handling**: Comprehensive error handling with Sentry integration
- **CORS Configuration**: Properly configured for frontend-backend communication
- **Responsive Design**: Mobile-friendly authentication UI