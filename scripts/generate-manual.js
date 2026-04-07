const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS = path.join(__dirname, '..', 'screenshots');
const OUTPUT = path.join(__dirname, '..', 'Manual_TM_Imports_ERP.pdf');

const ORANGE  = '#f97316';
const ZINC900 = '#18181b';
const ZINC800 = '#27272a';
const ZINC400 = '#a1a1aa';
const ZINC300 = '#d4d4d8';
const WHITE   = '#ffffff';
const GREEN   = '#22c55e';
const BLUE    = '#3b82f6';

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 55, bottom: 55, left: 55, right: 55 },
  bufferPages: true,
  info: {
    Title: 'Manual do Sistema ERP – TM Imports / Tecle Motos',
    Author: 'TM Imports',
    Subject: 'Sistema de Gestão Multi-Empresa para Motos Elétricas',
  },
});

doc.pipe(fs.createWriteStream(OUTPUT));

// Garante fundo escuro em TODAS as páginas automaticamente
doc.on('pageAdded', () => {
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#09090b');
  doc.y = 55;
});
// Aplica na primeira página também
doc.rect(0, 0, doc.page.width, doc.page.height).fill('#09090b');

const PW = doc.page.width - 110;   // printable width
const PH = doc.page.height - 110;  // printable height
const LM = 55;                      // left margin

// ─── UTILITÁRIOS ─────────────────────────────────────────────────────────────

function img(name) { return path.join(SCREENSHOTS, name); }

function ensureSpace(neededPx) {
  if (doc.y + neededPx > doc.page.height - 60) {
    doc.addPage();
    doc.y = 55;
  }
}

function h1(text) {
  ensureSpace(30);
  doc.fontSize(15).font('Helvetica-Bold').fillColor(WHITE).text(text, LM, doc.y, { width: PW });
  doc.moveDown(0.15);
  doc.rect(LM, doc.y, PW, 2).fill(ORANGE);
  doc.moveDown(0.6);
}

function h2(text) {
  ensureSpace(24);
  doc.rect(LM, doc.y, 3, 14).fill(ORANGE);
  doc.fontSize(11).font('Helvetica-Bold').fillColor(WHITE)
     .text(text, LM + 8, doc.y + 1, { width: PW - 8 });
  doc.moveDown(0.5);
}

function body(text) {
  doc.fontSize(9.5).font('Helvetica').fillColor(ZINC300)
     .text(text, LM, doc.y, { width: PW, lineGap: 3, align: 'justify' });
  doc.moveDown(0.35);
}

function bullet(items) {
  items.forEach(item => {
    ensureSpace(16);
    doc.fontSize(9.5).font('Helvetica').fillColor(ZINC300)
       .text('\u2022  ' + item, LM + 8, doc.y, { width: PW - 8, lineGap: 2 });
  });
  doc.moveDown(0.4);
}

function note(text, color) {
  const c = color || ORANGE;
  ensureSpace(32);
  const sy = doc.y;
  doc.rect(LM, sy, PW, 28).fill(ZINC900).stroke(c);
  doc.rect(LM, sy, 4, 28).fill(c);
  doc.fontSize(9).font('Helvetica').fillColor(ZINC300)
     .text(text, LM + 12, sy + 9, { width: PW - 20 });
  doc.y = sy + 35;
}

function step(n, title, desc) {
  ensureSpace(54);
  const sy = doc.y;
  doc.rect(LM, sy, PW, 46).fill(ZINC900).stroke(ZINC800);
  doc.circle(LM + 20, sy + 23, 13).fill(ORANGE);
  doc.fontSize(11).font('Helvetica-Bold').fillColor(WHITE)
     .text(String(n), LM + 20 - (n > 9 ? 6 : 4), sy + 16);
  doc.fontSize(10).font('Helvetica-Bold').fillColor(WHITE)
     .text(title, LM + 42, sy + 10, { width: PW - 50 });
  doc.fontSize(9).font('Helvetica').fillColor(ZINC400)
     .text(desc, LM + 42, sy + 24, { width: PW - 50 });
  doc.y = sy + 54;
}

function addImg(file, caption) {
  if (!fs.existsSync(img(file))) return;
  ensureSpace(210);
  const sy = doc.y;
  doc.rect(LM, sy, PW, 192).fill(ZINC900).stroke(ZINC800);
  try {
    doc.image(img(file), LM + 3, sy + 3, { width: PW - 6, height: 186, fit: [PW - 6, 186], align: 'center', valign: 'center' });
  } catch (_) {}
  doc.y = sy + 198;
  doc.fontSize(8).font('Helvetica').fillColor(ZINC400)
     .text(caption, LM, doc.y, { width: PW, align: 'center' });
  doc.moveDown(0.7);
}

function dividerPage(number, title, subtitle) {
  doc.addPage();
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#09090b');
  doc.rect(0, 0, 8, doc.page.height).fill(ORANGE);
  // centered content
  const cy = doc.page.height / 2 - 60;
  doc.fontSize(60).font('Helvetica-Bold').fillColor(ORANGE).opacity(0.15)
     .text(String(number), 0, cy - 30, { align: 'center', width: doc.page.width });
  doc.opacity(1);
  doc.fontSize(24).font('Helvetica-Bold').fillColor(WHITE)
     .text(title, 50, cy + 10, { align: 'center', width: doc.page.width - 100 });
  doc.fontSize(12).font('Helvetica').fillColor(ZINC400)
     .text(subtitle, 50, cy + 44, { align: 'center', width: doc.page.width - 100 });
  doc.addPage();
  doc.y = 55;
}

function roleRow(perfil, sigla, acesso, alt) {
  ensureSpace(22);
  const sy = doc.y;
  doc.rect(LM, sy, PW, 20).fill(alt ? '#1c1c1e' : ZINC900);
  doc.fontSize(9).font('Helvetica-Bold').fillColor(WHITE).text(perfil, LM + 4, sy + 5, { width: 150 });
  doc.fontSize(9).font('Helvetica').fillColor(ORANGE).text(sigla, LM + 158, sy + 5, { width: 90 });
  doc.fontSize(9).font('Helvetica').fillColor(ZINC300).text(acesso, LM + 252, sy + 5, { width: PW - 250 });
  doc.y = sy + 22;
}

// ─── CAPA ─────────────────────────────────────────────────────────────────────

doc.rect(0, 0, doc.page.width, doc.page.height).fill('#09090b');
doc.rect(0, 0, doc.page.width, 10).fill(ORANGE);
doc.rect(0, doc.page.height - 10, doc.page.width, 10).fill(ORANGE);

doc.moveDown(9);
doc.fontSize(11).font('Helvetica').fillColor(ORANGE)
   .text('MANUAL DO SISTEMA', { align: 'center' });
doc.moveDown(0.8);
doc.fontSize(36).font('Helvetica-Bold').fillColor(WHITE)
   .text('TM Imports', { align: 'center' });
doc.fontSize(22).font('Helvetica-Bold').fillColor(ORANGE)
   .text('Tecle Motos', { align: 'center' });
doc.moveDown(0.5);
doc.rect(120, doc.y, doc.page.width - 240, 2).fill(ORANGE);
doc.moveDown(1.2);
doc.fontSize(13).font('Helvetica').fillColor(ZINC400)
   .text('Sistema Integrado de Gestão Multi-Empresa', { align: 'center' });
doc.fontSize(11).font('Helvetica').fillColor(ZINC400)
   .text('Guia Completo • Tutoriais Passo a Passo • Capturas de Tela Reais', { align: 'center' });

doc.moveDown(2.5);
const bx = 90, by = doc.y, bw = doc.page.width - 180, bh = 110;
doc.rect(bx, by, bw, bh).fill(ZINC900).stroke(ZINC800);
doc.fontSize(9).font('Helvetica').fillColor(ZINC400).text('VERSÃO', bx + 20, by + 18);
doc.fontSize(18).font('Helvetica-Bold').fillColor(WHITE).text('1.0', bx + 20, by + 30);
doc.fontSize(9).font('Helvetica').fillColor(ZINC400).text('DATA', bx + 90, by + 18);
doc.fontSize(13).font('Helvetica-Bold').fillColor(WHITE)
   .text(new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' }), bx + 90, by + 30, { width: 160 });
doc.fontSize(9).font('Helvetica').fillColor(ZINC400).text('MÓDULOS', bx + 20, by + 70);
doc.fontSize(13).font('Helvetica-Bold').fillColor(ORANGE).text('17 capítulos documentados', bx + 20, by + 82);

doc.fontSize(8).font('Helvetica').fillColor(ZINC400)
   .text('TM Imports | Tecle Motos — Sistema ERP — Documento Confidencial',
         0, doc.page.height - 45, { align: 'center', width: doc.page.width });

// ─── SUMÁRIO ──────────────────────────────────────────────────────────────────

doc.addPage();
doc.rect(0, 0, doc.page.width, doc.page.height).fill('#09090b');

doc.y = 55;
doc.fontSize(22).font('Helvetica-Bold').fillColor(WHITE)
   .text('Sumário', LM, doc.y, { width: PW });
doc.moveDown(0.3);
doc.rect(LM, doc.y, PW, 2).fill(ORANGE);
doc.moveDown(1);

const chapters = [
  ['1',  'Acesso ao Sistema – Login e Senha'],
  ['2',  'Dashboard – Painel de Indicadores'],
  ['3',  'Rede de Franquias – Lojas e Grupos'],
  ['4',  'Catálogo – Produtos e Serviços'],
  ['5',  'Estoque e Pedidos de Compra'],
  ['6',  'Módulo de Vendas'],
  ['7',  'Clientes e Fornecedores (CRM)'],
  ['8',  'Ordens de Serviço'],
  ['9',  'Garantias e Comissões'],
  ['10', 'Financeiro – Hub Completo'],
  ['11', 'Notas Fiscais'],
  ['12', 'Ranking de Vendas'],
  ['13', 'WhatsApp CRM'],
  ['14', 'Relatórios Automáticos'],
  ['15', 'Configurações e Usuários'],
  ['16', 'Perfis de Acesso'],
  ['17', 'Perguntas Frequentes (FAQ)'],
];

chapters.forEach(([num, title], i) => {
  const sy = doc.y;
  ensureSpace(24);
  // número
  doc.fontSize(10).font('Helvetica-Bold').fillColor(ORANGE)
     .text(num + '.', LM, doc.y, { width: 26, lineBreak: false });
  // título
  doc.fontSize(10).font('Helvetica').fillColor(ZINC300)
     .text(title, LM + 26, doc.y, { width: PW - 26, lineBreak: false });
  doc.moveDown(0.75);
});

// ─── CAP 1 — LOGIN ────────────────────────────────────────────────────────────

dividerPage(1, 'Acesso ao Sistema', 'Como fazer login e primeiros passos');

addImg('01-login.jpg', 'Tela de login do sistema ERP TM Imports / Tecle Motos');

h1('Como acessar o sistema');
body('O acesso ao sistema é feito pelo navegador — não é necessário instalar nenhum programa no computador. Basta abrir o endereço (URL) fornecido pelo administrador e inserir suas credenciais.');

step(1, 'Abra o navegador', 'Chrome, Firefox ou Edge. Acesse o endereço do sistema informado pelo administrador.');
step(2, 'Informe o e-mail', 'Digite o e-mail cadastrado para o seu usuário.');
step(3, 'Informe a senha', 'Na primeira vez, use a senha temporária que você recebeu.');
step(4, 'Clique em Entrar', 'Você será redirecionado ao painel principal (Dashboard) do seu perfil.');

h2('Troca de senha obrigatória no primeiro acesso');
body('Na primeira vez que você entra no sistema, é obrigatório criar uma nova senha pessoal. O sistema exibirá um formulário específico para isso e só libera o acesso completo após a troca.');

bullet([
  'A senha deve ter no mínimo 6 caracteres',
  'Nunca compartilhe sua senha com outras pessoas',
  'Cada usuário possui permissões distintas conforme seu perfil',
]);

note('Esqueceu sua senha? Solicite a redefinição ao administrador do sistema (Administrador Geral ou Gerente da sua loja).', ORANGE);

// ─── CAP 2 — DASHBOARD ────────────────────────────────────────────────────────

dividerPage(2, 'Dashboard', 'Painel de indicadores em tempo real');

addImg('02-dashboard.jpg', 'Dashboard principal com KPIs, gráfico de movimentação e seletor de período');

h1('O que é o Dashboard?');
body('O Dashboard é a primeira tela após o login. Ele exibe os principais indicadores de desempenho da sua rede ou unidade — sempre filtrados conforme o seu perfil de acesso. Administradores veem dados de toda a rede; gerentes e vendedores veem apenas a sua loja.');

h2('Indicadores exibidos (KPIs)');
bullet([
  'Vendas Hoje – Total de vendas registradas no dia atual',
  'Faturamento – Valor total faturado no período selecionado',
  'Transações – Quantidade de vendas + ordens de serviço somadas',
  'Ticket Médio – Valor médio por transação confirmada',
  'Loja Líder – Unidade com maior faturamento no período',
  'Alertas – Produtos com estoque abaixo do nível mínimo',
]);

h2('Filtros de período');
body('Use os botões no topo para mudar o intervalo analisado:');
bullet([
  'Hoje – Apenas o dia atual',
  '7 dias – Os últimos sete dias',
  '30 dias – Os últimos trinta dias corridos',
  'Mês atual – Do dia 1 até hoje',
  'Período – Escolha manualmente a data de início e fim',
]);

h2('Seletor de loja (canto superior direito)');
body('Administradores podem alternar entre "Visão Consolidada" (todos os CNPJs juntos) e uma loja específica. Ao selecionar uma loja, o Dashboard passa a exibir apenas os dados daquela unidade.');

note('O gráfico de Movimentação de Vendas mostra a evolução diária do período. Vendas e Ordens de Serviço aparecem em barras separadas para facilitar a análise.', GREEN);

// ─── CAP 3 — LOJAS E GRUPOS ────────────────────────────────────────────────────

dividerPage(3, 'Rede de Franquias', 'Gerenciamento de grupos e lojas');

addImg('14-lojas.jpg', 'Tela de Lojas com cards por unidade, status e indicadores de CNPJ');

h1('Estrutura da rede');
body('A rede está organizada em dois níveis hierárquicos: Grupos (franqueados) e Lojas (unidades físicas). Essa estrutura permite que cada franqueado gerencie suas próprias lojas de forma independente, enquanto o administrador da TM Imports tem visão consolidada de toda a rede.');

bullet([
  'Grupo – Representa uma empresa franqueada (ex.: "Tecle Motos"). Um grupo pode ter várias lojas.',
  'Loja – Unidade física de atendimento ao cliente, vinculada a um grupo e com CNPJ próprio.',
]);

h2('Como cadastrar uma nova loja');
step(1, 'Acesse Rede de Franquias > Lojas', 'No menu lateral, clique em "Rede de Franquias" e depois em "Lojas".');
step(2, 'Clique em "+ Nova Loja"', 'Botão laranja no canto superior direito.');
step(3, 'Preencha os dados da loja', 'Nome fantasia, CNPJ, grupo ao qual pertence e dados de contato.');
step(4, 'Salve', 'Clique em "Salvar". A loja estará ativa imediatamente.');

h2('Detalhes de cada loja');
body('Cada card na listagem exibe: nome fantasia, CNPJ, grupo, número de usuários vinculados e status (Ativa/Inativa). Clique em "Detalhes" para acessar o histórico completo e gerenciar transferências de estoque.');

note('Lojas marcadas com "CNPJ Pendente" precisam ter o número de CNPJ informado antes de emitir notas fiscais.', ORANGE);

// ─── CAP 4 — PRODUTOS E SERVICOS ──────────────────────────────────────────────

dividerPage(4, 'Catálogo', 'Produtos, motos e serviços');

addImg('05-produtos.jpg', 'Lista de produtos com custo médio e preço de venda calculados automaticamente pelo sistema');

h1('Tipos de produto');
body('O catálogo do sistema possui três tipos de item, cada um com comportamentos específicos:');

bullet([
  'Moto – Motocicleta ou scooter elétrico. Ao ser vendida, gera garantias automaticamente e baixa o estoque por número de chassi.',
  'Peça – Componentes e acessórios. O controle de estoque é feito por quantidade.',
  'Serviço – Itens de mão de obra utilizados nas Ordens de Serviço. Não consomem estoque físico.',
]);

h2('Custo médio ponderado');
body('O sistema calcula automaticamente o custo médio de cada produto com base nas entradas confirmadas via Pedidos de Compra. O preço de venda é calculado aplicando a margem de lucro configurada sobre esse custo médio.');

note('Fórmula: Preço de Venda = Custo Médio × (1 + Margem%). A margem padrão é definida em Configurações > Parâmetros.', ORANGE);

h2('Como cadastrar um produto');
step(1, 'Acesse Logística > Produtos', 'No menu lateral, expanda "Logística" e clique em "Produtos".');
step(2, 'Clique em "+ Novo Produto"', 'Abre o formulário de cadastro.');
step(3, 'Informe nome, código e tipo', 'Selecione o tipo correto (Moto, Peça ou Serviço).');
step(4, 'Defina a margem de lucro', 'A margem padrão já vem das Configurações, mas pode ser ajustada por produto.');
step(5, 'Dados fiscais (opcional)', 'NCM, CFOP, CST/CSOSN e alíquotas de ICMS, IPI, PIS e COFINS.');

h2('Importação em planilha');
body('Para cadastrar vários produtos de uma vez, clique em "Importar Planilha" e siga o modelo XLSX disponível para download. O sistema vincula os produtos ao estoque de cada loja automaticamente.');

// ─── CAP 5 — ESTOQUE E PEDIDOS ────────────────────────────────────────────────

dividerPage(5, 'Estoque e Pedidos de Compra', 'Controle de inventário e entrada de mercadorias');

addImg('06-estoque.jpg', 'Estoque consolidado com visão por empresa, custo total e valor de venda');
addImg('15-pedidos-compra.jpg', 'Pedidos de Compra com indicadores de status: Pendentes, Aprovados e Confirmados');

h1('Visualizações do estoque');
body('A página de Estoque oferece duas formas de visualização:');
bullet([
  'Gerencial – Agrupado por modelo, mostrando custo médio e quantidade total por empresa.',
  'Unitária – Por número de chassi/série, permitindo rastrear cada moto ou peça individualmente.',
]);
body('Administradores veem o estoque de todas as lojas (visão consolidada). Gerentes e vendedores veem apenas o estoque da sua loja.');

h2('Como funciona o Pedido de Compra');
body('Toda entrada de mercadoria no estoque deve ser registrada por meio de um Pedido de Compra. O fluxo é:');
step(1, 'Criar o pedido', 'Informe o fornecedor, os produtos, as quantidades e os valores unitários de compra.');
step(2, 'Aprovação pelo gestor', 'O pedido fica com status "Pendente" até que um administrador aprove.');
step(3, 'Confirmar a entrada', 'Ao confirmar que a mercadoria chegou, o estoque é atualizado e o custo médio recalculado automaticamente.');
step(4, 'Conta a pagar gerada', 'O sistema cria automaticamente uma Conta a Pagar no módulo Financeiro referente a essa compra.');

h2('Auditoria de estoque');
body('Cada movimentação de estoque é registrada automaticamente com: data, hora, usuário responsável, tipo de operação (entrada, saída ou transferência) e quantidades antes e depois da operação. O histórico completo fica disponível na seção de Auditoria.');

// ─── CAP 6 — VENDAS ────────────────────────────────────────────────────────────

dividerPage(6, 'Módulo de Vendas', 'Registro e acompanhamento de vendas');

addImg('03-vendas.jpg', 'Tela de Vendas com listagem e botão para registrar nova venda');

h1('Fluxo completo de uma venda');
step(1, 'Selecionar o cliente', 'Busque um cliente existente ou cadastre um novo. O CPF/CNPJ é validado automaticamente.');
step(2, 'Escolher a loja', 'Selecione a loja que está realizando a venda. O estoque disponível é filtrado automaticamente para essa unidade.');
step(3, 'Adicionar produtos', 'Somente produtos com estoque disponível na loja selecionada aparecem para escolha.');
step(4, 'Aplicar desconto (opcional)', 'O desconto máximo permitido por tipo de produto é configurável. Gerentes têm o dobro do limite dos vendedores.');
step(5, 'Definir a forma de pagamento', 'Opções: À Vista, Parcelado, Financiamento ou Consórcio.');
step(6, 'Confirmar a venda', 'Ao confirmar, o sistema gera automaticamente: Conta a Receber, Garantias (se for moto) e Comissão para o vendedor.');

h2('Orçamento × Venda');
body('É possível salvar um atendimento como "Orçamento" para compartilhar com o cliente sem comprometer o estoque. Ao converter o orçamento em "Venda", o estoque é baixado e todos os registros financeiros são criados.');

note('Vendas de motos geram automaticamente 4 garantias: Geral (12 meses), Motor (6 meses), Módulo Eletrônico (6 meses) e Bateria (6 meses).', GREEN);

h2('Confirmação financeira');
body('Vendas com pagamento a prazo ficam marcadas como "Pendente financeiro" até que o setor financeiro confirme o recebimento. Essa etapa garante que nenhum valor seja contabilizado antes de ser efetivamente recebido.');

// ─── CAP 7 — CLIENTES E FORNECEDORES ──────────────────────────────────────────

dividerPage(7, 'Clientes e Fornecedores', 'Gestão de relacionamento (CRM)');

addImg('04-clientes.jpg', 'Tela de Clientes com campo de busca e botão para novo cadastro');
addImg('13-fornecedores.jpg', 'CRM de Fornecedores com painel lateral de detalhes e histórico de interações');

h1('Cadastro de clientes');
body('O cadastro de cliente é obrigatório antes de realizar qualquer venda. Os dados necessários são:');
bullet([
  'Nome completo ou razão social',
  'CPF ou CNPJ (com validação automática do formato)',
  'Telefone e e-mail para contato',
  'Endereço completo',
  'Observações internas (visíveis apenas para a equipe)',
]);

h2('Histórico de interações (CRM)');
body('Cada cliente e fornecedor possui uma linha do tempo de interações. Você pode registrar:');
bullet([
  'Ligações realizadas e visitas feitas',
  'E-mails enviados',
  'Negociações em andamento',
  'Follow-ups agendados para datas futuras',
  'Mensagens enviadas via WhatsApp',
]);

h2('Botão de WhatsApp');
body('Na listagem de clientes e fornecedores há um botão de WhatsApp (ícone de balão verde). Ao clicar, o sistema abre o WhatsApp com uma mensagem pré-preenchida para aquele contato — sem necessidade de copiar número ou digitar texto.');

note('Segurança: clientes que possuem vendas ou ordens de serviço vinculadas não podem ser excluídos. O sistema exibe um aviso e bloqueia a operação.', ORANGE);

// ─── CAP 8 — ORDENS DE SERVICO ────────────────────────────────────────────────

dividerPage(8, 'Ordens de Serviço', 'Gerenciamento de manutenção e atendimentos técnicos');

addImg('07-os.jpg', 'Tela de Ordens de Serviço com listagem, status e botão para nova OS');

h1('O que é uma Ordem de Serviço?');
body('A Ordem de Serviço (OS) registra um atendimento técnico: revisão, manutenção preventiva, garantia ou reparo. Ela é vinculada a um cliente e a uma descrição do veículo, podendo incluir peças e serviços com valores calculados em tempo real.');

h2('Fluxo da Ordem de Serviço');
step(1, 'Criar a OS', 'Informe o cliente, a descrição do veículo (modelo, placa ou chassi) e os serviços a executar.');
step(2, 'Adicionar itens', 'Selecione os serviços (com seus valores configurados) e as peças necessárias do estoque.');
step(3, 'Execução', 'O técnico responsável atualiza o status à medida que avança no serviço.');
step(4, 'Confirmar a OS', 'Ao confirmar a conclusão, o sistema gera automaticamente a Conta a Receber e a comissão do técnico.');

h2('Status possíveis da OS');
bullet([
  'Aberta – Aguardando início do atendimento',
  'Em Andamento – Técnico executando o serviço',
  'Aguardando Peças – Peça em falta ou pedido de compra em trânsito',
  'Concluída – Serviço finalizado, aguardando retirada pelo cliente',
  'Cancelada – OS encerrada sem execução',
]);

note('O relatório da OS inclui o detalhamento de todos os serviços e peças utilizadas, com valores individuais e total geral.', BLUE);

// ─── CAP 9 — GARANTIAS E COMISSOES ────────────────────────────────────────────

dividerPage(9, 'Garantias e Comissões', 'Controle automático de garantias e remuneração variável');

addImg('16-garantias.jpg', 'Módulo de Garantias com indicadores de status e datas de vencimento');
addImg('18-comissoes.jpg', 'Módulo de Comissões com filtros por mês, colaborador, tipo e status de pagamento');

h1('Como funcionam as garantias');
body('Ao confirmar a venda de uma moto, o sistema cria automaticamente quatro registros de garantia vinculados ao cliente e ao chassi do veículo:');
bullet([
  'Garantia Geral – 12 meses a partir da data da venda',
  'Garantia do Motor – 6 meses',
  'Garantia do Módulo Eletrônico – 6 meses',
  'Garantia da Bateria – 6 meses',
]);

h2('Garantias retroativas');
body('Para vendas já realizadas que não geraram garantias automaticamente, acesse o módulo de Garantias e utilize a opção "Gerar Garantias Retroativas". O sistema reprocessa a criação dos quatro registros para essa venda.');

h2('Alertas de vencimento');
body('O Dashboard exibe alertas quando garantias estão próximas do vencimento (em 5 dias ou menos). O módulo de Garantias permite filtrar por: Total, Ativas, Vencendo em 5 dias e Expiradas.');

h2('Como funcionam as comissões');
body('O sistema calcula as comissões automaticamente com base nas regras globais configuradas em Configurações > Parâmetros:');
bullet([
  'Comissão do Vendedor sobre Moto – percentual aplicado ao valor de venda',
  'Comissão do Técnico – percentual sobre o valor total da OS concluída',
  'Período – Mensal ou Semanal, conforme configuração',
]);

body('Os gestores podem marcar comissões como pagas. Os filtros disponíveis são: mês de referência, colaborador, tipo (venda ou OS) e status (pendente ou pago).');

// ─── CAP 10 — FINANCEIRO ──────────────────────────────────────────────────────

dividerPage(10, 'Financeiro', 'Hub completo de gestão financeira');

addImg('08-financeiro.jpg', 'Hub Financeiro com abas: Visão Geral, Por CNPJ, A Pagar, A Receber, Compras, Fiscal, Conciliação e Fornecedores');

h1('Visão geral financeira');
body('A tela inicial do Financeiro exibe o Saldo Líquido: diferença entre o total a receber e o total a pagar em aberto. Logo abaixo, dois grupos de indicadores detalham cada lado:');
bullet([
  'Contas a Pagar – Em aberto, Vencidas, Vencendo em 7 dias e Pagas neste mês',
  'Contas a Receber – Em aberto, Vencidas, Vencendo em 7 dias e Recebidas neste mês',
]);

h2('Abas do módulo financeiro');
bullet([
  'Visão Geral – KPIs consolidados de todo o grupo ou rede',
  'Por CNPJ – Dashboard financeiro individual por loja/empresa',
  'A Pagar – Lista de contas a pagar com parcelas e datas de vencimento',
  'A Receber – Contas geradas automaticamente pelas vendas e OS confirmadas',
  'Compras – Pedidos de compra e as contas a pagar deles originadas',
  'Fiscal – Controle de notas fiscais de entrada e saída',
  'Conciliação – Reconciliação bancária com suporte a importação de OFX',
  'Fornecedores – CRM de parceiros comerciais com histórico de interações',
]);

h2('Contas a pagar');
body('As contas a pagar são criadas de duas formas:');
bullet([
  'Automática – Ao confirmar um Pedido de Compra (identificadas como "origem: COMPRA")',
  'Manual – Avulsas, para despesas diversas não vinculadas a compras de estoque',
]);
body('Cada conta pode ter múltiplas parcelas. O pagamento de cada parcela é registrado individualmente, compondo o histórico financeiro completo.');

h2('Contas a receber');
body('Criadas automaticamente ao confirmar uma Venda ou Ordem de Serviço. O sistema identifica a forma de pagamento e cria as parcelas correspondentes. Recebimentos são registrados individualmente e o status de cada parcela é atualizado em tempo real.');

h2('Conciliação bancária');
body('Importe extratos bancários no formato OFX (arquivo exportado do seu banco). O sistema analisa os lançamentos e sugere correspondências com pagamentos e recebimentos já registrados no ERP. A conciliação pode ser feita manualmente item a item ou automaticamente pelo sistema.');

// ─── CAP 11 — NOTAS FISCAIS ───────────────────────────────────────────────────

dividerPage(11, 'Notas Fiscais', 'Controle fiscal de entradas e saídas');

addImg('19-notas-fiscais.jpg', 'Módulo de Notas Fiscais com filtros por tipo (Entrada/Saída) e status');

h1('Tipos de nota fiscal');
bullet([
  'Entrada – Nota fiscal recebida de fornecedores ao comprar mercadoria.',
  'Saída – Nota fiscal emitida para clientes nas vendas realizadas.',
]);

h2('Dados fiscais dos produtos');
body('Cada produto do catálogo pode ter seus dados fiscais configurados. Esses dados são utilizados no preenchimento das notas fiscais:');
bullet([
  'NCM – Nomenclatura Comum do Mercosul (código de classificação do produto)',
  'CFOP – Código Fiscal de Operações e Prestações',
  'CST / CSOSN – Código de Situação Tributária',
  'Alíquotas – ICMS, IPI, PIS e COFINS',
  'Unidade de Medida – UN (unidade), KG, L, M, entre outras',
]);

note('O módulo fiscal serve para registro e controle interno. Para emissão de NF-e com validade fiscal junto à SEFAZ, utilize o sistema de emissão fiscal integrado da sua contabilidade.', ORANGE);

// ─── CAP 12 — RANKING ─────────────────────────────────────────────────────────

dividerPage(12, 'Ranking de Vendas', 'Desempenho de produtos e serviços por período');

addImg('17-ranking.jpg', 'Ranking dos produtos e serviços mais e menos vendidos no período selecionado');

h1('Como usar o Ranking');
body('O Ranking exibe os 20 produtos e serviços com melhor (ou pior) desempenho no período escolhido. É uma ferramenta essencial para decisões de reposição de estoque e ajuste de preços.');

h2('Filtros disponíveis');
bullet([
  'Período – Últimos 30, 60 ou 90 dias, ou intervalo personalizado',
  'Ordenação – "Mais vendidos" ou "Menos vendidos"',
  'Aba Produtos – Ranking de motos e peças',
  'Aba Serviços – Ranking de serviços executados nas OS',
]);

h2('Cards de destaque');
body('Os quatro cards no topo exibem rapidamente:');
bullet([
  'Produto Mais Vendido – Campeão de vendas no período',
  'Produto Menos Vendido – Item com menor saída (alerta de estoque parado)',
  'Serviço Mais Executado – O serviço mais requisitado pelos clientes',
  'Serviço Menos Executado – Serviço pouco solicitado',
]);

// ─── CAP 13 — WHATSAPP CRM ────────────────────────────────────────────────────

dividerPage(13, 'WhatsApp CRM', 'Comunicação em massa e automatizada');

addImg('09-whatsapp.jpg', 'WhatsApp CRM com abas: Disparar Mensagens, Templates e Histórico de Disparos');

h1('O que é o WhatsApp CRM?');
body('O módulo de WhatsApp CRM permite enviar mensagens personalizadas para clientes, fornecedores e vendedores por meio de links wa.me — que abrem o WhatsApp diretamente com a mensagem pré-preenchida. Não é necessário contratar API paga nem integração externa.');

h2('Tipos de destinatários');
bullet([
  'Vendedores – Equipe de vendas da rede',
  'Clientes – Clientes cadastrados com número de telefone',
  'Fornecedores – Parceiros comerciais',
  'Avulso – Qualquer número não cadastrado no sistema',
]);

h2('Templates de mensagem disponíveis');
body('O sistema possui 8 templates pré-configurados para diferentes situações:');
bullet([
  'Motivacional para Vendedor – Incentivo e engajamento da equipe',
  'Follow-up com Cliente – Acompanhamento pós-venda',
  'Follow-up com Fornecedor – Contato comercial com parceiros',
  'Cobrança – Lembrete de parcela em atraso ou próxima do vencimento',
  'Boas-Vindas – Recepção de novo cliente',
  'Confirmação de Venda – Confirmação de compra realizada',
  'Aviso de Garantia – Alerta de garantia próxima ao vencimento',
  'Personalizado – Mensagem completamente livre',
]);

h2('Como disparar mensagens');
step(1, 'Selecione os destinatários', 'Escolha a categoria (vendedores, clientes, etc.) e marque os contatos desejados.');
step(2, 'Escolha um template', 'Selecione um dos templates disponíveis ou escreva uma mensagem personalizada.');
step(3, 'Clique em "Gerar Links"', 'O sistema cria um link wa.me individual para cada destinatário selecionado.');
step(4, 'Clique nos links gerados', 'Cada link abre o WhatsApp com a mensagem pré-preenchida. Basta clicar em "Enviar".');

h2('Disparo automático diário');
body('Toda segunda a sexta-feira, às 8h00 (horário de Brasília), o sistema envia automaticamente mensagens motivacionais para todos os vendedores ativos que possuem número de telefone cadastrado.');

// ─── CAP 14 — RELATORIOS ──────────────────────────────────────────────────────

dividerPage(14, 'Relatórios Automáticos', 'Relatórios periódicos enviados por e-mail');

addImg('10-relatorios.jpg', 'Tela de Relatórios com indicadores de destinatários e opção de disparo manual');

h1('Como funcionam os relatórios automáticos');
body('O sistema envia relatórios em formato Excel (XLSX) por e-mail automaticamente em dois momentos: toda segunda-feira (relatório semanal) e no dia 1 de cada mês (relatório mensal). Existem três tipos, cada um direcionado a um perfil diferente:');
bullet([
  'Relatório Geral – Para o Administrador Geral. Inclui financeiro, comercial, estoque e alertas da rede completa.',
  'Relatório Financeiro – Para o Administrador Financeiro. Foca em contas a pagar/receber e fluxo de caixa.',
  'Relatório Comercial – Para Dono de Loja, Gerente e Admin de Rede. Foca em vendas e desempenho por loja.',
]);

h2('Agendamento automático');
bullet([
  'Semanal – Toda segunda-feira às 7h00 (horário de Brasília)',
  'Mensal – Todo dia 1 de cada mês às 7h30 (horário de Brasília)',
]);

h2('Disparo manual (envio imediato)');
body('Você pode enviar um relatório a qualquer momento, sem aguardar o agendamento automático:');
step(1, 'Selecione o tipo de relatório', 'Todos, Geral, Financeiro ou Comercial.');
step(2, 'Selecione o período', 'Semanal (últimos 7 dias) ou Mensal (último mês completo).');
step(3, 'Clique em "Enviar Relatório"', 'O sistema dispara imediatamente para os destinatários configurados.');

note('Para que o envio de e-mail funcione, as configurações de SMTP (servidor de e-mail) devem estar ativas no servidor. Consulte o administrador técnico do sistema.', ORANGE);

// ─── CAP 15 — CONFIGURACOES ───────────────────────────────────────────────────

dividerPage(15, 'Configurações e Usuários', 'Administração e parâmetros do sistema');

addImg('11-configuracoes.jpg', 'Configurações do Sistema: parâmetros de comissão, desconto máximo e margens de lucro');
addImg('12-usuarios.jpg', 'Gerenciamento de Usuários com perfis e vínculos de loja');

h1('Parâmetros do sistema');
body('A aba "Parâmetros" em Configurações permite ajustar as regras de negócio globais que afetam toda a rede:');
bullet([
  'Comissão do Vendedor sobre Moto (%) – Percentual aplicado ao valor de venda da moto',
  'Comissão do Técnico (%) – Percentual sobre o valor total da OS concluída',
  'Período de Comissão – Mensal ou Semanal',
  'Habilitar Comissão sobre Peças – Ativa ou desativa comissão em vendas de peças',
  'Desconto Máximo Moto / Peça / Serviço / OS (%) – Limites de desconto por tipo de produto',
  'Margem de Lucro Moto / Peça (%) – Percentual aplicado ao custo médio para calcular o preço',
]);

note('Atenção: Gerentes têm o dobro do limite de desconto configurado. Por exemplo, se o limite for 10%, o gerente pode conceder até 20%.', ORANGE);

h2('Botão "Recalcular Preços dos Produtos"');
body('Ao alterar a margem de lucro, clique neste botão para atualizar o preço de venda de todos os produtos cadastrados. A operação não afeta vendas já realizadas — apenas os valores exibidos para novas vendas.');

h2('Histórico de alterações');
body('Clique em "Ver Histórico" para consultar todas as mudanças de parâmetros, incluindo: data, hora, usuário responsável, parâmetro alterado, valor anterior e novo valor. Isso garante rastreabilidade total das decisões.');

h2('Gerenciamento de usuários');
step(1, 'Acesse Configurações > Usuários', 'Lista todos os usuários com perfil, loja vinculada e status (Ativo/Inativo).');
step(2, 'Clique em "+ Novo Usuário"', 'Preencha nome, e-mail e selecione o perfil de acesso.');
step(3, 'Vincule à loja ou grupo', 'Conforme o perfil escolhido, selecione a loja ou grupo correspondente.');
step(4, 'Senha temporária', 'O sistema define uma senha inicial. O usuário será obrigado a alterá-la no primeiro acesso.');

// ─── CAP 16 — PERFIS RBAC ─────────────────────────────────────────────────────

dividerPage(16, 'Perfis de Acesso', 'Controle de permissões por função (RBAC)');

h1('Os 7 perfis do sistema');
body('O sistema possui sete perfis distintos, cada um com permissões específicas. A tabela abaixo resume o nome, a sigla e o escopo de acesso de cada perfil:');

doc.moveDown(0.4);
// header
doc.rect(LM, doc.y, PW, 22).fill(ZINC800);
doc.fontSize(9).font('Helvetica-Bold').fillColor(ORANGE)
   .text('Perfil',    LM + 4,  doc.y + 6, { width: 150, lineBreak: false });
doc.fontSize(9).font('Helvetica-Bold').fillColor(ORANGE)
   .text('Sigla',     LM + 158, doc.y + 6, { width: 90,  lineBreak: false });
doc.fontSize(9).font('Helvetica-Bold').fillColor(ORANGE)
   .text('Escopo de Acesso', LM + 252, doc.y + 6, { width: PW - 258 });
doc.y += 22;

const roles = [
  ['Administrador Geral',      'ADMIN_GERAL',       'Acesso total. Sem vínculo com loja ou grupo.'],
  ['Administrador Financeiro', 'ADMIN_FINANCEIRO',  'Acesso a Comercial + Financeiro completo.'],
  ['Admin de Rede',            'ADMIN_REDE',        'Gerencia a rede de franquias de um grupo.'],
  ['Dono da Loja',             'DONO_LOJA',         'Gestão completa de todas as lojas do seu grupo.'],
  ['Gerente de Loja',          'GERENTE_LOJA',      'Gestão operacional de uma loja específica.'],
  ['Vendedor',                 'VENDEDOR',          'Clientes, Vendas, OS, Garantias e Comissões da sua loja.'],
  ['Técnico',                  'TECNICO',           'Dashboard, Estoque, OS e Garantias da sua loja.'],
];
roles.forEach((r, i) => roleRow(r[0], r[1], r[2], i % 2 === 0));
doc.moveDown(0.8);

h2('O que cada perfil vê no menu');
bullet([
  'ADMIN_GERAL e ADMIN_FINANCEIRO – Sem vínculo com loja: enxergam dados de toda a rede.',
  'ADMIN_REDE e DONO_LOJA – Vinculados a um Grupo: veem todas as lojas do seu grupo.',
  'GERENTE_LOJA e VENDEDOR – Vinculados a uma Loja: veem apenas os dados daquela unidade.',
  'TÉCNICO – Menu simplificado: Dashboard, Estoque, Ordens de Serviço, Garantias e Comissões.',
]);

h2('Permissões por módulo');
bullet([
  'Configurações do Sistema – Somente ADMIN_GERAL',
  'Grupos e Lojas – ADMIN_GERAL e ADMIN_REDE',
  'Usuários – ADMIN_GERAL, DONO_LOJA e GERENTE_LOJA (limitado à sua loja)',
  'Produtos e Catálogo – ADMIN_GERAL, ADMIN_REDE e DONO_LOJA',
  'Estoque gerencial – ADMIN_GERAL, ADMIN_REDE, DONO_LOJA e GERENTE_LOJA',
  'Financeiro completo – ADMIN_GERAL e ADMIN_FINANCEIRO',
  'Relatórios automáticos – ADMIN_GERAL e ADMIN_FINANCEIRO',
  'WhatsApp CRM – Todos os perfis, exceto TÉCNICO',
]);

note('O ADMIN_GERAL (admin@teclemotos.com) é o superusuário da plataforma. Ele nunca tem vínculo com loja ou grupo e sempre vê os dados de toda a rede de forma consolidada.', ORANGE);

// ─── CAP 17 — FAQ ─────────────────────────────────────────────────────────────

dividerPage(17, 'Perguntas Frequentes', 'Respostas rápidas para as dúvidas mais comuns');

h1('FAQ – Dúvidas frequentes');

const faqs = [
  ['Esqueci minha senha. O que fazer?',
   'Entre em contato com o administrador do sistema ou com o gerente da sua loja. Ele pode redefinir a sua senha pelo módulo de Usuários. Você receberá uma senha temporária e será obrigado a criar uma nova no próximo acesso.'],
  ['A garantia não foi gerada após a venda de uma moto.',
   'Acesse o módulo de Garantias e utilize a opção "Gerar Garantias Retroativas". O sistema reprocessa a criação das quatro garantias para a venda selecionada.'],
  ['Como transferir estoque entre lojas do mesmo grupo?',
   'Acesse Estoque, selecione a loja de origem, clique em "Transferir" no item desejado e informe a loja de destino e a quantidade a transferir. Somente lojas do mesmo grupo podem realizar transferências entre si.'],
  ['A Conta a Receber não foi gerada após confirmar uma venda.',
   'Acesse Financeiro > A Receber e utilize "Gerar Contas Retroativas". O sistema reprocessa a criação das contas para vendas que não tiveram o registro financeiro gerado.'],
  ['Os relatórios por e-mail não estão chegando.',
   'Confirme com o administrador técnico que as configurações de servidor de e-mail (SMTP) estão ativas. Sem isso, o envio automático e manual de e-mails não funciona.'],
  ['O dashboard está mostrando valores zerados. É normal?',
   'Sim. Se o sistema foi implantado recentemente e ainda não há vendas ou OS registradas, todos os KPIs aparecerão zerados. Os indicadores são preenchidos à medida que as operações são lançadas.'],
  ['Como rastrear uma moto específica pelo número de chassi?',
   'Acesse Estoque e selecione a visualização "Unitária" (ou "Por Chassi"). Utilize o campo de busca para localizar o chassi desejado e ver o histórico completo de movimentação daquela unidade.'],
  ['Posso excluir um cliente que já realizou uma compra?',
   'Não. O sistema bloqueia a exclusão de clientes que possuem vendas, OS ou outros registros vinculados. Para desativar um cadastro, utilize o campo de observações internas ou entre em contato com o administrador.'],
  ['Como adicionar um novo usuário ao sistema?',
   'Acesse Configurações > Usuários e clique em "+ Novo Usuário". Preencha nome, e-mail e selecione o perfil adequado. O usuário receberá uma senha temporária e deverá alterá-la no primeiro acesso.'],
  ['Por que alguns produtos não aparecem na seleção durante uma venda?',
   'A seleção de produtos é filtrada pelo estoque da loja escolhida para a venda. Somente produtos com quantidade disponível naquela loja são exibidos. Verifique se o produto tem estoque na loja correta.'],
];

faqs.forEach((faq) => {
  ensureSpace(65);
  const sy = doc.y;
  // pergunta
  doc.rect(LM, sy, PW, 20).fill('#1e293b');
  doc.rect(LM, sy, 4, 20).fill(BLUE);
  doc.fontSize(9).font('Helvetica-Bold').fillColor(WHITE)
     .text('P: ' + faq[0], LM + 10, sy + 5, { width: PW - 16 });
  doc.y = sy + 24;
  // resposta
  doc.fontSize(9).font('Helvetica').fillColor(ZINC300)
     .text('R: ' + faq[1], LM + 6, doc.y, { width: PW - 10, lineGap: 2 });
  doc.moveDown(0.9);
});

// ─── PÁGINA FINAL ─────────────────────────────────────────────────────────────

doc.addPage();
doc.rect(0, 0, doc.page.width, doc.page.height).fill('#09090b');
doc.rect(0, 0, doc.page.width, 10).fill(ORANGE);
doc.rect(0, doc.page.height - 10, doc.page.width, 10).fill(ORANGE);

const midY = doc.page.height / 2 - 70;
doc.fontSize(30).font('Helvetica-Bold').fillColor(WHITE)
   .text('TM Imports', 0, midY, { align: 'center', width: doc.page.width });
doc.fontSize(18).font('Helvetica-Bold').fillColor(ORANGE)
   .text('Tecle Motos', 0, midY + 38, { align: 'center', width: doc.page.width });
doc.rect(120, midY + 68, doc.page.width - 240, 2).fill(ORANGE);
doc.fontSize(11).font('Helvetica').fillColor(ZINC400)
   .text('Sistema Integrado de Gestão Multi-Empresa', 0, midY + 80, { align: 'center', width: doc.page.width });
doc.moveDown(3);
doc.fontSize(10).font('Helvetica').fillColor(ZINC400)
   .text('Dúvidas ou suporte técnico:', 0, midY + 120, { align: 'center', width: doc.page.width });
doc.fontSize(12).font('Helvetica-Bold').fillColor(ORANGE)
   .text('admin@teclemotos.com', 0, midY + 136, { align: 'center', width: doc.page.width });

// ─── NÚMEROS DE PÁGINA ────────────────────────────────────────────────────────

const range = doc.bufferedPageRange();
// page 0 = capa (sem número), page 1 = sumário (sem número), page 2+ = conteúdo
for (let i = range.start + 2; i < range.start + range.count - 1; i++) {
  doc.switchToPage(i);
  const pageNum = i - 1; // página 1 começa na index 2
  doc.fontSize(8).font('Helvetica').fillColor(ZINC400)
     .text(
       `Página ${pageNum}  ·  Manual TM Imports / Tecle Motos`,
       LM, doc.page.height - 38,
       { align: 'center', width: PW }
     );
}

doc.end();
console.log('PDF gerado com sucesso:', OUTPUT);
