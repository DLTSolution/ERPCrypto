# ERPCrypto Design Guidelines

## Design Approach
**Reference-Based Approach**: Draw inspiration from leading Web3/DeFi platforms:
- **Nansen**: Premium gradients, data-rich interfaces, sophisticated dark themes
- **DefiLlama**: Clean data presentation, efficient information density
- **Moralis Money**: Modern crypto analytics aesthetics
- **Zerion**: Sleek portfolio management UI
- **Raydium/Jupiter**: Bold neon accents, glassmorphic components

## Core Design Elements

### Color Scheme
- **Dark Mode Only**: Primary dark background with depth
- **Nansen-Style Gradients**: Subtle purple-to-blue gradients for hero sections and cards
- **Neon Accents**: Cyan, purple, and green highlights for interactive elements and data points
- **Glassmorphism**: Semi-transparent panels with backdrop blur effects
- **Semantic Colors**: Green for positive metrics, red for negative, yellow for warnings

### Typography
- **Font Family**: System font stack for performance (Inter or similar via Google Fonts as fallback)
- **Hierarchy**: 
  - Hero headings: Bold, 3xl-4xl
  - Section titles: Semibold, 2xl
  - Card headers: Medium, lg-xl
  - Body text: Regular, sm-base
  - Data/metrics: Tabular numbers, mono for addresses

### Layout System
- **Spacing Units**: Tailwind units of 2, 4, 6, 8, 12, 16 (p-4, m-6, gap-8, etc.)
- **Container**: Max-width-7xl for main content areas
- **Grid System**: 12-column responsive grid for dashboard cards
- **Sidebar**: Collapsible 64-280px width with smooth transitions

### Component Library

**Navigation:**
- Top navbar: Logo left, account/login right, glass background with border
- Sidebar: Grouped sections (Public/Protected), icons with labels, active state highlighting

**Data Display:**
- Tables: Shadcn DataTable with sorting, pagination, row hover effects
- Cards: Glass panels with subtle borders, rounded-xl corners
- Metrics: Large numbers with labels, trend indicators (↑↓), sparkline mini-charts
- Charts: TradingView integration with dark theme customization

**Forms:**
- Inputs: Dark backgrounds with glowing focus borders
- Modals: Centered overlays with backdrop blur
- Buttons: Primary (gradient), secondary (outlined), ghost variants

**Status Indicators:**
- Health Factor: Color-coded badges (green >1.5, yellow 1.2-1.5, red <1.2)
- ROI: Percentage with color coding
- Lock Icons: For protected features with "Login Required" state

### Animations
- **Minimal & Purposeful**: Smooth transitions on hover/focus only
- **Sidebar Toggle**: 200ms ease-in-out
- **Card Hover**: Subtle lift (translateY -2px) with glow
- **Data Updates**: Fade transitions, no distracting animations

## Page-Specific Design

### Market Dashboard
- Hero metrics cards in 3-column grid (Market Cap, BTC Dominance, Fear & Greed)
- Token table full-width below with alternating row backgrounds

### Pools Monitor
- Filter bar at top with dropdowns (Network, DEX, Token)
- Efficiency metric highlighted with gradient background

### Borrow & Lend
- Split layout: Collateral table top, Borrow table bottom
- Health factor prominently displayed as hero metric card

### Tax Reports
- Monthly grouping with collapsible sections
- R$ 35,000 threshold highlighted with warning badge
- Export buttons top-right with icon + text

## Images
**No Hero Images**: This is a data-intensive dashboard application. Replace traditional hero imagery with:
- Gradient backgrounds with animated grid patterns
- Data visualization as the primary visual element
- Icon-driven UI for feature representation
- Abstract geometric patterns for visual interest in empty states