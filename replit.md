# TM Imports / Tecle Motos - Sistema ERP Multi-Empresa

## Overview

This project is a comprehensive multi-company ERP system designed for TM Imports (headquarters) and its Tecle Motos franchises. It specializes in the management of electric motorcycles and scooters, encompassing products, inventory, sales, and financial operations.

**Key Capabilities:**
- Multi-company and franchise management
- Product and service catalog with automated pricing
- Centralized and per-store inventory management with transfers
- End-to-end sales workflow with approvals and accounts receivable generation
- Complete service order management
- Comprehensive financial management (AR/AP, cash flow, bank reconciliation)
- PWA Support for mobile installation and offline capabilities
- Granular RBAC permission system with 5 roles

## Development vs Production

### Development Mode (Hot Reload)
Two workflows run in parallel:
1. **Start application** - Vite dev server on port 5000 with hot reload
2. **Backend API** - TypeScript server on port 3001 with watch mode

The Vite server proxies API calls (`/api/*`) to the backend on port 3001.

**Any changes to `client/src/` files will immediately reflect in the browser!**

### Production Mode (Deploy)
- Build: `cd client && npm run build`
- Run: `NODE_ENV=production npx tsx server/src/index.ts`
- The server serves static files from `client/dist/` on port 5000

### Scripts
```bash
# Development
npm run dev          # Run Vite + backend in parallel
npm run dev:server   # Backend only with watch
npm run dev:client   # Vite only

# Production
npm run build        # Build client
npm run start        # Run production server

# Database
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:seed      # Seed database
```

## User Preferences

- Clean and intuitive UI/UX with dark theme
- Robust and scalable system for multiple franchises
- Data integrity and security are paramount
- Modularity and maintainability in development
- Ask confirmation before significant structural changes

## System Architecture

### Frontend (client/)
- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v4
- **State:** React Context API
- **Components:** Custom UI component library (`client/src/components/ui/`)

### Backend (server/)
- **Runtime:** Node.js 22 with TypeScript (tsx)
- **Framework:** Express.js
- **ORM:** Prisma with PostgreSQL
- **Auth:** JWT with bcryptjs password hashing

### UI Component Library
Located in `client/src/components/ui/`:
- `Button` - Primary, secondary, success, danger, ghost variants
- `Input` - With label, error, hint support
- `Select` - Dropdown with label support
- `Card` / `CardHeader` - Container components
- `KpiCard` - Dashboard metrics cards
- `Table` - Data table with selection, loading states
- `SectionHeader` - Page headers with actions
- `Badge` - Status indicators

### Color Scheme
- Background: `#09090b` (zinc-950)
- Card/Panel: `#18181b` (zinc-900)
- Border: `#27272a` (zinc-800)
- Accent: `#f97316` (orange-500)
- Success: `#22c55e` (green-500)
- Error: `#ef4444` (red-500)

## File Structure

```
├── client/                  # Frontend React app
│   ├── src/
│   │   ├── components/      # React components
│   │   │   └── ui/         # Reusable UI components
│   │   ├── contexts/       # React contexts (Auth, etc.)
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service functions
│   │   └── App.tsx         # Main app component
│   └── vite.config.ts      # Vite configuration
├── server/
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── middleware/     # Express middleware
│   │   └── index.ts        # Server entry point
│   └── prisma/
│       ├── schema.prisma   # Database schema
│       └── seed.ts         # Database seeder
├── package.json            # Root package.json with scripts
└── .replit                 # Replit configuration
```

## External Dependencies

- **Database:** PostgreSQL (Neon-backed on Replit)
- **ORM:** Prisma
- **Web Framework:** Express.js
- **Authentication:** jsonwebtoken (JWT)
- **Password Hashing:** bcryptjs
- **File Processing:** xlsx (Excel/CSV import)
