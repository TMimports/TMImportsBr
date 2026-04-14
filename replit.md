# TM Imports / Tecle Motos - Sistema ERP Multi-Empresa

## Overview

This project is a comprehensive multi-company ERP system for TM Imports and its Tecle Motos franchises, specializing in electric motorcycle and scooter management. It provides robust solutions for products, inventory, sales, and financial operations across multiple stores within a group, including advanced features like automated warranty generation, detailed financial tracking, and an extensive role-based access control system. The system aims to provide a scalable, secure, and intuitive platform for managing franchise operations efficiently.

## User Preferences

- Clean and intuitive UI/UX with dark theme
- Robust and scalable system for multiple franchises
- Data integrity and security are paramount
- Modularity and maintainability in development
- Ask confirmation before significant structural changes

## System Architecture

### Frontend (client/)
- **Framework:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS v4
- **State Management:** React Context API
- **Components:** Custom UI component library for reusable elements.
- **UI/UX Decisions:**
    - Global store selector for consolidated or per-store views.
    - Responsive design for dashboards and data tables.
    - Inline modals and panels for quick actions (e.g., creating clients/suppliers, inventory transfers).
    - Dedicated menus and dashboards for specific roles (e.g., TECNICO, ADMIN_FINANCEIRO).

### Backend (server/)
- **Runtime:** Node.js 22, TypeScript (tsx)
- **Web Framework:** Express.js
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Authentication:** JWT with bcryptjs for password hashing.
- **Key Features & Design Patterns:**
    - **Multi-tenancy:** Strict isolation for data access based on user's assigned store/group.
    - **RBAC:** Granular role-based access control with 7 predefined roles.
    - **Inventory Management:** Centralized and per-store inventory, inter-store transfers, weighted average cost calculation, audit logs, and stock visibility controls based on roles.
    - **Sales & CRM:** End-to-end sales workflow, automated accounts receivable, warranty generation, client/supplier management with interaction timelines (CRM).
    - **Financial Management:** Comprehensive AR/AP, cash flow, bank reconciliation (OFX import), automated payment generation from purchase orders, and a configurable chart of accounts.
    - **Fiscal Module:** Management of incoming/outgoing Notas Fiscais with detailed fiscal fields.
    - **Automated Reporting:** Role-based email reports with XLSX attachments and scheduled delivery.
    - **WhatsApp CRM:** Template-based messaging system for various contexts, bulk dispatch, and quick access from client/supplier records.
    - **Sequential Codes:** Automated generation and normalization of sequential IDs for OS, Products.

### Color Scheme
- Background: `#09090b` (zinc-950)
- Card/Panel: `#18181b` (zinc-900)
- Border: `#27272a` (zinc-800)
- Accent: `#f97316` (orange-500)
- Success: `#22c55e` (green-500)
- Error: `#ef4444` (red-500)

## External Dependencies

- **Database:** PostgreSQL (managed by Neon)
- **ORM:** Prisma
- **Web Framework:** Express.js
- **Authentication:** `jsonwebtoken` (JWT)
- **Password Hashing:** `bcryptjs`
- **Excel/CSV Processing:** `xlsx`
- **Email/Scheduling:** `node-cron`, `nodemailer` (via SMTP)

## Key Implementation Notes

### Roles & Permissions
- 7 roles: ADMIN_GERAL, ADMIN_FINANCEIRO, ADMIN_REDE, DONO_LOJA, GERENTE_LOJA, VENDEDOR, TECNICO
- Admin (admin@teclemotos.com) NEVER has lojaId or grupoId
- **verCustos**: only `['ADMIN_GERAL','ADMIN_FINANCEIRO','ADMIN_REDE'].includes(role)` can see cost values. All other roles (including DONO_LOJA) cannot see costs.

### Global Loja Filter (LojaContext)
- `selectedLojaId` from LojaContext auto-filters ALL modules: Estoque, Financeiro, Vendas, PedidosCompra, Garantias
- Estoque: auto-navigates to ViewEmpresa when selectedLojaId is set; clears to consolidado view when null
- Backend routes support `?lojaId=X` query param for Vendas (route line ~92) and Garantias (GET /)
- Financeiro passes `lojaId` to both `/contas-pagar` and `/contas-pagar/resumo`
- All pages import `useLojaContext` and react to `selectedLojaId` changes

### PedidoCompra Payment Fields
- Schema: `metodoPagamento String?`, `dataPagamento DateTime?`, `numeroParcelas Int? @default(1)`
- On confirmation (PUT /:id/confirmar): auto-generates one ContaPagar per installment with monthly intervals
- Frontend: ModalPedido has "Condições de Pagamento" section; DetalhesPedido shows these fields

### Quick-Create Modals
- Vendas: "+" button opens inline modal to create Cliente without leaving the sale form
- PedidosCompra: "+" button opens inline modal to create Fornecedor without leaving the form

### Transfer Workflow
- POST /transferencias (SOLICITADA) → PUT /:id/aprovar (APROVADA) → PUT /:id/concluir (CONCLUIDA — stock moves)
- Rejection: PUT /:id/rejeitar

### LOJA_ORDER
`{4:0, 1:1, 8:2, 7:3, 6:4, 2:5, 9:6, 11:7, 5:8, 12:9, 10:10, 3:11}` — LOJA_IMPORTACAO_ID = 4

### API Patterns
- AuthContext NEVER exports `token`. Use `api.get/post/put/patch/delete` — api returns data directly, NOT wrapped in `.data`
- All pages use NAMED exports; App.tsx uses named imports
- Fornecedor schema: uses `classe: ClasseFornecedor` (PRODUTO/SERVICO/AMBOS), NOT `tipo`

### CRM Leads Beta — Enriquecimento Claude/n8n (2026-04-14)
- **Schema**: `Lead` model tem campos `mensagemWhatsApp String?` e `interesseCorrigido String?` além de `resumo`, `proximaAcao`, `prioridade`, `origem`, `campanha`.
- **`integracoes.ts`**: `POST /integracoes/leads-test` aceita payload Claude completo (`prioridade`, `interesseCorrigido`, `resumo`, `proximaAcao`, `mensagemWhatsApp`). Token: `INTEGRATION_TOKEN = 'crm_test_token_2024'`. Regra: `prioridade` vazia → `MEDIA`; `interesseCorrigido` vazio → `null`.
- **`crm-leads.ts`**: POST e PATCH persistem `interesseCorrigido` e `mensagemWhatsApp`.
- **`CrmLeadsBeta.tsx`**: Interface `Lead` tem os novos campos. Seção "🤖 Análise Claude / n8n" exibe `interesseCorrigido`, `resumo`, `proximaAcao` e `mensagemWhatsApp` (com botão WhatsApp deep-link). Na lista: coluna Interesse mostra `interesseCorrigido` em azul com `(🤖)` se disponível; coluna Prioridade mostra badge `🤖` se houver `resumo`.
- **Backend TS**: erros pré-existentes em `estoque.ts` e `unidades.ts` (campo `fornecedorId` inexistente em `UnidadeFisica`) foram corrigidos — 0 erros confirmados.

### Entrada Avulsa de Estoque (2026-04-14)
- **Backend** `POST /estoque/entrada-avulsa`: aceita MOTO (cria UnidadeFisica por chassi) e PECA (InventoryService.darEntrada). LogEstoque origem = `ENTRADA_AVULSA`. Permissão: ADMIN_GERAL, ADMIN_FINANCEIRO, ADMIN_REDE, DONO_LOJA, GERENTE_LOJA.
- **Backend** `POST /importacao/estoque`: importa planilha (.xlsx/.xls/.csv) com detecção flexível de colunas. Resolve loja por nome (exata ou parcial). Upsert Produto + Estoque + LogEstoque (origem = `IMPORTACAO_ESTOQUE`). Se chassi presente → cria UnidadeFisica.
- **Frontend** `ModalEntradaAvulsa`: modal em ViewEmpresa, seleciona produto, detecta tipo (MOTO/PECA), para MOTO exibe lista de chassi+cor+ano+custo; para PECA exibe quantidade. Botão "📦 Entrada Avulsa" no header.
- **Frontend** `ModalImportacaoEstoque`: modal com upload de arquivo, usa `FormData` + `fetch` direto (não `api`). Exibe resumo: linhas processadas, entradas lançadas, produtos criados, erros. Botão "📊 Importar Planilha" no header.
- Interface `EntradaChassiRow` separada de `ChassiRow` (existente em ModalCadastroChassi) para evitar conflito.
- TypeScript: 0 erros em frontend e backend após implementação.

### Audit Notes (2026-04-10 — Auditoria Final)
- **Security**: `/api/setup` and `/api/debug-build` endpoints now guarded by `isDev` — inaccessible in production
- **Navigation roles**: `ADMIN_FINANCEIRO` and `GERENTE_LOJA` now use `CADASTROS_BASE_GROUP` (Fornecedores + Categ./Depart. only, no Usuários). `ADMIN_GERAL` and `DONO_LOJA` keep full `CADASTROS_GROUP` with Usuários
- **Legacy cleanup**: removed `server/routes/` (legacy JS routes directory, unused)
- **App.tsx**: `case 'unidades'` now redirects to `<Estoque />` instead of showing dead "Módulo descontinuado" message
- **DashboardEmpresa.tsx**: replaced raw `fetch` + localStorage token with `api` service (consistent with all other pages)
- **TypeScript**: 0 errors confirmed on both frontend and backend after all changes

### Audit Notes (2026-04-09)
- **Venda model**: uses `valorTotal` (NOT `total`). All routes/services fixed to use `valorTotal`.
- **OrdemServico model**: uses `valorTotal` (NOT `total`).
- **Configuracao model**: global (NO lojaId). Fields: `comissaoVendedorMoto`, `comissaoTecnico`, etc.
- **ContaPagar.fornecedor**: plain String? field (NOT a relation). No `fornecedorRel`.
- **UnidadeFisica**: correct Prisma model name (NOT `unidade`).
- **Departamento**: natureza field removed from form (defaults to AMBOS). Still in DB/display.
- **Estoque TabGerencial**: price editing removed. Display only.
- **PedidosCompra**: fornecedor quick-create now passes lojaId. Form has categoria/departamento fields.
- **Layout**: CADASTROS_GROUP added for ADMIN_GERAL, ADMIN_FINANCEIRO, DONO_LOJA, GERENTE_LOJA.
- **Backend TypeScript**: 0 errors confirmed after audit.
- **Frontend TypeScript**: 0 errors confirmed after audit.