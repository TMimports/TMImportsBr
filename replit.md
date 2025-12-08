# Tecle Motos - Dashboard de Mobilidade Elétrica

Sistema completo de gestão para motos e scooters elétricas, peças e serviços.

## Visão Geral

Este é um sistema de dashboard profissional desenvolvido para a Tecle Motos, com funcionalidades completas de:
- Gestão de produtos (motos, scooters, peças, serviços)
- Controle de estoque e subestoques
- Gestão de chassi (com rastreamento individual)
- Sistema de vendas com fluxo de aprovação
- Financeiro (contas a receber, a pagar, conciliação bancária)
- Dashboard com gráficos e projeções

## Como Rodar

```bash
npm install
npm start
```

O servidor inicia na porta 5000.

## Credenciais de Acesso Padrão

Ao iniciar pela primeira vez, o sistema cria automaticamente um SUPER ADMIN:

- **Email:** admin@teclemotos.com
- **Senha:** admin123

**IMPORTANTE:** Altere a senha após o primeiro login!

## Perfis de Usuário

### SUPER ADMIN
- Acesso total ao sistema
- Dashboard principal com gráficos e previsões
- Gerencia usuários, produtos, estoque, chassi
- Aprova e conclui vendas (seleciona chassi)
- Acesso ao módulo financeiro completo

### ADMIN
- Cadastro de produtos/serviços
- Gestão de estoque e subestoque
- Sem acesso ao dashboard principal
- Sem acesso ao financeiro

### VENDEDOR
- Dashboard próprio de vendas
- Cadastra e edita suas vendas (status pendente)
- Consulta estoque (somente leitura)
- Não escolhe chassi nem conclui venda

### CONTADOR
- Acesso somente leitura ao financeiro
- Visualiza contas a receber/pagar
- Acessa conciliação bancária
- Não altera cadastros

## Estrutura do Projeto

```
├── config/
│   └── database.js          # Configuração SQLite/Sequelize
├── models/
│   ├── index.js             # Relacionamentos entre modelos
│   ├── Usuario.js
│   ├── Produto.js
│   ├── Estoque.js
│   ├── Subestoque.js
│   ├── ItemEstoque.js
│   ├── Chassi.js
│   ├── Venda.js
│   ├── ItemVenda.js
│   ├── AnexoVenda.js
│   ├── ContaReceber.js
│   ├── ContaPagar.js
│   ├── LancamentoBancario.js
│   └── Anexo.js
├── routes/
│   ├── auth.js              # Login/Logout
│   ├── dashboard.js         # Dashboard SUPER ADMIN
│   ├── produtos.js          # CRUD produtos/serviços
│   ├── estoque.js           # Gestão de estoque
│   ├── chassi.js            # Gestão de chassi
│   ├── vendas.js            # Sistema de vendas
│   ├── vendedor.js          # Dashboard vendedor
│   ├── financeiro.js        # Contas a receber/pagar/conciliação
│   └── usuarios.js          # Gestão de usuários
├── middleware/
│   └── auth.js              # Autenticação e autorização
├── views/
│   ├── partials/            # Componentes reutilizáveis
│   ├── auth/                # Tela de login
│   ├── dashboard/           # Dashboard principal
│   ├── products/            # Produtos/serviços
│   ├── stock/               # Estoque
│   ├── chassis/             # Chassi
│   ├── sales/               # Vendas
│   ├── financial/           # Financeiro
│   ├── users/               # Usuários
│   └── vendedor/            # Área do vendedor
├── public/
│   ├── css/style.css        # Estilos CSS
│   └── js/app.js            # JavaScript frontend
├── uploads/                 # Arquivos anexados
├── index.js                 # Servidor Express
└── database.sqlite          # Banco de dados (gerado automaticamente)
```

## Fluxo de Vendas

1. **Vendedor** cria venda com cliente, produtos e forma de pagamento
2. Venda fica com status **PENDENTE**
3. **SUPER ADMIN** visualiza vendas pendentes
4. SUPER ADMIN pode:
   - Editar a venda
   - Selecionar chassi para motos/scooters
   - **Concluir** a venda (dá baixa no estoque, marca chassi como vendido, gera conta a receber)
   - Cancelar a venda

## Contas Recorrentes (Mensais)

Para contas fixas (luz, aluguel, etc):
1. Marque o tipo como "Fixa (Mensal)"
2. Ative a opção "Gerar parcelas mensais até dezembro"
3. O sistema exibirá todas as parcelas do mês selecionado até dezembro
4. Você pode **editar a data e o valor** de cada parcela individualmente
5. Ao salvar, todas as parcelas serão criadas com os valores personalizados

## Primeiro Acesso (Definir Senha)

Quando um novo usuário é cadastrado:
1. O SUPER ADMIN define uma **senha temporária** para o usuário
2. No primeiro login, o usuário é redirecionado para definir sua **própria senha**
3. Após definir a senha, o usuário pode acessar o sistema normalmente
4. O SUPER ADMIN pode **resetar a senha** de qualquer usuário a qualquer momento

## Tecnologias

- **Backend:** Node.js + Express
- **Banco de Dados:** SQLite com Sequelize ORM
- **Frontend:** EJS templates + CSS customizado
- **Gráficos:** Chart.js

## Tema Visual

- Fundo preto/grafite
- Destaques em laranja (identidade Tecle Motos)
- Textos em branco
- Detalhes em verde-neon (energia elétrica)

## Segurança

- **Proteção CSRF:** Middleware personalizado em middleware/csrf.js com validação após multer para rotas de upload
- **Upload de Arquivos:** Validação de tipo MIME (imagens e PDFs), limite de 10MB, sanitização de nomes
- **Senhas:** Hash com bcryptjs
- **Sessões:** Express-session com cookie seguro

## Mudanças Recentes

- **08/12/2024:** Correção de erros e melhorias de segurança
  - Corrigido erro CSRF em formulários com upload de arquivos (multipart/form-data)
  - Middleware CSRF refatorado para validar após processamento do multer
  - Exclusão CSRF específica por rota (não mais por content-type global)
  - Logo Tecle Motos adicionada na tela de login e menu lateral
  
- **08/12/2024:** Melhorias no sistema de vendas e financeiro
  - Vendedores podem escolher cor do produto ao criar vendas (campo cor_escolhida)
  - SUPER ADMIN tem visualização completa de vendas concluídas (rota /vendas/:id/detalhes)
  - Filtro por período (calendário) nas telas de vendas, contas a receber e a pagar
  - Correção na sincronização do banco de dados (removido alter: true para evitar conflitos SQLite)
  - Proteção CSRF simplificada usando sessões
  
- **08/12/2024:** Criação inicial do sistema completo
  - Sistema de autenticação com 4 perfis
  - Dashboard principal com gráficos
  - CRUD completo de produtos, estoque, chassi
  - Sistema de vendas com fluxo de aprovação
  - Módulo financeiro completo
  - Conciliação bancária
  - Proteção CSRF em todos os formulários
  - Validação de uploads (tipo, tamanho, nome)
