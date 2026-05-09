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

**Gestão completa da sua loja — autoridade máxima dentro do ponto de venda.**

O Dono de Loja enxerga apenas os dados da sua própria loja, mas tem controle total sobre todas as operações dela.

#### Dashboard
- Painel com resumo de vendas do mês, estoque disponível, OS em aberto e contas a receber da loja
- Indicadores de performance da equipe (vendas por vendedor)
- Alertas de estoque baixo e parcelas vencidas

#### Vendas
- Criar, editar e **cancelar** vendas da loja
- Visualizar todas as vendas registradas (de qualquer vendedor da loja)
- Exportar planilha Excel das vendas
- Acessar comprovante e garantia de qualquer venda da loja
- Verificar status financeiro das vendas (confirmado/pendente)

#### Estoque
- Ver estoque completo da loja: motos (Estoque Ativo e Movimentação de Chassi) e peças
- Visualizar custo de aquisição dos produtos (campo custo visível)
- Fazer lançamentos de entrada manual de estoque
- Ver histórico de movimentações (entradas, saídas, transferências)

#### Clientes
- Cadastrar, editar e visualizar clientes da loja
- Acessar histórico de compras, OS e interações de cada cliente
- Registrar interações (ligações, WhatsApp, reuniões) no histórico

#### Leads
- Ver todos os leads atribuídos à loja
- Reatribuir leads entre vendedores da loja
- Acompanhar funil e taxa de conversão

#### Ordens de Serviço
- Ver e acompanhar todas as OS abertas na loja
- Editar status de qualquer OS da loja
- Visualizar histórico de revisões e garantias

#### Transferências
- **Solicitar** transferência de moto ou peça de outra loja
- **Aprovar** transferências solicitadas para sua loja
- Acompanhar status das transferências em andamento

#### Usuários
- Criar novos usuários vinculados à sua loja (GERENTE, VENDEDOR, TÉCNICO)
- Editar dados e inativar usuários da sua loja
- Redefinir senha de usuários da equipe

#### Financeiro (restrito)
- Acessar o **Caixa** da loja: ver entradas e saídas do período
- Ver resumo de **Contas a Receber** da loja (parcelas por vencer, vencidas, recebidas)
- **Não acessa** Contas a Pagar, Conciliação Bancária nem Notas Fiscais

**Restrições:**
- Não acessa dados de outras lojas
- Não acessa configurações gerais do sistema
- Não cria grupos, lojas ou usuários de outras franquias

---

### GERENTE DE LOJA

**Supervisão das operações diárias — controla o fluxo sem acesso a dados sensíveis de custo e financeiro.**

O Gerente de Loja opera de forma semelhante ao Dono, mas sem acesso a custos de produtos e sem área financeira.

#### Dashboard
- Painel com vendas do dia/mês, OS em andamento e estoque da loja
- Indicadores de desempenho da equipe de vendas

#### Vendas
- Criar e editar vendas da loja
- Visualizar todas as vendas de todos os vendedores da loja
- Acessar comprovante e detalhes de cada venda
- Acompanhar status das vendas (aguardando pagamento, finalizada, etc.)
- **Não pode cancelar** vendas (exclusivo do Dono ou Admin)

#### Clientes
- Cadastrar, editar e buscar clientes da loja
- Visualizar histórico completo de cada cliente (compras, OS, interações)
- Registrar novas interações no histórico do cliente (ligação, visita, WhatsApp)

#### Leads
- Ver leads atribuídos à loja
- Atualizar status e observações dos leads
- Reatribuir leads entre vendedores (quando autorizado)

#### Estoque
- Visualizar todo o estoque da loja: motos e peças disponíveis
- Ver quantidade e status das unidades (ESTOQUE, RESERVADA)
- Verificar histórico de movimentações
- **Não visualiza custo** de aquisição dos produtos

#### Ordens de Serviço
- Ver e editar todas as OS da loja
- Atualizar status das OS (abrir, colocar em andamento, concluir)
- Vincular peças utilizadas nas OS

#### Transferências
- Solicitar transferência de estoque de outra loja
- Acompanhar transferências em andamento da loja

**Restrições:**
- Não acessa Financeiro (caixa, contas a receber/pagar)
- Não visualiza custo de produtos
- Não cancela vendas
- Não cria nem edita usuários
- Não acessa configurações do sistema

---

### VENDEDOR

**Frente de atendimento e registro de vendas — foco total no cliente e no fechamento.**

O Vendedor tem acesso restrito ao necessário para realizar vendas e atender clientes com qualidade.

#### Vendas
- **Criar nova venda:** selecionar cliente, produto/moto do estoque, forma de pagamento e parcelas
- Formas de pagamento disponíveis: PIX, Dinheiro, Cartão de Crédito, Débito, Financiamento, Boleto, Combinado
- Gerar e imprimir **comprovante** da venda para o cliente
- Visualizar **suas próprias vendas** registradas no sistema
- Acompanhar status de cada venda (pendente, confirmada, cancelada)
- **Não pode editar nem cancelar** vendas após o registro

#### Clientes
- Cadastrar novo cliente (nome, CPF/CNPJ, telefone, e-mail, endereço)
- Editar dados de clientes existentes
- Buscar clientes já cadastrados para vincular à venda
- Visualizar histórico de compras do cliente para oferecer melhor atendimento
- Registrar interações: ligação realizada, mensagem WhatsApp enviada, visita

#### Produtos e Estoque
- Visualizar catálogo completo de produtos disponíveis na loja
- Verificar **disponibilidade em estoque** (quais motos estão disponíveis, por cor/especificação)
- Ver características do produto: modelo, cor, motor, especificações
- **Não visualiza custo** de aquisição — apenas o preço de venda

#### Leads
- Visualizar leads **atribuídos a si** pelo sistema ou gerente
- Atualizar status do lead: contato realizado, proposta enviada, negociação, convertido
- Registrar observações e histórico de tentativas de contato
- Receber notificação de novos leads atribuídos automaticamente por região

#### Garantias
- Visualizar garantia gerada automaticamente nas suas vendas de moto
- Consultar validade e cobertura da garantia para informar o cliente

#### Ordens de Serviço
- Visualizar OS abertas relacionadas aos seus clientes
- Acompanhar status de OS vinculadas a vendas realizadas por si

**Restrições:**
- Não acessa Financeiro (contas, caixa, conciliação)
- Não cancela nem exclui vendas
- Não visualiza custos de produtos
- Não acessa usuários, configurações nem relatórios
- Vê apenas suas próprias vendas (não vê as de outros vendedores)
- Não acessa transferências entre lojas

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
