# TM Imports / Tecle Motos - Sistema ERP Multi-Empresa

Sistema ERP completo para gestão de motos e scooters elétricas, desenvolvido para TM Imports (matriz) e franquias Tecle Motos.

## Visão Geral

Sistema multi-empresa com:
- **Gestão de Franquias:** TM Imports (matriz) + múltiplas franquias Tecle Motos
- **Produtos:** Motos, scooters, peças e serviços com cálculo automático de preço
- **Estoque:** Central (TM Imports) + Estoques por loja com transferências
- **Vendas:** Fluxo completo com aprovação e geração de contas a receber
- **Ordens de Serviço:** Gestão completa com peças e mão de obra
- **Financeiro:** Contas a receber/pagar, fluxo de caixa, conciliação bancária
- **Solicitações de Compra:** Franquias solicitam produtos da matriz
- **Auditoria:** Log completo de todas as ações do sistema

## Como Rodar

```bash
npm install
node index.js
```

O servidor inicia na porta 5000.

## Credenciais de Acesso Padrão

Ao iniciar pela primeira vez, o sistema cria automaticamente um ADMIN GLOBAL:

- **Email:** admin@tmimports.com
- **Senha:** admin123

**IMPORTANTE:** Altere a senha após o primeiro login!

### Variáveis de Ambiente

- **DATABASE_URL:** URL de conexão PostgreSQL (gerada automaticamente)
- **ADMIN_EMAIL:** Email do administrador
- **ADMIN_SENHA:** Senha inicial do administrador
- **ADMIN_NOME:** Nome do administrador

## Perfis de Usuário

### ADMIN_GLOBAL
- Acesso total ao sistema
- Dashboard global com métricas de todas as franquias
- Gerencia empresas, lojas, usuários
- Controle do estoque central
- Aprova solicitações de compra das franquias
- Módulo financeiro completo
- Logs de auditoria

### GESTOR_FRANQUIA
- Dashboard da loja
- Cadastro de produtos/serviços
- Gestão de estoque da loja
- Solicita produtos da matriz
- Vendas e ordens de serviço
- Financeiro da loja
- Gerencia usuários da loja

### OPERACIONAL
- Dashboard simplificado
- Cadastra vendas (status pendente)
- Cria ordens de serviço
- Cadastra clientes
- Consulta estoque (somente leitura)

## Estrutura do Projeto

```
├── index.js                 # Ponto de entrada
├── server/
│   ├── index.js             # Servidor Express
│   ├── config/
│   │   └── database.js      # Configuração PostgreSQL/Sequelize
│   ├── models/
│   │   └── index.js         # Modelos e relacionamentos
│   ├── middleware/
│   │   └── auth.js          # Autenticação JWT
│   └── routes/
│       ├── auth.js          # Login/Logout
│       ├── users.js         # Gestão de usuários
│       ├── companies.js     # Gestão de empresas
│       ├── stores.js        # Gestão de lojas
│       ├── products.js      # CRUD produtos/serviços
│       ├── inventory.js     # Estoque central/loja
│       ├── sales.js         # Sistema de vendas
│       ├── serviceOrders.js # Ordens de serviço
│       ├── customers.js     # Clientes
│       ├── vendors.js       # Vendedores
│       ├── financial.js     # Contas a receber/pagar
│       ├── bank.js          # Conciliação bancária
│       ├── dashboard.js     # Dashboards
│       ├── categories.js    # Categorias
│       ├── purchaseRequests.js # Solicitações de compra
│       └── audit.js         # Logs de auditoria
├── views/
│   ├── login.ejs            # Tela de login
│   └── app.ejs              # App principal (SPA)
├── public/
│   ├── css/style.css        # Estilos CSS
│   ├── js/app.js            # JavaScript SPA
│   └── images/              # Imagens e logo
└── uploads/                 # Arquivos anexados
```

## Fluxo de Vendas

1. **Operacional/Gestor** cria venda com cliente, produtos e forma de pagamento
2. Venda fica com status **PENDENTE**
3. **Gestor/Admin Global** pode:
   - Aprovar a venda
   - Editar a venda
   - Concluir (baixa estoque, gera conta a receber)
   - Cancelar

## Solicitações de Compra (Franquias)

1. **Gestor da Franquia** cria solicitação com itens desejados
2. Solicitação fica **PENDENTE** para a matriz
3. **Admin Global** aprova ou rejeita
4. Após aprovação, Admin Global envia os produtos
5. **Gestor da Franquia** confirma recebimento

## Conciliação Bancária (Estilo Conta Azul)

1. Cadastre as contas bancárias da empresa/loja
2. Importe extratos (OFX, CSV, Excel)
3. Sistema identifica transações duplicadas
4. Conciliação automática por valor
5. Conciliação manual para casos específicos

## Tecnologias

- **Backend:** Node.js + Express
- **Banco de Dados:** PostgreSQL com Sequelize ORM
- **Frontend:** EJS templates + CSS customizado + JavaScript SPA
- **Autenticação:** JWT (JSON Web Tokens)
- **Gráficos:** Chart.js

## Tema Visual

- Fundo preto/grafite (#1a1a1a)
- Destaques em laranja (#FF6B35) - identidade Tecle Motos
- Textos em branco
- Detalhes em verde-neon (#00FF88) - energia elétrica

## Segurança

- **Autenticação:** JWT com expiração de 24h
- **Autorização:** ACL por perfil (ADMIN_GLOBAL, GESTOR_FRANQUIA, OPERACIONAL)
- **Senhas:** Hash com bcryptjs
- **Multi-tenant:** Filtro automático por loja/empresa

## Notas Fiscais (NF-e / NFC-e / NFS-e)

O sistema possui um módulo completo de gestão de notas fiscais similar ao Bling:

### Funcionalidades
- Emissão de NF-e (Nota Fiscal Eletrônica)
- Emissão de NFC-e (Cupom Fiscal Eletrônico)
- Emissão de NFS-e (Nota Fiscal de Serviço)
- Cancelamento de notas com motivo
- Carta de correção
- Geração de notas a partir de vendas

### Status das Notas
- **RASCUNHO:** Nota criada mas não emitida (pode editar/excluir)
- **PROCESSANDO:** Enviada para processamento
- **AUTORIZADA:** Nota válida e autorizada pela SEFAZ
- **REJEITADA:** Rejeitada pela SEFAZ (verificar erros)
- **CANCELADA:** Nota cancelada

### Configuração Fiscal
Antes de emitir notas, configure os dados fiscais:
1. Razão Social e CNPJ
2. Endereço completo
3. Regime tributário
4. Séries e numeração
5. Integração com API (opcional)

### Integração com API
O sistema suporta integração com:
- Focus NFe
- PlugNotas
- Nuvem Fiscal

**Modo Manual:** Sem integração, as notas são apenas registradas no sistema.

### Arquivos
- `server/models/index.js` - Modelos: FiscalData, Invoice, InvoiceItem, InvoiceEvent
- `server/routes/invoices.js` - Rotas da API de notas fiscais
- `public/js/app.js` - Interface frontend (renderInvoices)

## Mudanças Recentes

- **12/01/2026:** Sistema RBAC Multi-Role Completo
  - Implementação de permissões granulares para 11 roles distintas
  - Multi-role: usuário pode ter múltiplas funções via checkbox (permissões = união)
  - Dashboard Global restrito a ADMIN_GLOBAL e GESTOR_DASHBOARD
  - Módulo Financeiro/Fiscal restrito a ADMIN_GLOBAL, FINANCEIRO e gestores de franquia
  - GERENTE_OP: acesso operacional amplo (franquias, produtos, estoque, OS) sem financeiro
  - ADM1_LOGISTICA: logística/expedição/transferências/pedidos
  - ADM2_CADASTRO: criar usuários/franquias/produtos/serviços
  - ADM3_OS_GARANTIA: OS e garantias com dashboard do módulo
  - VENDEDOR_TMI: consulta estoque + vendas (comissão 2%)
  - FRANQUEADO_GESTOR: total na franquia + pedidos ao estoque central
  - GERENTE_LOJA: operacional total na franquia
  - VENDEDOR_LOJA: estoque loja + OS + vendas + clientes (comissão 1%)
  - Middleware backend com guards: hasDashboardGlobalAccess, hasFinanceiroAccess, hasFiscalAccess
  - Auditoria de acesso negado registrada em AuditLog
  - Migração automática de usuários existentes para UserRole na inicialização
  - Fallback para perfil legado garante compatibilidade

- **12/01/2026:** Dashboard do Vendedor e Limpeza de Dados
  - Novo dashboard específico para vendedores (/app/meu-dashboard)
  - Diferenciação visual por tipo: Atacado (TM Imports - laranja) e Franquia (Tecle Motos - verde)
  - Métricas do vendedor: vendas por status (pendentes, aprovadas, concluídas, canceladas)
  - Comissões: taxa aplicada, comissão do mês e acumulada do ano
  - Visualização de estoque: total de produtos, estoque baixo, zerado e valor total
  - Clientes atendidos e últimas 5 vendas
  - Comissões configuráveis: 2% atacado, 1% franquia (via Configurações)
  - Cobertura de Estoque: renomeado de "Dias de Estoque" com tooltip explicativo
  - Endpoint /api/admin/limpar-dados para limpeza de dados transacionais
  - Botão "Limpar Todos os Dados" nas Configurações com dupla confirmação
  - Preserva: usuários, produtos, categorias, vendedores, estoque, configurações
  - Remove: vendas, OS, clientes, notas fiscais, logs, notificações

- **09/01/2026:** Novas Páginas de Rankings e Dashboard de Franquias
  - Página de Rankings (/app/rankings) com abas: Motos, Peças, Serviços
  - Página Low Movers (/app/low-movers): produtos parados, menos vendidos, sem venda no período
  - Dashboard de Franquias (/app/franquias-dashboard): lista de franquias com ranking por performance
  - Drill-down por franquia com métricas detalhadas
  - Filtros de período (Semanal/Mensal/Total) persistidos em localStorage
  - Cards do dashboard expandidos: OS Abertas/Fechadas, Estoque Baixo/Zerado, Pedidos por status
  - Estilos CSS para tabs e novas cores de ícones

- **09/01/2026:** Dashboard Melhorado com Filtros de Período
  - Novos endpoints: /dashboard/summary, /charts, /rankings, /low-movers
  - Filtros de período: Semanal (7 dias), Mensal, Total (12 meses)
  - Tratamento de erro no frontend com botão "Tentar Novamente"
  - Permissões por perfil para acesso ao dashboard
  - Correção do "Carregando..." infinito
  - Dados de exemplo para teste do sistema

- **09/01/2026:** Sistema RBAC Multi-Role e PWA
  - Novos modelos: Role, UserRole para permissões granulares
  - 11 roles padrão: ADMIN_GLOBAL, GESTOR_DASHBOARD, GERENTE_OP, FINANCEIRO, ADM1-3, VENDEDOR_TMI, FRANQUEADO_GESTOR, GERENTE_LOJA, VENDEDOR_LOJA
  - Middleware de autenticação atualizado para carregar roles e agregar permissões
  - Tabela Settings com configurações globais (descontos, parcelamento, taxas de cartão)
  - Endpoint /api/settings/validar-venda para validação de regras de venda
  - Regras de negócio: desconto só à vista, juros no cartão, limites por tipo
  - Painel de Configurações Globais para ADMIN_GLOBAL
  - Sistema de notificações com alertas de estoque mínimo
  - PWA: manifest.json e service worker para instalação mobile
  - Ícones PWA (192x192 e 512x512)
  - Logo dinâmica baseada no perfil do usuário

- **11/12/2024:** Módulo de Notas Fiscais
  - Modelos de banco: FiscalData, Invoice, InvoiceItem, InvoiceEvent
  - CRUD completo de notas fiscais
  - Interface para criação manual de notas
  - Configuração de dados fiscais da empresa
  - Emissão, cancelamento e carta de correção
  - Geração de notas a partir de vendas (generateInvoiceFromSale)
  - Dashboard com estatísticas de notas emitidas
  - Filtros por status e tipo de nota
  - Suporte a integração com APIs de NF-e

- **11/12/2024:** Dashboard do Franqueado com Estoque TM Imports
  - Nova seção no dashboard do franqueado mostrando estoque disponível da matriz
  - Endpoint /api/inventory/central-disponivel para produtos com estoque > 0
  - Franqueado pode selecionar produtos e criar solicitação de compra direto do dashboard
  - Sistema de carrinho para múltiplos produtos na mesma solicitação
  - Validação de quantidade máxima disponível

- **11/12/2024:** Recriação completa do sistema
  - Migração de SQLite para PostgreSQL
  - Arquitetura multi-empresa (TM Imports + Franquias)
  - Novos perfis: ADMIN_GLOBAL, GESTOR_FRANQUIA, OPERACIONAL
  - Sistema de solicitações de compra (franquia → matriz)
  - Estoque central + estoques por loja
  - Conciliação bancária automática
  - Logs de auditoria completos
  - Interface SPA com navegação sem recarregar página
  - Dashboard global e por loja
