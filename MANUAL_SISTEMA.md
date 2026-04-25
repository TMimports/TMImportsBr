# Manual do Sistema — TM Imports / Tecle Motos ERP
**Sistema Integrado de Gestão Multi-Empresa**

---

## Sumário
1. [Acesso ao Sistema](#acesso-ao-sistema)
2. [Perfis de Usuário e Permissões](#perfis-de-usuário-e-permissões)
3. [Módulos por Perfil](#módulos-por-perfil)
   - [ADMIN GERAL](#admin-geral)
   - [ADMIN FINANCEIRO](#admin-financeiro)
   - [ADMIN COMERCIAL](#admin-comercial)
   - [ADMIN REDE](#admin-rede)
   - [DONO DE LOJA](#dono-de-loja)
   - [GERENTE DE LOJA](#gerente-de-loja)
   - [VENDEDOR](#vendedor)
   - [TÉCNICO](#técnico)
4. [Log de Atividades por Área](#log-de-atividades-por-área)
5. [Módulos do Sistema](#módulos-do-sistema)
6. [Fluxo de Operação](#fluxo-de-operação)

---

## Acesso ao Sistema

**URL:** `sistematmimports.com`
**Login padrão (admin):** `admin@teclemotos.com` / `123456`

> Após o primeiro acesso, altere a senha em **Configurações > Minha Conta**.

---

## Perfis de Usuário e Permissões

| Perfil | Nível | Descrição |
|--------|-------|-----------|
| ADMIN GERAL | Total | Acesso completo a todo o sistema |
| ADMIN FINANCEIRO | Alto | Financeiro + Vendas + CRM + Estoque |
| ADMIN REDE | Alto | Gestão de todos os grupos/franquias |
| DONO DE LOJA | Médio-Alto | Gestão completa de sua loja |
| GERENTE DE LOJA | Médio | Operações da loja sem acesso a custos |
| VENDEDOR | Operacional | Cadastro de vendas e clientes |
| TÉCNICO | Operacional | Ordens de Serviço |
| ADMIN COMERCIAL | Leitura | Visualização comercial (sem edição) |

---

## Módulos por Perfil

---

### ADMIN GERAL

**Tudo do sistema, sem restrições.**

| Módulo | Acesso |
|--------|--------|
| Dashboard | Visão consolidada de todas as lojas |
| Vendas | Criar, editar, cancelar, exportar planilha |
| Estoque | Estoque geral + movimentação + histórico |
| Financeiro | Contas a pagar/receber, caixa, conciliação |
| Clientes | CRUD completo + histórico de interações |
| Fornecedores | CRUD completo |
| Leads | Visualização e atribuição de todos os leads |
| Produtos / Serviços | Cadastro, edição, recodificação |
| Pedidos de Compra | Criação, aprovação, confirmação |
| Notas Fiscais | Entradas e saídas |
| Ordens de Serviço | Todas as OS de todas as lojas |
| Transferências | Criação e aprovação |
| Garantias | Visualização e gestão |
| Relatórios | Todos os relatórios + disparo por e-mail |
| Usuários | Criar, editar, inativar qualquer usuário |
| Log de Atividades | Histórico completo de ações no sistema |
| Configurações | Lojas, grupos, parâmetros gerais |

**Exclusivo ADMIN GERAL:**
- Resetar o sistema completo
- Visualizar Log de Atividades em `/log-atividades`
- Recodificar produtos (TMMOT/TMPEC)
- Ver custos e margens de todos os produtos

---

### ADMIN FINANCEIRO

**Foco em finanças, com acesso amplo às operações.**

| Módulo | Acesso |
|--------|--------|
| Dashboard | Visão financeira |
| Vendas | Criar, editar, confirmar financeiro, exportar |
| Estoque | Visualização geral + movimentação |
| Clientes | CRUD completo |
| Fornecedores | CRUD completo |
| Pedidos de Compra | Visualização e aprovação |
| Notas Fiscais | Entradas e saídas |
| Financeiro — Contas a Receber | Visualização, baixa, importação |
| Financeiro — Contas a Pagar | Visualização, baixa, geração |
| Financeiro — Caixa | Lançamentos manuais, fechamento |
| Financeiro — Conciliação Bancária | Importação OFX, matching |
| Relatórios | Relatórios financeiros e de vendas |

**Restrições:**
- Não acessa Log de Atividades
- Não cria/edita usuários
- Não acessa configurações do sistema

---

### ADMIN COMERCIAL

**Perfil de leitura — visualiza dados comerciais sem alterar.**

| Módulo | Acesso |
|--------|--------|
| Dashboard | Visão de vendas |
| Vendas | Somente visualização (sem edição) |
| Clientes | Somente visualização |
| Produtos | Somente visualização |
| Estoque | Somente visualização |

**Restrições:**
- Não pode criar, editar ou excluir nenhum registro
- Não acessa financeiro, notas fiscais, nem configurações

---

### ADMIN REDE

**Gestão de um grupo de franquias.**

| Módulo | Acesso |
|--------|--------|
| Dashboard | Visão do grupo |
| Vendas | Todas as vendas do grupo |
| Clientes | Todos do grupo |
| Estoque | Estoque do grupo |
| Usuários | Criar e editar usuários do grupo |
| Transferências | Entre lojas do grupo |
| Relatórios | Do grupo |

---

### DONO DE LOJA

**Gestão completa de sua loja.**

| Módulo | Acesso |
|--------|--------|
| Dashboard | Da loja |
| Vendas | Criar, editar, cancelar vendas da loja |
| Estoque | Da loja |
| Clientes | Da loja |
| Produtos | Visualização |
| Ordens de Serviço | Da loja |
| Transferências | Solicitar e aprovar |
| Usuários | Criar usuários para sua loja |
| Financeiro | Acesso restrito ao caixa da loja |

---

### GERENTE DE LOJA

**Operações do dia a dia da loja.**

| Módulo | Acesso |
|--------|--------|
| Vendas | Criar e editar vendas |
| Clientes | CRUD completo |
| Estoque | Visualização (sem custos) |
| Ordens de Serviço | Da loja |
| Transferências | Solicitar |

**Restrições:**
- Não visualiza custos de produtos
- Não acessa financeiro

---

### VENDEDOR

**Cadastro de vendas e atendimento a clientes.**

| Módulo | Acesso |
|--------|--------|
| Vendas | Criar novas vendas e orçamentos |
| Clientes | Cadastrar e editar clientes |
| Produtos | Visualização do catálogo |
| Estoque | Verificar disponibilidade |
| Leads | Ver e atualizar leads atribuídos a si |
| Ordens de Serviço | Visualização |

**Restrições:**
- Não acessa financeiro
- Não cancela/exclui vendas
- Não visualiza custos

---

### TÉCNICO

**Ordens de serviço e revisões.**

| Módulo | Acesso |
|--------|--------|
| Ordens de Serviço | Criar, atualizar status, finalizar |
| Revisões | Registrar revisões de motos |
| Garantias | Visualizar garantias |
| Clientes | Visualização |
| Produtos | Visualização do catálogo de peças |

---

## Log de Atividades por Área

O sistema registra automaticamente as principais ações. Acesse em **Log de Atividades** (somente ADMIN GERAL).

### Área Comercial / Vendas

| Ação | Descrição |
|------|-----------|
| `CRIAR_VENDA` | Nova venda ou orçamento cadastrado |
| `CANCELAR_VENDA` | Venda cancelada (inclui motivo) |
| `EXPORTAR_EXCEL` | Planilha de vendas exportada |
| `CRIAR_OS` | Nova Ordem de Serviço aberta |

### Área Financeira

| Ação | Descrição |
|------|-----------|
| Confirmação Financeiro | Venda marcada como confirmada no financeiro |
| Baixa de Conta | Conta a pagar/receber baixada |
| Importação OFX | Arquivo bancário importado |

### Área Administrativa

| Ação | Descrição |
|------|-----------|
| `LOGIN` | Acesso ao sistema (usuário + IP registrado) |
| `ALTERAR_SENHA` | Alteração de senha de usuário |
| `ALTERAR_CLIENTE` | Edição de cadastro de cliente |
| `CRIAR_CLIENTE` | Novo cliente cadastrado |

### Informações registradas em cada log

Cada entrada contém:
- **Data e hora** da ação
- **Usuário** responsável (nome + e-mail)
- **Perfil** do usuário no momento da ação
- **Entidade** afetada (ex: Venda #00042)
- **Detalhes** da operação
- **IP** de acesso

---

## Módulos do Sistema

### Vendas
- Cadastro de vendas e orçamentos
- Formas de pagamento: PIX, Dinheiro, Cartão, Crédito, Débito, Financiamento, Boleto, **Combinado**
- Pagamento Combinado: até 2 formas simultâneas com cálculo automático de encargos
- Geração automática de **comprovante** (impressão/PDF) com logo da loja
- Geração automática de **contas a receber** parceladas
- Geração de **garantia** automática nas vendas com moto
- **Exportação Excel** com: vendedor, produto, chassi, cód. motor, forma(s) de pagamento, parcelas, valores

### Estoque
- **Estoque Ativo** — motos com status ESTOQUE ou RESERVADA
- **Movimentação de Chassi** — motos VENDIDAS ou TRANSFERIDAS (histórico)
- Peças com controle de saldo mínimo e alertas de estoque baixo
- Importação via planilha
- Auditoria de movimentações

### Financeiro
- **Contas a Receber:** geradas automaticamente nas vendas parceladas
- **Contas a Pagar:** geradas automaticamente nos pedidos de compra
- **Caixa:** lançamentos manuais, visão de entradas/saídas por período
- **Conciliação Bancária:** importação de arquivo OFX, matching automático/manual

### Clientes e CRM
- Cadastro completo com CPF/CNPJ, endereço, contatos
- Histórico de interações (ligações, WhatsApp, reuniões)
- Histórico de compras e OS
- **Leads:** gestão de prospects com funil e atribuição por região

### Produtos
- Tipos: Moto (`TMMOT`), Peça (`TMPEC`), Serviço (`TMSRV`)
- Códigos sequenciais automáticos
- Custo atualizado via Pedido de Compra (custo médio ponderado)
- **Recodificação:** botão para corrigir códigos baseado no tipo atual

### Ordens de Serviço
- Numeração automática `TMOS{ANO}{####}`
- Status: ABERTA → EM_ANDAMENTO → AGUARDANDO_PEÇA → CONCLUIDA
- Vinculação com cliente, moto (chassi), garantia e revisão
- Geração automática de contas a receber na conclusão

### Transferências
- Entre lojas do grupo
- Controle de status: SOLICITADA → APROVADA → CONCLUIDA
- Vinculação de chassi específico para motos

### Relatórios
- Envio automático por e-mail (segunda-feira 07h, último dia do mês)
- Relatório financeiro com anexo XLSX
- Relatório de vendas por vendedor
- Configurável por usuário

---

## Fluxo de Operação

### Fluxo de Venda de Moto
```
1. Cadastrar produto (TMMOT) → Importar estoque (chassi + motor + cor)
2. Registrar Venda → Selecionar cliente + moto do estoque
3. Informar forma de pagamento → Sistema gera parcelas (contas a receber)
4. Imprimir comprovante → Garantia gerada automaticamente
5. ADMIN FINANCEIRO confirma financeiro → Status atualizado
```

### Fluxo de Importação de Motos
```
1. Pedido de Compra → Fornecedor + produto + quantidade
2. Recebimento → Confirmar chegada das unidades
3. Estoque atualizado automaticamente → Custo médio recalculado
4. Unidades aparecem em "Estoque Ativo" com chassi individual
```

### Fluxo de Ordem de Serviço
```
1. Técnico abre OS → Vincula moto (chassi) + cliente
2. Adiciona peças e serviços realizados
3. Atualiza status conforme andamento
4. Conclui → Sistema gera conta a receber automaticamente
5. Revisão registrada → Histórico da moto atualizado
```

---

## Suporte e Acesso Técnico

Para questões técnicas e configurações avançadas:
- Acesso via sistema master (nível SUPER_ADMIN)
- Contato direto com o administrador do sistema

---

*Manual gerado em: Abril/2026 — Sistema TM Imports v2.0*
