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

## Mudanças Recentes

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
