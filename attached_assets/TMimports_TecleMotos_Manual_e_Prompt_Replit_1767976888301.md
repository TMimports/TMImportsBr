# Pacote Único — TMimports + Tecle Motos (V1)
**Conteúdo:** Prompt completo para Replit AI + Manuais Técnicos (TMimports e Tecle Motos) + Deploy/Checklist  
**Uso recomendado:**  
1) Copie o PROMPT e cole no Replit AI (modo *Modify existing codebase*).  
2) Crie este arquivo no projeto em `/docs/` para consulta interna e também para gerar PDF futuramente.

---

## 1) PROMPT COMPLETO (REPLIT AI) — COPIAR E COLAR

> **Como usar no Replit (passo a passo):**
> 1. Abra seu projeto no Replit (já com o ZIP importado).
> 2. Vá em **Replit AI**.
> 3. Selecione **"Modify existing codebase"** (ou equivalente).
> 4. Cole TODO o prompt abaixo.
> 5. Peça: **"Aplique todas as mudanças e gere o código final. Não quebre funcionalidades existentes."**
> 6. Rode o projeto e valide pelo Checklist no final deste arquivo.

```txt
Você é um engenheiro fullstack sênior. Você está trabalhando em um sistema no Replit com banco SQLite local. O projeto já existe (ZIP importado). A missão é atualizar o sistema com uma arquitetura de permissões RBAC multi-role, dashboards, rankings, triagem de baixa saída, pedidos de franquias, regras de vendas/serviços e manual dentro do sistema.

REQUISITOS GERAIS:
- O sistema deve ser 100% responsivo em: celular (360px+), tablet, notebook, desktop, TV/4k.
- Sidebar deve virar menu hamburguer no mobile.
- Tabelas devem ser responsivas (cards no mobile ou scroll horizontal).
- Dashboards devem ter cards e gráficos fluidos.
- Implementar PWA (modo app) único chamado “Tecle Motos”, instalável (manifest + service worker). TMimports não precisa ser instalável, apenas funciona no navegador.
- Preservar fórmulas e cálculos já existentes no sistema atual sempre que existirem. Apenas adicionar as novas regras sem quebrar o existente.
- Manter a paleta de cores atual do projeto, apenas mudar logos dinamicamente: TMimports (Admin/Usuarios TMimports) e Tecle Motos (franquias/lojas).
- Banco: SQLite local. Criar automaticamente o banco se não existir e rodar migrations/sync. Criar admin inicial.

LOGOS:
- TMimports: usar /public/assets/brand/tmimports.jpg
- Tecle Motos: usar /public/assets/brand/teclemotos.jpg
- As logos devem aparecer na tela de login, sidebar e header de acordo com o ambiente/perfil.
- ADMIN e usuários TMimports vêem TMimports; Franqueado/Loja vê Tecle Motos.
- Paleta igual ao ZIP atual.

SEED / ADMIN INICIAL:
- Criar usuário inicial Admin Global:
  email: admin@tmimports.com
  senha temporária aleatória alfanumérica
  exigir troca de senha no primeiro login
- Mostrar no console do primeiro start a senha gerada (somente uma vez).
- Não recriar admin em reinícios.

ARQUITETURA DE ACESSO (RBAC MULTI-ROLE):
- Usuário pode ter várias funções ao mesmo tempo (checkbox na tela de cadastro).
- Criar tabelas roles e user_roles.
- Permissões finais = união das funções atribuídas.
- Admin Global tem acesso total.

FUNÇÕES TMIMPORTS:
- ADMIN_GLOBAL: acesso total a tudo (TMimports + Franquias).
- GESTOR_DASHBOARD: acesso somente a dashboards estratégicos (leitura).
- GERENTE_OP: acesso operacional total, sem financeiro/fiscal. E também pode cadastrar/editar produtos/motos/serviços e valores do catálogo.
- FINANCEIRO: acesso total financeiro e fiscal; demais módulos apenas leitura.
- ADM_1_LOGISTICA: movimentações/expedições/envio para franquias; não vê dashboard.
- ADM_2_CADASTRO: cria usuários e franquias; também cadastra/edita produtos/motos/serviços e valores; não vê dashboard.
- ADM_3_OS_GARANTIA: cuida de OS e garantia; sem dashboard; sem financeiro.
- VENDEDOR_TMI: consulta estoque central, cria pedido/venda somente de produtos/motos. Não vende serviços. Dashboard próprio.

FUNÇÕES TECLE MOTOS (LOJA):
- FRANQUEADO_GESTOR: acesso total ao sistema da franquia, dashboards, estoque local, pedidos para TMimports de peças/motos, pedidos de garantia.
- GERENTE_LOJA: acesso total operacional e pedidos para TMimports e garantia, mas NÃO vê o dashboard geral da loja (apenas dashboards individuais do que operar, se existir).
- VENDEDOR_LOJA: consulta estoque local, cria/consulta OS, cria/consulta vendas, cria e edita clientes, dashboard próprio do que criou. Não faz pedidos para TMimports. Não acessa triagem low movers.

ESTOQUE CENTRAL vs ESTOQUE LOJA:
- Franqueado e gerente podem consultar catálogo/estoque central para fazer pedidos.
- Eles não alteram catálogo central.
- Estoque da loja é separado do estoque central.

PEDIDOS FRANQUIA (V1):
- Gestor/gerente loja cria pedido de itens do catálogo central.
- Status: PENDENTE_APROVACAO, APROVADO, REJEITADO, FATURADO, ENVIADO, ENTREGUE, CANCELADO.
- Gestor pode cancelar somente enquanto pendente aprovação.
- Admin/Gerente OP/ADM1 aprovam ou rejeitam.
- Após aprovado, Admin/Gerente OP emite fatura manual com condição:
  AVISTA, BOLETO_30, BOLETO_60.
- Admin pode ajustar preços na hora de faturar (snapshot).
- Admin anexa PDF de boleto/fatura.
- Admin marca como ENVIADO.
- Estoque da loja só entra quando o Gestor confirma recebimento.
- Ao confirmar recebimento, estoque local aumenta automaticamente.
- Logs de auditoria: quem aprovou, faturou, enviou, confirmou recebimento.
- Permitir divergência opcional no recebimento (recebi com divergência).

CLIENTES (TMimports e Loja):
- Cadastro PF e PJ em ambos.
- Endereço completo obrigatório e email obrigatório.
- PF: data nascimento e sexo obrigatório (Masc/Fem/Não prefiro informar).
- PJ: razão social, nome fantasia e data abertura obrigatórios.
- ViaCEP: preencher endereço automaticamente via CEP.
- Anti-duplicidade por CPF/CNPJ: se já existir, mostrar como cadastrado e selecionar.
- Vendedor pode criar e editar cliente (apenas na loja). Gestor edita. Gestor NÃO pode excluir. Admin pode desativar ou excluir definitivo com trava e logs.
- Banco de clientes do vendedor deve ser único por loja: todos vendedores da loja acessam os mesmos clientes (não separados).

VENDAS LOJA (Tecle Motos):
- Venda pode conter produtos + serviços.
- Desconto por item, não no total:
  moto max 3.5% por item
  peça max 10% por item
  serviço max 10% por item
- Desconto só habilita se pagamento Dinheiro ou Pix à vista. Em cartão, desconto desabilitado.
- Parcelamento máximo: moto até 21x; peça até 10x.
- Tabela de juros do cartão crédito (1x a 21x) é aplicada apenas ao subtotal de produtos (peças/motos). Serviços NÃO recebem juros.
- Para venda com produto + serviço no crédito parcelado: calcula juros apenas no subtotal de produtos, soma serviços sem juros e parcela no limite máximo do produto presente (moto => 21x; senão peça => 10x).
- Débito: aplicar taxa de 1% (ex: 10000 => 10100) apenas em produtos e no total final.
- Serviços têm regras de parcelamento SEM JUROS quando venda contém só serviços:
  - Mão de obra por tempo: 15min=70 (avista), 30min=140 (avista), 45min=270 (até 2x), 1h=330 (até 3x)
  - Revitalização=1200 (até 5x), Serviço de motor=1000 (até 5x), Serviço de módulo=700 (até 4x)
  - Troca pneu dianteiro=150 (até 2x), troca pneu traseiro=290 (até 2x), revisão=350 (até 2x)
  - Regras especiais: troca+adesão dianteiro até 5x; troca+adesão traseiro até 6x. Tudo sem juros.
- Ordem de Serviço (OS) para cliente: se serviço por tempo, mostrar apenas “Mão de obra” (não mostrar tempo). Internamente (gestor/admin) mostrar “Mão de obra (30 min)” etc.
- Vendedor TMimports não vende serviços, apenas produtos/motos.

SERVIÇOS (LOJA):
- Deve existir um catálogo de serviços para a loja.
- Serviços por tempo não mostram tempo na OS do cliente.
- Serviços especiais aparecem com nome.

CONFIGURAÇÕES (GLOBAL PARA TODAS AS LOJAS):
- Criar painel de Configurações (somente Admin Global) para regras de lojas:
  - limites de desconto por item
  - parcelas máximas (moto/peça)
  - tabela de taxas do cartão crédito (1x-21x) em porcentagem
  - taxa débito
  - tabela de serviços (preço e parcelas)
  - regras especiais pneu+adesão
  - margem líquida do franqueado: peça 60%, moto 26.32%
- Botão “Restaurar padrão” (volta para configuração default Tecle Motos).
- Configurações aplicam imediatamente em todas lojas.
- TMimports terá configurações no V2; por enquanto as regras de cartão/serviços/desconto são apenas para lojas.

DASHBOARDS:
- Toda área do sistema deve ter um dashboard com quantidade e valores + gráficos:
  - Vendas: total (qtd/valor), por forma de pagamento, produto x serviço
  - OS: abertas (qtd/valor), fechadas (qtd/valor)
  - Pedidos: status e valores
  - Estoque: itens com estoque baixo e sem estoque
- Dashboards devem ter filtro de período: semanal, mensal, total.
- Cada perfil vê apenas dashboards permitidos:
  - Admin Global: todos
  - Gestor Dashboard (TMimports): dashboards estratégicos
  - Gerente OP: dashboards estratégicos e operacionais (exceto financeiro)
  - Financeiro: dashboards financeiros e visualização operacionais
  - ADM1/ADM2/ADM3: sem dashboards
  - Vendedor: dashboard próprio do que criou
  - Loja: Franqueado vê dashboards completos; Gerente não vê dashboard geral; Vendedor vê dashboard próprio.

DASHBOARD POR FRANQUIA NO TMIMPORTS:
- Criar painel "Franquias" com dashboard individual por loja mostrando desempenho:
  - vendas (qtd/valor), OS, estoque baixo, pedidos status
- Acesso: Admin Global + Gerente OP + Gestor Dashboard.
- Também criar Ranking de franquias (qtd+valor).

RANKINGS + TRIAGEM:
- Ranking global e por franquia:
  - franquias (qtd+valor)
  - produtos/peças/motos/serviços (qtd+valor)
- Triagem de baixa saída (low movers) baseada em vendas + estoque disponível:
  - menos vendidos
  - sem venda no período
  - parados há X dias (padrão 30)
- Triagem disponível no TMimports (global) e na loja (apenas gestor e gerente).
- Vendedor não vê triagem.

NOTIFICAÇÃO ESTOQUE MÍNIMO:
- Criar notificação para estoque baixo na loja:
  - mínimo padrão global = 2 unidades
  - itens <=2 entram em alerta “Estoque baixo”
  - itens =0 entram em “Sem estoque”
- Notificação com ícone e contador no topo.
- Dashboard da loja deve ter card com esses números.
- Acesso: Gestor + Gerente + Admin.

RESPONSIVIDADE:
- Garantir responsividade em todas as telas.
- Usar design mobile-first.
- Garantir que dashboards e rankings sejam legíveis no celular e TV.
- Sidebars e tabelas responsivas.

MANUAIS:
- Criar página "Ajuda" no sistema com manual interno:
  - Manual Tecle Motos
  - Manual TMimports
- Mostrar conteúdo técnico e separado por ambiente.
- Deve haver busca por palavra-chave.

ENTREGÁVEIS:
- Código funcionando com SQLite
- Permissões aplicadas (rotas e UI)
- Logs/auditoria para alterações críticas
- PWA Tecle Motos funcionando
- UI responsiva
- Manuais internos e arquivos markdown em /docs

Agora implemente tudo isso no projeto existente, mantendo o estilo atual e garantindo que nada já existente que funcione seja quebrado. Priorize segurança, organização e performance.
```

---

## 2) ESTRUTURA RECOMENDADA NO PROJETO (REPLIT)

Crie as pastas abaixo (se não existirem):

- `/public/assets/brand/`
  - `tmimports.jpg`  (logo TMimports)
  - `teclemotos.jpg` (logo Tecle Motos)
- `/public/uploads/`
- `/docs/`

---

## 3) MANUAL TÉCNICO — TMIMPORTS (GLOBAL / FRANQUEADORA) — V1

### 3.1 Objetivo
TMimports: governança, catálogo central, gestão operacional das franquias, OS/garantia, financeiro/fiscal e dashboards estratégicos.

### 3.2 Perfis e Permissões (RBAC Multi-Role)
Usuários podem ter múltiplas funções simultâneas via checkbox. Permissão final = união das roles.  
Admin Global = acesso total.

**Roles TMimports**
- ADMIN_GLOBAL: total.
- GESTOR_DASHBOARD: dashboards estratégicos (leitura).
- GERENTE_OP: operação + catálogo; sem financeiro/fiscal.
- FINANCEIRO: financeiro/fiscal total; demais módulos leitura.
- ADM1_LOGISTICA: expedição/movimentações; sem dashboard.
- ADM2_CADASTRO: usuários/franquias + catálogo; sem dashboard.
- ADM3_OS_GARANTIA: OS/garantia; sem financeiro; sem dashboard.
- VENDEDOR_TMI: consulta estoque central; vende motos/peças; sem serviços; dashboard próprio.

### 3.3 Cadastro de Franquias e Lojas
- Criar franqueado (Owner) e lojas (Store).
- Uma franquia pode ter várias lojas.
- Loja reflete no Tecle Motos.

### 3.4 Cadastro de Usuários
- Gera senha temporária e modal WhatsApp.
- Troca obrigatória no primeiro login.
- Multi-role via checkboxes.

### 3.5 Catálogo Central
- CRUD e importação por planilha: ADMIN_GLOBAL, GERENTE_OP, ADM2.
- Alterações de preço entram imediatamente em todas as lojas.
- Snapshot preserva histórico.
- Logs: quem, quando, antes/depois.

### 3.6 Pedidos das Franquias (V1)
- Status: PENDENTE_APROVACAO, APROVADO, REJEITADO, FATURADO, ENVIADO, ENTREGUE, CANCELADO.
- Loja pode cancelar enquanto pendente.
- TMimports aprova e emite fatura manual (AVISTA/BOLETO_30/BOLETO_60).
- Pode ajustar preços antes de faturar (snapshot).
- Anexa PDF.
- Marca ENVIADO.
- Estoque local entra apenas após confirmação do gestor.

### 3.7 OS e Garantia
- ADM3 e Admin operam.
- Controle de status, logs e histórico.

### 3.8 Financeiro/Fiscal
- FINANCEIRO e Admin.
- Contas recorrentes, relatórios e conciliação.

### 3.9 Dashboards + Rankings + Triagem
Acesso: ADMIN_GLOBAL, GERENTE_OP, GESTOR_DASHBOARD.
- Dashboard global e por franquia (KPIs).
- Ranking franquias (qtd+valor).
- Ranking produtos/peças/motos/serviços (qtd+valor).
- Triagem low movers (vendas + estoque): menos vendidos, sem venda, parados (30 dias).

### 3.10 Alertas de Estoque (Franquias)
- Mínimo global = 2.
- Lista de itens críticos por loja e ranking de criticidade.

---

## 4) MANUAL TÉCNICO — TECLE MOTOS (LOJA / FRANQUIA) — V1

### 4.1 Objetivo
Tecle Motos: vendas, OS, estoque local, clientes, pedidos TMimports, documentos, dashboards.

### 4.2 Perfis
- FRANQUEADO_GESTOR: total na loja + dashboards + pedidos TMimports + garantia + usuários.
- GERENTE_LOJA: total operacional + pedidos TMimports/garantia; sem dashboard geral.
- VENDEDOR_LOJA: consulta estoque local, cria vendas/OS, cria/edita clientes, dashboard próprio; não faz pedidos TMimports; não vê triagem.

### 4.3 Menu (confirmado)
1) Dashboard
2) Vendas
3) OS
4) Clientes
5) Estoque
6) Pedidos (TMimports)
7) Documentos da Loja
8) Configurações (gestor)
9) Usuários (gestor)

### 4.4 Clientes PF/PJ
- PF: CPF + nascimento + sexo + email + endereço completo obrigatórios.
- PJ: CNPJ + razão social + nome fantasia + data abertura + email + endereço completo obrigatórios.
- ViaCEP e anti-duplicidade.

### 4.5 Pedidos para TMimports
- Criar pedido -> pendente.
- Cancelar enquanto pendente.
- Confirmar recebimento -> estoque entra automaticamente.

### 4.6 Estoque Local
- Entrada: recebimento confirmado.
- Saída: venda de produto.
- Alerta mínimo: 2 unidades.
- Notificação + cards.

### 4.7 Vendas — Regras
- Venda com produtos + serviços.
- Desconto por item:
  - moto 3.5%
  - peça 10%
  - serviço 10%
- Desconto só em dinheiro/pix à vista.
- Crédito: juros só em produtos (tabela 1x-21x); serviço sem juros; parcelas max: moto 21x, peça 10x.
- Débito: taxa 1%.
- Serviços: parcelamento sem juros conforme regras.

### 4.8 Serviços (tabela)
- Mão de obra por tempo:
  - 15m=70 (avista)
  - 30m=140 (avista)
  - 45m=270 (2x)
  - 1h=330 (3x)
- Fixos:
  - revitalização=1200 (5x)
  - motor=1000 (5x)
  - módulo=700 (4x)
  - troca pneu dianteiro=150 (2x)
  - troca pneu traseiro=290 (2x)
  - revisão=350 (2x)
- especiais:
  - troca+adesão dianteiro até 5x
  - troca+adesão traseiro até 6x

### 4.9 OS
- Cliente vê “Mão de obra” sem tempo.
- Interno mostra tempo.
- Dashboards OS: abertas x fechadas (qtd+valor).

### 4.10 Dashboards + Triagem Loja
- Dashboards por módulo com filtro semanal/mensal/total.
- Triagem low movers (gestor e gerente): menos vendidos, sem venda, parados (30d), baseado em vendas + estoque.

### 4.11 Documentos da Loja
- Upload pdf/jpg/png.
- Categorias e logs.
- Admin pode visualizar.

---

## 5) CHECKLIST DE VALIDAÇÃO (TESTES)

### A) Responsividade
- 360px, 768px, 1366px, 1920px
- sidebar/hamburger e tabelas responsivas

### B) RBAC Multi-role
- criar usuário ADM1+ADM2
- validar menus e bloqueios

### C) Pedidos Franquia
- criar pedido -> aprovar -> fatura -> enviar -> confirmar recebimento -> estoque entra

### D) Venda Loja
- produto+serviço no crédito: juros só produto
- só serviço: parcelas sem juros por regra
- desconto habilita apenas pix/dinheiro
- parcela max moto 21x / peça 10x

### E) Rankings/Triagem
- ranking franquias
- ranking itens (qtd+valor)
- low movers (vendas+estoque) funcionando

### F) PWA
- manifest e sw funcionando
- instalar no Android/iPhone
- abrir em standalone
