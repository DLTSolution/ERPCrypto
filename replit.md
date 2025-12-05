# ERPCrypto - DeFi Dashboard & Crypto ERP Platform

## Overview

ERPCrypto is a hybrid cryptocurrency platform that combines free public tools (market data, liquidity pools monitoring, charts) with authenticated user tools (wallet management, operations tracking, tax reporting, capital gains calculation, and borrow/lend portfolio management). The platform features a modern Web3/DeFi aesthetic inspired by platforms like Nansen, DefiLlama, Moralis Money, and Zerion, with a dark-mode-only interface featuring glassmorphism, neon accents, and gradient elements.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (December 2024)

- **PostgreSQL Database Integration:** Migrated from in-memory storage to PostgreSQL using Drizzle ORM. All user data (wallets, operations, pools, borrow/lend) is now persisted to database.
- **CoinGecko API Integration:** Real-time market data including prices, market cap, 24h changes, volume, and Fear & Greed index from CoinGecko and alternative.me APIs with fallback data.
- **PTAX API Integration:** Real-time USD/BRL exchange rates from Banco Central do Brasil (BCB) OLINDA API for accurate Brazilian tax calculations.
- **PDF Generation:** IN 2991 fiscal reports can now be exported as PDF documents using PDFKit.
- **GitHub Integration:** Project connected to repository at https://github.com/DLTSolution/ERPCrypto.git

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
- **Database:** PostgreSQL with Drizzle ORM
- **Session Management:** express-session with MemoryStore
- **PDF Generation:** PDFKit for fiscal report exports
- **Validation:** Zod schemas (shared between client and server)
- **Build Process:** esbuild for server bundling, Vite for client

**External API Integrations:**
- **CoinGecko API:** Market data, token prices, OHLC charts (with caching)
- **Fear & Greed Index API:** Market sentiment from alternative.me
- **PTAX API (BCB):** Official USD/BRL exchange rates from Banco Central do Brasil

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
- Market data: `/api/market/overview`, `/api/market/tokens`
- Pools: `/api/pools` (public), `/api/user-pools` (protected)
- PTAX: `/api/ptax`, `/api/ptax/:date` (historical rates)
- Charts: `/api/charts/:tokenId/:timeframe`
- Wallets: `/api/wallets` (GET, POST), `/api/wallets/:id` (PATCH, DELETE)
- Collaterals: `/api/collaterals` (GET, POST)
- Borrows: `/api/borrows` (GET, POST)
- Operations: `/api/operations` (GET, POST)
- Tax reports: `/api/tax/report`, `/api/tax/capital-gains`, `/api/tax/in2991-pdf`

**Data Storage (PostgreSQL via Drizzle ORM):**
- Schema definitions in `shared/schema.ts`
- Database connection in `server/db.ts`
- Storage interface in `server/storage.ts` (DatabaseStorage class)
- Use `npm run db:push` to sync schema changes

**Database Tables:**
- `users`: id (serial), username, password
- `wallets`: id (serial), userId, name, address
- `user_pools`: id (serial), userId, dex, network, pair, entry/exit dates, values, fees, status
- `collaterals`: id (serial), userId, asset, amount, valueUsd, ltv, healthFactor
- `borrows`: id (serial), userId, asset, borrowedAmount, interestRate, valueUsd
- `operations`: id (serial), userId, type, tokens, amounts, values, dates, transferType

### External Dependencies

**UI Component Libraries:**
- **Radix UI:** Comprehensive collection of unstyled, accessible UI primitives
- **Shadcn UI:** Pre-styled component library built on Radix UI with Tailwind
- **Lucide React:** Icon library for consistent iconography
- **Recharts:** Charting library for data visualization

**Data Fetching & State:**
- **TanStack Query (React Query):** Server state management with 60s stale time
- **React Hook Form:** Form state management and validation
- **Zod:** Schema validation (shared between client/server)

**Styling & Design:**
- **TailwindCSS:** Utility-first CSS framework
- **class-variance-authority (cva):** Type-safe variant styling
- **clsx & tailwind-merge:** Conditional class name utilities

**Backend Services:**
- **Express.js:** Web server framework
- **express-session:** Session management middleware
- **PDFKit:** PDF document generation for fiscal reports
- **Drizzle ORM:** Type-safe SQL query builder
- **pg:** PostgreSQL client

**Development Tools:**
- **Vite:** Development server with HMR
- **tsx:** TypeScript execution
- **TypeScript:** Type safety across entire stack
- **drizzle-kit:** Database schema management (`npm run db:push`)

## Development Commands

- `npm run dev` - Start development server
- `npm run db:push` - Push schema changes to database
- `npm run build` - Build for production

## Future Enhancements (Planned)

- Web3 wallet integration (MetaMask, WalletConnect)
- Real-time price alerts
- Multi-currency support
- Advanced tax optimization suggestions
- Portfolio performance analytics
