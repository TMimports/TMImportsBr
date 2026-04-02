# TM Imports / Tecle Motos - Sistema ERP Multi-Empresa

## Overview

This project is a comprehensive multi-company ERP system designed for TM Imports (headquarters) and its Tecle Motos franchises. It specializes in the management of electric motorcycles and scooters, encompassing products, inventory, sales, and financial operations.

**Key Capabilities:**
- Multi-company and franchise management via Groups (each franchise gets its own group)
- Product and service catalog with automated pricing
- Centralized and per-store inventory management with transfers between stores of the same group
- End-to-end sales workflow with approvals and automatic accounts receivable generation for ALL payment types
- Automatic warranty creation (4 types: geral, motor, modulo, bateria) on motorcycle sales (checks produto.tipo === 'MOTO')
- Retroactive warranty generation endpoint (POST /api/garantias/retroativas) for existing sales
- Retroactive ContaReceber generation endpoint (POST /api/financeiro/contas-receber/retroativas) for existing sales
- Complete service order management with real-time price breakdown and ContaReceber on confirmation
- Comprehensive financial management (AR/AP, cash flow, bank reconciliation)
- Safe client deletion (prevents deletion if client has linked sales/OS)
- PWA Support for mobile installation and offline capabilities
- Granular RBAC permission system with 6 roles (ADMIN_GERAL, ADMIN_FINANCEIRO, ADMIN_REDE, DONO_LOJA, GERENTE_LOJA, VENDEDOR)
- Strict multi-tenant isolation on all GET-by-ID routes (vendas, clientes, OS, grupos, garantias, revisoes)
- Group owner registration with temporary password and mandatory password change on first login
- Admin-configurable percentage settings (commissions, discounts) with change history
- Real-time group-wide stock monitoring (Utilidades page)
- XLSX/CSV import for Units (Motos) with automatic product linking
- Sales product selection filtered by store inventory (only shows products with stock in selected store)
- Two-layer Estoque page: Gerencial (by model/custoMédio) + Unitária (by chassi), with per-CNPJ selector and consolidated admin view
- Purchase order system (PedidosCompra) with weighted average cost recalculation on stock entry confirmation
- Inventory audit log (AuditoriaEstoque) tracking all stock changes with user attribution
- Weighted average cost (custoMedio) on Estoque model, auto-calculated via PedidoCompra confirmation
- Backend endpoints: GET /api/estoque/empresa/:lojaId, GET /api/estoque/consolidado, /api/pedidos-compra, /api/auditoria/estoque
- Full financial architecture: CategoriaFinanceira, Departamento, dual-origin ContaPagar (COMPRA + AVULSA), installment tracking (ParcelaContaPagar/ParcelaContaReceber), Pagamento and Recebimento movement models
- Auto-generate ContaPagar (origem=COMPRA) when PedidoCompra is confirmed
- Plano de Contas page for managing categories and departments
- Financial dashboard with KPIs (open, overdue, upcoming, paid/received)
- Backend: /api/categorias-financeiras, /api/departamentos, /api/financeiro/dashboard, /api/financeiro/contas-pagar/parcelas/:id/pagar
- CRM module: Fornecedor model (CNPJ/CPF, class, contacts, address) with InteracaoCRM (history/timeline for both clientes and fornecedores)
- Fiscal module: NotaFiscal (NF entrada/saída) + ItemNotaFiscal with full fiscal fields (NCM, CFOP, CST, CSOSN, ICMS, IPI, PIS, COFINS)
- Fiscal fields added to Produto: ncm, cfop, cst, csosn, unidade (UnidadeMedida enum), aliquotas
- Dashboard por CNPJ: GET /api/dashboard/empresa/:lojaId returns full per-store KPIs (vendas, estoque, financeiro, fiscal, atividade recente)
- New pages: Fornecedores.tsx (CRM with timeline), NotasFiscais.tsx (fiscal control), DashboardEmpresa.tsx (per-CNPJ KPIs)
- New backend routes: /api/fornecedores, /api/crm (interações/follow-ups), /api/notas-fiscais, /api/dashboard/empresa/:id

**Business Model:**
- **Grupo** = A franchisee/owner entity that can contain multiple stores
- **Loja** = Physical store belonging to a group
- Stores in the same group can view each other's inventory and make transfers
- Group owner (DONO_LOJA role) can manage all stores in their group

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
