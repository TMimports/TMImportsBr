# Mapa de Rotas e Checklist de Testes - TM Imports / Tecle Motos

## 1. Arquivos Alterados/Criados

### Novos Arquivos
- `server/utils/cpfCnpj.js` - Utilitários para geração e validação de CPF/CNPJ
- `server/seed/seedRealista.js` - Seed com dados realistas "10 de tudo"
- `server/seed/permissoesRBAC.js` - Matriz de permissões RBAC por role
- `docs/MAPA_ROTAS_E_TESTES.md` - Este documento

### Arquivos Modificados
- `server/routes/admin.js` - Endpoints de seed/reset
- `server/routes/dashboard.js` - Endpoints separados por tipo de dashboard
- `server/middleware/auth.js` - Guards para dashboards (global, operacional, financeiro)

---

## 2. Mapa de Rotas Frontend

| Rota | Componente | Roles com Acesso |
|------|------------|------------------|
| `/app/dashboard` | renderDashboard | ADMIN_GLOBAL, GESTOR_DASHBOARD, FRANQUEADO_GESTOR |
| `/app/dashboard/operacional` | renderDashboardOperacional | GERENTE_OP, ADM1, ADM2, ADM3, GERENTE_LOJA, VENDEDOR_LOJA |
| `/app/dashboard/financeiro` | renderDashboardFinanceiro | ADMIN_GLOBAL, FINANCEIRO, FRANQUEADO_GESTOR |
| `/app/meu-dashboard` | renderVendorDashboard | VENDEDOR_TMI, VENDEDOR_LOJA |
| `/app/produtos` | renderProducts | Todos (leitura), ADMIN/ADM2 (escrita) |
| `/app/categorias` | renderCategories | ADMIN_GLOBAL, ADM2_CADASTRO |
| `/app/estoque-central` | renderInventory | ADMIN_GLOBAL, GERENTE_OP, ADM1_LOGISTICA |
| `/app/estoque` | renderInventory | FRANQUEADO_GESTOR, GERENTE_LOJA |
| `/app/vendas` | renderSales | Todos com acesso a vendas |
| `/app/os` | renderServiceOrders | ADMIN, GERENTE_OP, ADM3, franquias |
| `/app/clientes` | renderCustomers | Todos (leitura) |
| `/app/receber` | renderReceivables | ADMIN_GLOBAL, FINANCEIRO, FRANQUEADO_GESTOR |
| `/app/pagar` | renderPayables | ADMIN_GLOBAL, FINANCEIRO, FRANQUEADO_GESTOR |
| `/app/fluxo` | renderCashFlow | ADMIN_GLOBAL, FINANCEIRO, FRANQUEADO_GESTOR |
| `/app/conciliacao` | renderReconciliation | ADMIN_GLOBAL, FINANCEIRO |
| `/app/usuarios` | renderUsers | ADMIN_GLOBAL, ADM2_CADASTRO, FRANQUEADO_GESTOR |
| `/app/franquias` | renderCompanies | ADMIN_GLOBAL, GERENTE_OP |
| `/app/lojas` | renderStores | ADMIN_GLOBAL |
| `/app/solicitacoes` | renderPurchaseRequests | Todos com acesso a pedidos |
| `/app/notas-fiscais` | renderInvoices | ADMIN_GLOBAL, FINANCEIRO, FRANQUEADO_GESTOR |
| `/app/rankings` | renderRankings | ADMIN_GLOBAL, GESTOR_DASHBOARD, FRANQUEADO_GESTOR |
| `/app/low-movers` | renderLowMovers | ADMIN_GLOBAL, GESTOR_DASHBOARD, FRANQUEADO_GESTOR |
| `/app/configuracoes` | renderSettings | ADMIN_GLOBAL |
| `/app/auditoria` | renderAuditLogs | ADMIN_GLOBAL |

---

## 3. Mapa de Endpoints Backend

### Dashboard
| Endpoint | Método | Guard | Roles com Acesso |
|----------|--------|-------|------------------|
| `/api/dashboard/summary` | GET | - | Todos (filtrado por loja) |
| `/api/dashboard/charts` | GET | - | Todos (filtrado por loja) |
| `/api/dashboard/rankings` | GET | - | Todos (filtrado por loja) |
| `/api/dashboard/low-movers` | GET | - | Todos (filtrado por loja) |
| `/api/dashboard/tipo-dashboard` | GET | - | Todos |
| `/api/dashboard/global-data` | GET | hasDashboardGlobalAccess | ADMIN_GLOBAL, GESTOR_DASHBOARD |
| `/api/dashboard/operacional-data` | GET | hasDashboardOperacionalAccess | GERENTE_OP, ADM1-3, franquias |
| `/api/dashboard/financeiro-data` | GET | hasDashboardFinanceiroAccess | ADMIN_GLOBAL, FINANCEIRO, FRANQUEADO_GESTOR |

### Financeiro
| Endpoint | Método | Guard | Roles com Acesso |
|----------|--------|-------|------------------|
| `/api/financial/receber` | GET/POST | hasFinanceiroAccess | ADMIN, FINANCEIRO, FRANQUEADO_GESTOR |
| `/api/financial/receber/:id` | PUT/DELETE | hasFinanceiroAccess | ADMIN, FINANCEIRO, FRANQUEADO_GESTOR |
| `/api/financial/receber/:id/baixar` | POST | hasFinanceiroAccess | ADMIN, FINANCEIRO, FRANQUEADO_GESTOR |
| `/api/financial/pagar` | GET/POST | hasFinanceiroAccess | ADMIN, FINANCEIRO, FRANQUEADO_GESTOR |
| `/api/financial/pagar/:id` | PUT/DELETE | hasFinanceiroAccess | ADMIN, FINANCEIRO, FRANQUEADO_GESTOR |
| `/api/financial/pagar/:id/baixar` | POST | hasFinanceiroAccess | ADMIN, FINANCEIRO, FRANQUEADO_GESTOR |

### Admin
| Endpoint | Método | Guard | Roles com Acesso |
|----------|--------|-------|------------------|
| `/api/admin/seed/reset` | POST | isAdminGlobal | ADMIN_GLOBAL |
| `/api/admin/seed/criar-realista` | POST | isAdminGlobal | ADMIN_GLOBAL |
| `/api/admin/limpar-dados` | POST | isAdminGlobal | ADMIN_GLOBAL |
| `/api/admin/seed/status` | GET | isAdminGlobal | ADMIN_GLOBAL |

---

## 4. Confirmação GERENTE_OP Modelo B

### Comportamento Esperado
- **Acessa:** `/app/dashboard/operacional` - Dashboard com OS, pedidos, estoque
- **Bloqueado (403 + log):** 
  - `/app/dashboard` (global) 
  - `/app/dashboard/financeiro`
  - `/api/dashboard/global-data`
  - `/api/dashboard/financeiro-data`
  - `/api/financial/*` (receber, pagar, fluxo caixa)

### Guards Implementados
- `hasDashboardGlobalAccess` - Bloqueia GERENTE_OP
- `hasDashboardFinanceiroAccess` - Bloqueia GERENTE_OP  
- `hasFinanceiroAccess` - Bloqueia GERENTE_OP
- Todos registram em `AuditLog` com ação `ACESSO_NEGADO`

---

## 5. Checklist de Testes por Perfil

### ADMIN_GLOBAL (admin@tmimports.com / admin123)
- [ ] Acessa Dashboard Global
- [ ] Acessa Dashboard Operacional
- [ ] Acessa Dashboard Financeiro
- [ ] Visualiza todas as franquias
- [ ] Cria/edita/exclui usuários
- [ ] Acessa Contas a Receber
- [ ] Acessa Contas a Pagar
- [ ] Executa POST /api/admin/seed/reset
- [ ] Visualiza logs de auditoria
- [ ] Acessa configurações globais

### GESTOR_DASHBOARD
- [ ] Acessa Dashboard Global (somente leitura)
- [ ] Visualiza Rankings
- [ ] Visualiza Low Movers
- [ ] NÃO pode editar dados
- [ ] NÃO acessa módulo financeiro (403)
- [ ] NÃO acessa configurações

### GERENTE_OP
- [ ] Acessa APENAS Dashboard Operacional
- [ ] NÃO acessa Dashboard Global (403 + log)
- [ ] NÃO acessa Dashboard Financeiro (403 + log)
- [ ] NÃO acessa Contas a Receber (403)
- [ ] NÃO acessa Contas a Pagar (403)
- [ ] NÃO acessa Fluxo de Caixa (403)
- [ ] Acessa franquias (operacional)
- [ ] Gerencia pedidos e estoque central
- [ ] Gerencia OS e garantias
- [ ] Acessa e edita produtos/motos/serviços

### FINANCEIRO
- [ ] Acessa Dashboard Financeiro
- [ ] NÃO acessa Dashboard Global (403)
- [ ] Acessa Contas a Receber (total)
- [ ] Acessa Contas a Pagar (total)
- [ ] Acessa Fluxo de Caixa
- [ ] Acessa Notas Fiscais
- [ ] Demais módulos somente leitura

### FRANQUEADO_GESTOR
- [ ] Acessa Dashboard da Loja
- [ ] Vê apenas dados da própria loja
- [ ] Gerencia estoque local
- [ ] Cria pedidos para TM Imports
- [ ] Gerencia OS e clientes
- [ ] Acessa financeiro da loja
- [ ] Cria/edita usuários da loja
- [ ] NÃO cria roles globais

### GERENTE_LOJA
- [ ] Acessa Dashboard Operacional
- [ ] Gerencia estoque da loja
- [ ] Cria pedidos para TM Imports
- [ ] Gerencia OS e clientes
- [ ] NÃO cria usuários
- [ ] NÃO acessa Dashboard Global completo

### VENDEDOR_LOJA
- [ ] Acessa Meu Dashboard (vendedor)
- [ ] Consulta estoque (somente leitura)
- [ ] Cria vendas e OS
- [ ] Cadastra clientes
- [ ] NÃO acessa rankings/low movers
- [ ] NÃO acessa financeiro completo
- [ ] NÃO faz pedidos para TM Imports

---

## 6. Seed Realista "10 de Tudo"

### Dados Gerados
- 10 franquias Tecle Motos (com empresas e lojas)
- 10 vendedores TM Imports
- Por loja:
  - 1 gestor + 2 gerentes + 7 vendedores
  - 10 clientes PF (CPF válido)
  - 10 clientes PJ (CNPJ válido)
- 10 motos elétricas (estoque central)
- 10 peças (estoque central)
- 10 serviços
- Por loja:
  - 10 vendas (últimos 30 dias)
  - 10 OS (5 abertas, 5 fechadas)
  - 10 contas a pagar
  - 10 contas a receber
  - 10 pedidos (status variados)

### Endpoint de Reset
```
POST /api/admin/seed/reset
Authorization: Bearer <token_admin>
```

Resposta esperada:
```json
{
  "success": true,
  "message": "Seed realista resetado e recriado com sucesso!",
  "dados": {
    "franquias": 10,
    "vendedoresTMI": 10,
    "produtosMotos": 10,
    "produtosPecas": 10,
    "produtosServicos": 10,
    ...
  }
}
```

---

## 7. Verificação de Rotas Financeiras

### /app/receber
- Renderiza: `renderReceivables()`
- Endpoint: `GET /api/financial/receber`
- Mostra lista de contas a receber com filtros
- NÃO redireciona para dashboard

### /app/pagar
- Renderiza: `renderPayables()`
- Endpoint: `GET /api/financial/pagar`
- Mostra lista de contas a pagar com filtros
- NÃO redireciona para dashboard
