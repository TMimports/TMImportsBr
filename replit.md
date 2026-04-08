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
- Granular RBAC permission system with 7 roles (ADMIN_GERAL, ADMIN_FINANCEIRO, ADMIN_REDE, DONO_LOJA, GERENTE_LOJA, VENDEDOR, TECNICO)
- Strict multi-tenant isolation on all GET-by-ID routes (vendas, clientes, OS, grupos, garantias, revisoes)
- Group owner registration with temporary password and mandatory password change on first login
- Admin-configurable percentage settings (commissions, discounts) with change history
- Real-time group-wide stock monitoring (Utilidades page)
- XLSX/CSV import for Units (Motos) with automatic product linking
- Sales product selection filtered by store inventory (only shows products with stock in selected store)
- Global loja selector in topbar (desktop + mobile): Visão Consolidada or per-loja; filters Dashboard to DashboardEmpresa when loja selected
- Lojas management available in Configurações → "Unidades / Lojas" tab AND in sidebar under "Rede de Franquias" (ADMIN_GERAL)
- Grupos (franchise groups) accessible in sidebar under "Rede de Franquias" group for ADMIN_GERAL
- TECNICO role has dedicated menu: Dashboard, Estoque, Atendimento (Minhas OS, Garantias, Minhas Comissões)
- ADMIN_FINANCEIRO has Comercial group (Clientes, Vendas, OS) for financial context
- Security: auth route cleaned of all debug logs; JWT_SECRET throws in production if not set via env var
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
- Bank reconciliation module (ConciliacaoBancaria): ContaBancaria + LancamentoBancario models, OFX import parser, manual entries, conciliation matching with Pagamento/Recebimento, balance calculation
- Backend: /api/conciliacao-bancaria (contas, lancamentos, OFX import, conciliar/desconciliar, candidatos, resumo)
- ConciliacaoBancaria tab added to FinanceiroHub (after Notas Fiscais)
- Dashboard por CNPJ: GET /api/dashboard/empresa/:lojaId returns full per-store KPIs (vendas, estoque, financeiro, fiscal, atividade recente)
- New pages: Fornecedores.tsx (CRM with timeline), NotasFiscais.tsx (fiscal control), DashboardEmpresa.tsx (per-CNPJ KPIs)
- New backend routes: /api/fornecedores, /api/crm (interações/follow-ups), /api/notas-fiscais, /api/dashboard/empresa/:id
- Automated report system: role-based email reports (GERAL→ADMIN_GERAL, FINANCEIRO→ADMIN_FINANCEIRO, COMERCIAL→DONO_LOJA/GERENTE/ADMIN_REDE) with XLSX attachment, HTML email, alerts & suggestions. Scheduled via node-cron (weekly Mon 07:00, monthly day-1 07:30 BRT). Gmail SMTP via SMTP_USER/SMTP_PASS secrets. Manual dispatch from Relatorios.tsx page. Backend: /api/relatorios (destinatarios, disparar, testar-email)
- WhatsApp CRM: template system (8 contextos: MOTIVACIONAL_VENDEDOR, FOLLOWUP_CLIENTE, FOLLOWUP_FORNECEDOR, COBRANCA, BOAS_VINDAS, CONFIRMACAO_VENDA, AVISO_GARANTIA, PERSONALIZADO), bulk dispatch with wa.me links, dispatch history (DisparoWhatsApp), daily cron Mon-Fri 08:00 BRT for motivational messages to active VENDEDORs with phone. Quick 💬 buttons on Clientes, Fornecedores, Usuarios. Backend: /api/whatsapp (templates CRUD, /disparar, /disparar/bulk, /disparar/motivacional, /disparos, /stats, /vendedores). Frontend: WhatsAppCRM.tsx with Disparar/Templates/Histórico tabs. Menu visible to ADMIN_GERAL, ADMIN_FINANCEIRO, ADMIN_REDE, DONO_LOJA, GERENTE_LOJA.
- Financeiro por Loja (FinanceiroEmpresa.tsx): ADMIN_GERAL-only financial hub per store. Sidebar entry under "Rede de Franquias" → "Financeiro por Loja". Three tabs: Visão Geral (saldo líquido + KPI cards for AP/AR), A Pagar (filterable list by status + search), A Receber (filterable list by status + search). Backend: lojaId query param added to GET /api/financeiro/dashboard, /api/financeiro/contas-pagar, /api/financeiro/contas-receber, /api/financeiro/contas-pagar/resumo, /api/financeiro/contas-receber/resumo. Only applies when user is ADMIN_GERAL (no existing tenant filter is overwritten).
- Financeiro sidebar as group: FIN_GROUP with 8 sub-items (Visão Geral, A Pagar, A Receber, Compras, Fiscal, Conciliação, Fornecedores, Categorias); each navigates to FinanceiroHub with the correct initialTab prop. App.tsx has fin-* routes, FinanceiroHub accepts initialTab?: TabId.
- Custo médio ponderado fix: weighted average fallback uses produto.custo (global cost) instead of item.valorUnitario (new purchase cost), preventing the bug where buying at a new price would set custo médio = new price regardless of existing stock.
- PedidosCompra: número do pedido removed from form (auto-assigned by DB id). Fornecedor field replaced with searchable dropdown that fetches /api/fornecedores; validation requires selecting a registered supplier before saving.
- Estoque TabMovimentacao: added "ID Mov." column showing origemId (#N) or fallback mov:id for traceability.
- Sequential codes: OS número uses format `OS-00001` (ID-based); Produto código uses `TMMOT00001/TMPEC00001/TMSRV00001` per type. Startup auto-normalization in server/src/index.ts. Retroactive endpoints: POST /api/ordens-servico/normalizar-numeros and POST /api/produtos/normalizar-codigos.
- KPI card responsiveness: Dashboard grid uses `sm:grid-cols-3 lg:grid-cols-6` with truncate/min-w-0 for mobile.
- Estoque inline transfer (TabGerencial): Peças (non-moto) show orange "↔" expand button → inline panel with De→Para dropdown + qty controls + confirm button. Motos show blue "📋 Ver Unidades" button that switches directly to Unitária tab with model pre-filtered.
- Estoque inline transfer (TabUnitaria): Each unit (chassi) with status ESTOQUE shows transfer button. Own store → orange "↔ Transferir" (with destination dropdown). Other store → blue "Solicitar" (destination pre-filled = your store). Inline panel below the row, no modal, auto-closes on success.
- BuscadorRede (cross-network search): Peças have inline transfer panel. Motos show "📋 Ver Unidades Disponíveis nesta loja" button that navigates to that store's Estoque → Unitária tab.
- Transfer workflow: POST /api/transferencias (status=SOLICITADA) → PUT /api/transferencias/:id/aprovar (status=APROVADA, ADMIN only) → PUT /api/transferencias/:id/concluir (status=CONCLUIDA, stock actually moves). Rejection: PUT /api/transferencias/:id/rejeitar.
- `podeTransferir` rule in TabGerencial: isAdmin OR lojaId === minhaLojaId (only see transfer button for own store or as admin). TabUnitaria: shows button for ALL authenticated users (admin with dropdown, own store with dropdown, other store with fixed destination).

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
