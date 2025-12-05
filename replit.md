# ERPCrypto - DeFi Dashboard & Crypto ERP Platform

## Overview

ERPCrypto is a hybrid cryptocurrency platform that combines free public tools (market data, liquidity pools monitoring, charts) with authenticated user tools (wallet management, operations tracking, tax reporting, capital gains calculation, and borrow/lend portfolio management). The platform features a modern Web3/DeFi aesthetic inspired by platforms like Nansen, DefiLlama, Moralis Money, and Zerion, with a dark-mode-only interface featuring glassmorphism, neon accents, and gradient elements.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- **Framework:** React 18 with TypeScript
- **Routing:** Wouter (lightweight client-side routing)
- **Build Tool:** Vite (development and production builds)
- **Styling:** TailwindCSS with custom crypto-themed design system
- **Component Library:** Shadcn UI (Radix UI primitives)
- **State Management:** TanStack Query (React Query) for server state
- **Form Handling:** React Hook Form with Zod validation

**Design System:**
- Dark mode only with Nansen-style gradients (purple-to-blue, purple-to-cyan)
- Glassmorphism effects using backdrop blur and semi-transparent backgrounds
- Neon accent colors (cyan, purple, green) for interactive elements
- Custom CSS variables defined in `client/src/index.css` for theming
- Inter font family for UI, JetBrains Mono for addresses and data
- Responsive grid system with collapsible sidebar

**Component Structure:**
- Reusable UI components in `client/src/components/ui/` (buttons, cards, dialogs, tables, etc.)
- Application-specific components in `client/src/components/` (sidebar, login modal, data tables, metric cards)
- Page components in `client/src/pages/` for each route
- Path aliases configured: `@/` for client source, `@shared/` for shared types

**Key Features:**
- Public routes (no authentication): Market overview, pools monitor, charts
- Protected routes (require authentication): Wallets, user pools, borrow/lend, operations, tax reports, capital gains
- Authentication state managed via React Context (`AuthProvider`)
- Session-based authentication with automatic session restoration
- Login/registration modal triggered for protected routes

### Backend Architecture

**Technology Stack:**
- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Session Management:** express-session with MemoryStore
- **Validation:** Zod schemas (shared between client and server)
- **ORM:** Drizzle ORM configured for PostgreSQL
- **Build Process:** esbuild for server bundling, Vite for client

**API Structure:**
- RESTful endpoints organized in `server/routes.ts`
- Session-based authentication (no JWT/token in current implementation)
- Protected routes use `requireAuth` middleware
- CRUD operations for: users, wallets, pools, collaterals, borrows, operations

**Authentication Flow:**
- Registration: POST `/api/auth/register` - creates user and establishes session
- Login: POST `/api/auth/login` - validates credentials and creates session
- Session check: GET `/api/auth/me` - returns current user or 401
- Logout: POST `/api/auth/logout` - destroys session

**API Endpoints:**
- Auth: `/api/auth/*` (register, login, logout, me)
- Market data: `/api/market/overview`, `/api/tokens`, `/api/pools`, `/api/candles/:tokenId/:timeframe`
- Wallets: `/api/wallets` (GET, POST), `/api/wallets/:id` (PUT, DELETE)
- User pools: `/api/pools/user` (GET, POST)
- Collaterals: `/api/collaterals` (GET, POST)
- Borrows: `/api/borrows` (GET, POST)
- Operations: `/api/operations` (GET, POST)
- Tax reports: `/api/tax/report`, `/api/tax/capital-gains`

**Data Storage:**
- In-memory storage implementation in `server/storage.ts` (IStorage interface)
- Schema definitions in `shared/schema.ts` using Zod
- Drizzle ORM configured for PostgreSQL migration (not yet connected to database)
- Session storage uses MemoryStore (switches to connect-pg-simple for production PostgreSQL)

### External Dependencies

**UI Component Libraries:**
- **Radix UI:** Comprehensive collection of unstyled, accessible UI primitives (@radix-ui/react-*)
- **Shadcn UI:** Pre-styled component library built on Radix UI with Tailwind
- **Lucide React:** Icon library for consistent iconography
- **cmdk:** Command palette component
- **Embla Carousel:** Carousel/slider component

**Data Fetching & State:**
- **TanStack Query (React Query):** Server state management, caching, and synchronization
- **React Hook Form:** Form state management and validation
- **Zod:** Schema validation (shared between client/server via `@hookform/resolvers`)

**Styling & Design:**
- **TailwindCSS:** Utility-first CSS framework
- **class-variance-authority (cva):** Type-safe variant styling
- **clsx & tailwind-merge:** Conditional class name utilities
- **PostCSS & Autoprefixer:** CSS processing

**Backend Services:**
- **Express.js:** Web server framework
- **express-session:** Session management middleware
- **connect-pg-simple:** PostgreSQL session store (for production)
- **memorystore:** In-memory session store (for development)
- **Drizzle ORM:** Type-safe SQL query builder and ORM
- **PostgreSQL:** Planned production database (configured but not yet connected)

**Development Tools:**
- **Vite:** Development server with HMR and production bundler
- **esbuild:** Fast server-side bundling
- **tsx:** TypeScript execution for development
- **TypeScript:** Type safety across entire stack
- **Replit plugins:** Development banner, runtime error overlay, cartographer

**Build & Deployment:**
- Client builds to `dist/public` via Vite
- Server builds to `dist/index.cjs` via esbuild with dependency bundling
- Static file serving in production mode
- Development mode uses Vite middleware with HMR

**Third-Party Integrations (Planned/Mocked):**
- Market data APIs (currently using mock data in storage layer)
- Blockchain data providers (for wallet address tracking)
- Tax calculation services (implemented with mock data)
- Exchange rate APIs (for BRL/USD conversions)

**Database Schema (via Drizzle):**
- Users: id, username, password (hashed)
- Wallets: id, userId, name, address
- Tokens: market data for cryptocurrencies
- Pools: liquidity pool information (pair, network, DEX, TVL, volume, APY)
- UserPools: user-specific pool positions with entry/exit tracking
- Collaterals: collateral positions for lending protocols
- Borrows: borrow positions with interest tracking
- Operations: transaction history (buy, sell, swap, transfer, lost funds)
- Tax reports & capital gains: calculated data for Brazilian tax reporting