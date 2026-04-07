const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 50, right: 50 },
  info: {
    Title: 'Manual do Sistema ERP - TM Imports / Tecle Motos',
    Author: 'TM Imports',
    Subject: 'Sistema de Gestão Multi-Empresa',
    Keywords: 'ERP, motos, franquias, gestão',
  }
});

const OUTPUT = path.join(__dirname, '..', 'Manual_TM_Imports_ERP.pdf');
doc.pipe(fs.createWriteStream(OUTPUT));

const SCREENSHOTS = path.join(__dirname, '..', 'screenshots');
const ORANGE = '#f97316';
const DARK = '#09090b';
const GRAY = '#71717a';
const WHITE = '#ffffff';
const GREEN = '#22c55e';

function imgPath(name) {
  return path.join(SCREENSHOTS, name);
}

function pageW() { return doc.page.width - 100; }

// ─── HELPERS ────────────────────────────────────────────────────────────────

function coverPage() {
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#09090b');
  doc.rect(0, 0, doc.page.width, 8).fill(ORANGE);
  doc.rect(0, doc.page.height - 8, doc.page.width, 8).fill(ORANGE);

  doc.moveDown(8);
  doc.fontSize(9).fillColor(ORANGE).text('MANUAL DO SISTEMA', { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(32).fillColor(WHITE).font('Helvetica-Bold')
     .text('TM Imports', { align: 'center' });
  doc.fontSize(22).fillColor(ORANGE).font('Helvetica-Bold')
     .text('Tecle Motos', { align: 'center' });
  doc.moveDown(0.5);
  doc.rect(180, doc.y, pageW() - 80, 2).fill(ORANGE);
  doc.moveDown(1.5);
  doc.fontSize(14).fillColor('#a1a1aa').font('Helvetica')
     .text('Sistema Integrado de Gestão Multi-Empresa', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#a1a1aa')
     .text('Guia Completo com Tutoriais e Telas do Sistema', { align: 'center' });

  doc.moveDown(3);
  const boxY = doc.y;
  doc.rect(100, boxY, pageW() - 0, 160).fill('#18181b').stroke('#27272a');
  doc.y = boxY + 20;
  doc.fontSize(10).fillColor(GRAY).text('VERSAO', { align: 'center' });
  doc.fontSize(16).fillColor(WHITE).font('Helvetica-Bold').text('1.0', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor(GRAY).font('Helvetica').text('DATA', { align: 'center' });
  doc.fontSize(13).fillColor(WHITE).text(new Date().toLocaleDateString('pt-BR', { year:'numeric',month:'long',day:'numeric' }), { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor(GRAY).text('MODULOS DOCUMENTADOS', { align: 'center' });
  doc.fontSize(13).fillColor(ORANGE).font('Helvetica-Bold')
     .text('15 modulos completos', { align: 'center' });

  doc.y = doc.page.height - 100;
  doc.fontSize(9).fillColor(GRAY).font('Helvetica')
     .text('TM Imports | Tecle Motos — Sistema ERP Multiempresa — Confidencial', { align: 'center' });
}

function newSection(title, subtitle) {
  doc.addPage();
  doc.rect(0, 0, doc.page.width, 80).fill('#18181b');
  doc.rect(0, 0, 6, 80).fill(ORANGE);
  doc.y = 20;
  doc.x = 60;
  doc.fontSize(20).fillColor(WHITE).font('Helvetica-Bold').text(title, { continued: false });
  if (subtitle) {
    doc.fontSize(10).fillColor(GRAY).font('Helvetica').text(subtitle);
  }
  doc.y = 95;
  doc.x = 50;
}

function sectionHeader(title) {
  doc.moveDown(0.8);
  doc.rect(50, doc.y, 4, 16).fill(ORANGE);
  doc.x = 60;
  doc.fontSize(13).fillColor(WHITE).font('Helvetica-Bold').text(title, { continued: false });
  doc.x = 50;
  doc.moveDown(0.4);
}

function bodyText(text) {
  doc.fontSize(10).fillColor('#d4d4d8').font('Helvetica').text(text, { width: pageW(), lineGap: 3 });
  doc.moveDown(0.3);
}

function stepBox(num, title, desc) {
  const y = doc.y;
  if (y > doc.page.height - 120) { doc.addPage(); doc.y = 50; }
  doc.rect(50, doc.y, pageW(), 52).fill('#18181b').stroke('#27272a');
  const circleY = doc.y + 26;
  doc.circle(75, circleY, 14).fill(ORANGE);
  doc.fontSize(11).fillColor(WHITE).font('Helvetica-Bold').text(String(num), 72, circleY - 7);
  doc.fontSize(10).fillColor(WHITE).font('Helvetica-Bold').text(title, 98, circleY - 18, { width: pageW() - 60 });
  doc.fontSize(9).fillColor(GRAY).font('Helvetica').text(desc, 98, circleY - 4, { width: pageW() - 60 });
  doc.y += 60;
  doc.x = 50;
}

function infoBox(text, color) {
  const c = color || ORANGE;
  const y = doc.y;
  doc.rect(50, y, pageW(), 30).fill('#18181b').stroke(c);
  doc.rect(50, y, 4, 30).fill(c);
  doc.fontSize(9).fillColor('#d4d4d8').font('Helvetica').text(text, 62, y + 10, { width: pageW() - 20 });
  doc.y += 38;
  doc.x = 50;
}

function addScreenshot(imgFile, caption, fullWidth) {
  const imgFull = imgPath(imgFile);
  if (!fs.existsSync(imgFull)) return;
  const maxW = fullWidth ? pageW() : pageW();
  const maxH = 220;
  doc.moveDown(0.4);
  if (doc.y + maxH + 50 > doc.page.height - 50) doc.addPage();
  doc.rect(50, doc.y, maxW, maxH + 24).fill('#18181b').stroke('#27272a');
  try {
    doc.image(imgFull, 54, doc.y + 4, { width: maxW - 8, height: maxH, fit: [maxW - 8, maxH], align: 'center', valign: 'center' });
  } catch(e) {}
  doc.y += maxH + 8;
  doc.x = 50;
  doc.fontSize(8).fillColor(GRAY).font('Helvetica').text(caption, { align: 'center', width: pageW() });
  doc.moveDown(0.6);
}

function bulletList(items) {
  items.forEach(item => {
    doc.fontSize(10).fillColor('#d4d4d8').font('Helvetica')
       .text(`  •  ${item}`, { width: pageW(), lineGap: 2 });
  });
  doc.moveDown(0.3);
}

function roleTable(rows) {
  const y0 = doc.y;
  if (y0 + rows.length * 22 + 30 > doc.page.height - 50) { doc.addPage(); doc.y = 50; }
  const cols = [160, 90, 200];
  const headers = ['Perfil', 'Sigla', 'Acesso Permitido'];
  doc.rect(50, doc.y, pageW(), 22).fill('#27272a');
  let x = 54;
  headers.forEach((h, i) => {
    doc.fontSize(9).fillColor(ORANGE).font('Helvetica-Bold').text(h, x, doc.y + 6, { width: cols[i] });
    x += cols[i];
  });
  doc.y += 22;
  rows.forEach((row, ri) => {
    const bg = ri % 2 === 0 ? '#18181b' : '#1c1c1e';
    doc.rect(50, doc.y, pageW(), 22).fill(bg);
    let rx = 54;
    row.forEach((cell, ci) => {
      doc.fontSize(9).fillColor(ci === 0 ? WHITE : GRAY).font(ci === 0 ? 'Helvetica-Bold' : 'Helvetica')
         .text(cell, rx, doc.y + 6, { width: cols[ci] });
      rx += cols[ci];
    });
    doc.y += 22;
  });
  doc.x = 50;
  doc.moveDown(0.5);
}

// ────────────────────────────────────────────────────────────────────────────
// CAPA
// ────────────────────────────────────────────────────────────────────────────
coverPage();

// ────────────────────────────────────────────────────────────────────────────
// INDICE
// ────────────────────────────────────────────────────────────────────────────
doc.addPage();
doc.rect(0, 0, doc.page.width, doc.page.height).fill('#09090b');
doc.y = 50;
doc.fontSize(22).fillColor(WHITE).font('Helvetica-Bold').text('Sumario', { align: 'center' });
doc.moveDown(0.5);
doc.rect(50, doc.y, pageW(), 2).fill(ORANGE);
doc.moveDown(1);

const chapters = [
  ['1', 'Acesso ao Sistema (Login)', '3'],
  ['2', 'Visao Geral — Dashboard', '4'],
  ['3', 'Rede de Franquias — Lojas e Grupos', '5'],
  ['4', 'Logistica — Produtos e Servicos', '6'],
  ['5', 'Estoque e Pedidos de Compra', '7'],
  ['6', 'Modulo de Vendas', '8'],
  ['7', 'Clientes e Fornecedores (CRM)', '9'],
  ['8', 'Ordens de Servico', '10'],
  ['9', 'Garantias e Comissoes', '11'],
  ['10', 'Financeiro — Hub Completo', '12'],
  ['11', 'Notas Fiscais', '14'],
  ['12', 'Ranking de Vendas', '15'],
  ['13', 'WhatsApp CRM', '16'],
  ['14', 'Relatorios Automaticos', '17'],
  ['15', 'Configuracoes e Usuarios', '18'],
  ['16', 'Perfis de Acesso (RBAC)', '19'],
  ['17', 'Perguntas Frequentes', '20'],
];
chapters.forEach(([num, title, page]) => {
  const y = doc.y;
  doc.fontSize(11).fillColor(ORANGE).font('Helvetica-Bold').text(`${num}.`, 50, y, { width: 30, continued: true });
  doc.fillColor('#d4d4d8').font('Helvetica').text(` ${title}`, { width: pageW() - 50, continued: true });
  doc.fillColor(GRAY).text(`${page}`, { align: 'right', width: 0 });
  doc.moveDown(0.6);
});

// ────────────────────────────────────────────────────────────────────────────
// CAP 1 — LOGIN
// ────────────────────────────────────────────────────────────────────────────
newSection('1. Acesso ao Sistema', 'Como fazer login e primeiros passos');

addScreenshot('01-login.jpg', 'Figura 1 — Tela de login do sistema ERP TM Imports / Tecle Motos');

sectionHeader('Como Acessar o Sistema');
bodyText('O acesso ao sistema e realizado atraves do navegador web. Nao e necessaria nenhuma instalacao — basta acessar o endereco fornecido pela TM Imports.');

stepBox(1, 'Abra o Navegador', 'Use Chrome, Firefox ou Edge. Acesse o endereco do sistema (URL fornecida pelo administrador).');
stepBox(2, 'Informe o E-mail', 'Digite o e-mail cadastrado pelo administrador da sua unidade.');
stepBox(3, 'Informe a Senha', 'Na primeira vez, use a senha temporaria recebida. Voce sera solicitado a criar uma nova senha.');
stepBox(4, 'Clique em Entrar', 'Apos autenticar, voce sera redirecionado ao Dashboard conforme seu perfil.');

infoBox('DICA: Caso esqueca sua senha, entre em contato com o administrador do sistema para redefinicao.', ORANGE);

sectionHeader('Troca de Senha Obrigatoria');
bodyText('Na primeira vez que um novo usuario acessa o sistema, e obrigatorio criar uma senha pessoal. O sistema nao permite acesso sem essa etapa de seguranca.');
bulletList([
  'A senha deve ter no minimo 6 caracteres',
  'Nao compartilhe sua senha com outras pessoas',
  'Cada usuario tem permissoes unicas de acordo com seu perfil',
  'O sistema bloqueia automaticamente em caso de senha incorreta',
]);

// ────────────────────────────────────────────────────────────────────────────
// CAP 2 — DASHBOARD
// ────────────────────────────────────────────────────────────────────────────
newSection('2. Dashboard — Visao Geral', 'Painel principal com indicadores em tempo real');

addScreenshot('02-dashboard.jpg', 'Figura 2 — Dashboard principal com KPIs e grafico de vendas');

sectionHeader('O que voce ve no Dashboard');
bodyText('O Dashboard e a primeira tela apos o login. Ele exibe os principais indicadores de desempenho (KPIs) da rede ou da sua unidade, dependendo do seu perfil de acesso.');

bulletList([
  'VENDAS HOJE — Total de vendas realizadas no dia',
  'FATURAMENTO — Valor total faturado no periodo selecionado',
  'TRANSACOES — Quantidade de vendas + ordens de servico',
  'TICKET MEDIO — Valor medio por transacao confirmada',
  'LOJA LIDER — Unidade com maior faturamento no periodo',
  'ALERTAS — Itens com estoque abaixo do minimo',
]);

sectionHeader('Filtros de Periodo');
bodyText('Use os botoes de periodo no topo para filtrar os dados:');
bulletList([
  'Hoje — Dados apenas do dia atual',
  '7 dias — Ultima semana',
  '30 dias — Ultimo mes corrido',
  'Mes atual — Do dia 1 ate hoje',
  'Periodo — Escolha um intervalo personalizado de datas',
]);

sectionHeader('Seletor de Loja (Topbar)');
bodyText('No canto superior direito ha um seletor de loja. Administradores podem alternar entre "Visao Consolidada" (todos os CNPJs) ou selecionar uma loja especifica para ver os dados apenas daquela unidade.');

infoBox('O grafico de Movimentacao de Vendas mostra a evolucao diaria no periodo selecionado. Vendas e Ordens de Servico sao exibidas em barras separadas.', GREEN);

// ────────────────────────────────────────────────────────────────────────────
// CAP 3 — LOJAS E GRUPOS
// ────────────────────────────────────────────────────────────────────────────
newSection('3. Rede de Franquias', 'Gestao de Grupos e Lojas');

addScreenshot('14-lojas.jpg', 'Figura 3 — Pagina de Lojas com visao em cards e indicadores de status');

sectionHeader('Estrutura da Rede');
bodyText('O sistema organiza a rede de franquias em dois niveis:');
bulletList([
  'GRUPO — Representa uma franqueada (ex: "Tecle Motos"). Cada grupo pode ter multiplas lojas.',
  'LOJA — Unidade fisica de atendimento, vinculada a um grupo e com CNPJ proprio.',
]);

sectionHeader('Como Cadastrar uma Nova Loja');
stepBox(1, 'Acesse Rede de Franquias > Lojas', 'No menu lateral, clique em "Rede de Franquias" e depois em "Lojas".');
stepBox(2, 'Clique em "+ Nova Loja"', 'O botao laranja no canto superior direito abre o formulario de cadastro.');
stepBox(3, 'Preencha os dados', 'Nome fantasia, CNPJ, endereco, grupo de pertencimento e informacoes de contato.');
stepBox(4, 'Salve', 'Clique em "Salvar". A loja ficara ativa imediatamente.');

sectionHeader('Detalhes da Loja');
bodyText('Cada card de loja exibe: nome, CNPJ, grupo, quantidade de usuarios e status (Ativa/Inativa). Clique em "Detalhes" para ver o historico completo e transferencias de estoque.');

infoBox('Lojas com CNPJ "Pendente" precisam ter o numero de CNPJ cadastrado para emissao de notas fiscais.', ORANGE);

// ────────────────────────────────────────────────────────────────────────────
// CAP 4 — PRODUTOS E SERVICOS
// ────────────────────────────────────────────────────────────────────────────
newSection('4. Logistica — Produtos e Servicos', 'Catalogo de motos, pecas e servicos');

addScreenshot('05-produtos.jpg', 'Figura 4 — Lista de produtos com custo medio e preco de venda calculados automaticamente');

sectionHeader('Tipos de Produto');
bulletList([
  'MOTO — Motocicleta ou scooter eletrico. Gera garantia automatica na venda.',
  'PECA — Componentes e acessorios. Controle de estoque por quantidade.',
  'SERVICO — Servicos de manutencao. Exibidos nas Ordens de Servico.',
]);

sectionHeader('Custo Medio Ponderado');
bodyText('O sistema calcula automaticamente o custo medio de cada produto com base nos Pedidos de Compra confirmados. O preco de venda e calculado aplicando a margem de lucro configurada sobre o custo medio.');

infoBox('Formula: Preco de Venda = Custo Medio x (1 + Margem%). A margem e configurada em Configuracoes > Parametros.', ORANGE);

sectionHeader('Como Cadastrar um Produto');
stepBox(1, 'Va em Logistica > Produtos', 'No menu lateral, expanda "Logistica" e clique em "Produtos".');
stepBox(2, 'Clique em "+ Novo Produto"', 'Abre o formulario de cadastro.');
stepBox(3, 'Preencha Nome, Codigo e Tipo', 'Selecione o tipo (Moto, Peca ou Servico) e informe o codigo interno.');
stepBox(4, 'Defina a Margem', 'A margem padrao vem das Configuracoes. Voce pode ajustar por produto.');
stepBox(5, 'Dados Fiscais (opcional)', 'NCM, CFOP, CST/CSOSN, aliquotas de ICMS, IPI, PIS e COFINS.');

sectionHeader('Importacao em Planilha');
bodyText('Para importar multiplos produtos de uma vez, clique em "Importar Planilha" e siga o modelo de XLSX disponivel para download. O sistema vincula automaticamente os produtos ao estoque de cada loja.');

// ────────────────────────────────────────────────────────────────────────────
// CAP 5 — ESTOQUE E PEDIDOS
// ────────────────────────────────────────────────────────────────────────────
newSection('5. Estoque e Pedidos de Compra', 'Controle de inventario e entrada de mercadoria');

addScreenshot('06-estoque.jpg', 'Figura 5 — Estoque consolidado com visao por empresa, custo e valor de venda');

sectionHeader('Visao Gerencial do Estoque');
bodyText('A pagina de Estoque oferece duas visualizacoes:');
bulletList([
  'GERENCIAL — Agrupado por modelo, mostrando custo medio e quantidade total por empresa.',
  'UNITARIA — Por chassi/unidade individual, permitindo rastrear cada moto ou peca.',
]);

bodyText('Administradores veem o estoque consolidado de todas as lojas. Gerentes e vendedores veem apenas o estoque da sua loja.');

addScreenshot('15-pedidos-compra.jpg', 'Figura 6 — Pedidos de Compra com status de aprovacao e confirmacao');

sectionHeader('Pedido de Compra');
bodyText('Todo entrada de estoque deve ser feita atraves de um Pedido de Compra. O fluxo e:');
stepBox(1, 'Criar Pedido', 'Informe o fornecedor, produtos, quantidades e valores unitarios de compra.');
stepBox(2, 'Aprovacao', 'O pedido fica "Pendente" ate um administrador aprovar.');
stepBox(3, 'Confirmacao de Entrada', 'Ao confirmar a entrada da mercadoria, o estoque e atualizado e o custo medio recalculado automaticamente.');
stepBox(4, 'Conta a Pagar Gerada', 'O sistema cria automaticamente uma Conta a Pagar no modulo Financeiro com os dados do pedido.');

sectionHeader('Auditoria de Estoque');
bodyText('Toda movimentacao de estoque e registrada automaticamente com: data/hora, usuario responsavel, operacao realizada (entrada/saida/transferencia) e quantidades anteriores e posteriores.');

// ────────────────────────────────────────────────────────────────────────────
// CAP 6 — VENDAS
// ────────────────────────────────────────────────────────────────────────────
newSection('6. Modulo de Vendas', 'Registro e acompanhamento de vendas');

addScreenshot('03-vendas.jpg', 'Figura 7 — Tela de Vendas com lista e botao para nova venda');

sectionHeader('Fluxo de uma Venda');
stepBox(1, 'Selecionar Cliente', 'Busque ou cadastre o cliente. O sistema valida CPF/CNPJ automaticamente.');
stepBox(2, 'Escolher Loja', 'Selecione a loja que esta realizando a venda. O estoque exibido e filtrado automaticamente.');
stepBox(3, 'Adicionar Produtos', 'Apenas produtos com estoque disponivel na loja selecionada aparecem para selecao.');
stepBox(4, 'Aplicar Desconto (opcional)', 'O desconto maximo permitido e configuravel por tipo de produto. Gerentes tem limite dobrado.');
stepBox(5, 'Forma de Pagamento', 'Selecione: A Vista, Parcelado, Financiamento ou Consorcio.');
stepBox(6, 'Confirmar a Venda', 'Ao confirmar, o sistema cria automaticamente: Conta a Receber, Garantia (se for moto) e Comissao para o vendedor.');

sectionHeader('Tipo: Orcamento vs Venda');
bodyText('Voce pode salvar uma venda como ORCAMENTO para enviar ao cliente sem confirmar o estoque. Ao converter para VENDA, o estoque e baixado e os registros financeiros sao gerados.');

infoBox('Vendas de motos geram automaticamente 4 garantias: Geral (12 meses), Motor (6 meses), Modulo (6 meses) e Bateria (6 meses).', GREEN);

sectionHeader('Confirmacao Financeira');
bodyText('Vendas com pagamento a prazo precisam de confirmacao financeira pelo modulo Financeiro. Ate a confirmacao, a venda fica marcada como "pendente financeiro".');

// ────────────────────────────────────────────────────────────────────────────
// CAP 7 — CLIENTES E FORNECEDORES
// ────────────────────────────────────────────────────────────────────────────
newSection('7. Clientes e Fornecedores (CRM)', 'Gestao de relacionamento com clientes e parceiros');

addScreenshot('04-clientes.jpg', 'Figura 8 — Lista de Clientes com busca e botao de novo cliente');
addScreenshot('13-fornecedores.jpg', 'Figura 9 — CRM de Fornecedores com timeline de interacoes');

sectionHeader('Cadastro de Clientes');
bodyText('O cadastro de cliente e necessario antes de realizar qualquer venda. Campos principais:');
bulletList([
  'Nome completo ou razao social',
  'CPF ou CNPJ (com validacao automatica)',
  'Telefone e e-mail para contato',
  'Endereco completo',
  'Observacoes internas',
]);

sectionHeader('Historico de Interacoes (CRM)');
bodyText('Cada cliente e fornecedor possui um historico de interacoes (timeline). Voce pode registrar:');
bulletList([
  'Ligacoes e visitas realizadas',
  'E-mails enviados',
  'Negociacoes em andamento',
  'Follow-ups agendados',
  'Mensagens WhatsApp disparadas',
]);

sectionHeader('Botao WhatsApp');
bodyText('Na lista de clientes e fornecedores ha um botao de WhatsApp que abre diretamente uma conversa com a mensagem pre-preenchida no aplicativo WhatsApp. Nenhuma integracao de API e necessaria.');

infoBox('SEGURANCA: Clientes com vendas ou ordens de servico vinculadas NAO podem ser excluidos. O sistema avisa e bloqueia a exclusao.', ORANGE);

// ────────────────────────────────────────────────────────────────────────────
// CAP 8 — ORDENS DE SERVICO
// ────────────────────────────────────────────────────────────────────────────
newSection('8. Ordens de Servico', 'Gestao de manutencao e atendimentos tecnicos');

addScreenshot('07-os.jpg', 'Figura 10 — Lista de Ordens de Servico com status e botao nova OS');

sectionHeader('O que e uma Ordem de Servico?');
bodyText('Uma Ordem de Servico (OS) registra um atendimento tecnico: revisao, manutencao, garantia ou reparo. Ela e vinculada a um cliente, um veiculo e pode incluir pecas e servicos.');

sectionHeader('Fluxo da OS');
stepBox(1, 'Criar OS', 'Informe o cliente, descricao do veiculo (modelo, ano, placa ou chassi) e os servicos a executar.');
stepBox(2, 'Adicionar Itens', 'Selecione os servicos (com valor configurado) e as pecas necessarias do estoque.');
stepBox(3, 'Em Andamento', 'O tecnico responsavel atualiza o status conforme avanca no servico.');
stepBox(4, 'Confirmar OS', 'Ao confirmar, o sistema gera automaticamente uma Conta a Receber e a comissao do tecnico.');

sectionHeader('Status da OS');
bulletList([
  'ABERTA — Aguardando inicio do atendimento',
  'EM ANDAMENTO — Tecnico trabalhando na moto',
  'AGUARDANDO PECAS — Peca em falta ou pedido em transito',
  'CONCLUIDA — Servico finalizado, aguardando retirada',
  'CANCELADA — OS encerrada sem execucao',
]);

bodyText('O relatorio da OS inclui o detalhamento de todos os servicos e pecas utilizados, com os valores individuais e o total.');

// ────────────────────────────────────────────────────────────────────────────
// CAP 9 — GARANTIAS E COMISSOES
// ────────────────────────────────────────────────────────────────────────────
newSection('9. Garantias e Comissoes', 'Controle de garantias e remuneracao variavel');

addScreenshot('16-garantias.jpg', 'Figura 11 — Modulo de Garantias com status e datas de vencimento');
addScreenshot('18-comissoes.jpg', 'Figura 12 — Modulo de Comissoes com filtros por mes, colaborador e status');

sectionHeader('Garantias — Como Funciona');
bodyText('Ao confirmar uma venda de MOTO, o sistema cria automaticamente 4 registros de garantia:');
bulletList([
  'Garantia Geral — 12 meses a partir da data da venda',
  'Garantia do Motor — 6 meses',
  'Garantia do Modulo (eletronico) — 6 meses',
  'Garantia da Bateria — 6 meses',
]);

bodyText('As garantias ficam vinculadas ao cliente e ao numero de chassi/serie da moto. E possivel gerar garantias retroativas para vendas ja realizadas atraves do painel de Garantias.');

sectionHeader('Alertas de Vencimento');
bodyText('O Dashboard exibe alertas de garantias proximas ao vencimento (em 5 dias). O sistema permite filtrar por: Total, Ativas, Vencendo em 5 dias e Expiradas.');

sectionHeader('Comissoes — Como Funciona');
bodyText('O sistema calcula automaticamente as comissoes de vendedores e tecnicos com base nas configuracoes globais:');
bulletList([
  'Comissao do Vendedor sobre Moto — percentual configuravel (padrao 1%)',
  'Comissao do Tecnico — percentual sobre OS concluidas (padrao 25%)',
  'Periodo de comissao — Mensal ou Semanal',
]);

bodyText('Os gerentes podem marcar comissoes como pagas. O filtro permite visualizar por mes, colaborador, tipo (venda/OS) e status (pendente/pago).');

// ────────────────────────────────────────────────────────────────────────────
// CAP 10 — FINANCEIRO
// ────────────────────────────────────────────────────────────────────────────
newSection('10. Financeiro — Hub Completo', 'Gestao financeira integrada da rede');

addScreenshot('08-financeiro.jpg', 'Figura 13 — Hub Financeiro com abas: Visao Geral, Por CNPJ, A Pagar, A Receber, Compras, Fiscal, Conciliacao, Fornecedores');

sectionHeader('Visao Geral Financeira');
bodyText('A tela inicial do Financeiro exibe o SALDO LIQUIDO = Total a Receber (em aberto) menos Total a Pagar (em aberto). As secoes abaixo detalham:');
bulletList([
  'Contas a Pagar — Em aberto, Vencidas, Vencendo em 7 dias, Pagas este mes',
  'Contas a Receber — Em aberto, Vencidas, Vencendo em 7 dias, Recebidas este mes',
]);

sectionHeader('Abas do Modulo Financeiro');
bulletList([
  'Visao Geral — KPIs consolidados do grupo/rede',
  'Por CNPJ — Dashboard financeiro separado por empresa/loja',
  'A Pagar — Lista de contas a pagar com parcelas e datas de vencimento',
  'A Receber — Contas a receber geradas automaticamente pelas vendas e OS',
  'Compras — Pedidos de compra e contas a pagar de origem COMPRA',
  'Fiscal — Notas fiscais de entrada e saida',
  'Conciliacao — Reconciliacao bancaria com importacao de OFX',
  'Fornecedores — CRM de fornecedores com historico',
]);

sectionHeader('Contas a Pagar');
bodyText('As contas a pagar sao criadas de duas formas:');
bulletList([
  'AUTOMATICA — Ao confirmar um Pedido de Compra (origem COMPRA)',
  'MANUAL — Avulsa, para despesas diversas (origem AVULSA)',
]);
bodyText('Cada conta pode ter multiplas parcelas. O pagamento de cada parcela e registrado individualmente, gerando o Historico de Pagamentos.');

sectionHeader('Contas a Receber');
bodyText('Geradas automaticamente ao confirmar uma Venda ou Ordem de Servico. O sistema identifica a forma de pagamento e cria as parcelas correspondentes. Pagamentos recebidos sao registrados individualmente.');

sectionHeader('Conciliacao Bancaria');
bodyText('Importe extratos bancarios em formato OFX. O sistema analisa automaticamente os lancamentos e sugere correspondencias com os pagamentos e recebimentos registrados no ERP. A conciliacao pode ser feita manualmente ou de forma automatica pelo sistema.');

// ────────────────────────────────────────────────────────────────────────────
// CAP 11 — NOTAS FISCAIS
// ────────────────────────────────────────────────────────────────────────────
newSection('11. Notas Fiscais', 'Controle fiscal de entradas e saidas');

addScreenshot('19-notas-fiscais.jpg', 'Figura 14 — Modulo de Notas Fiscais com filtros por tipo e status');

sectionHeader('Tipos de Nota Fiscal');
bulletList([
  'ENTRADA — NF de compra recebida de fornecedores (importacao de mercadoria)',
  'SAIDA — NF emitida para clientes nas vendas',
]);

sectionHeader('Campos Fiscais dos Produtos');
bodyText('Cada produto pode ter configurados seus dados fiscais:');
bulletList([
  'NCM — Nomenclatura Comum do Mercosul',
  'CFOP — Codigo Fiscal de Operacoes e Prestacoes',
  'CST/CSOSN — Codigo de Situacao Tributaria',
  'Aliquotas — ICMS, IPI, PIS e COFINS',
  'Unidade de Medida — UN, KG, L, M, etc.',
]);

bodyText('O modulo de Notas Fiscais serve para registro e controle. Para emissao de NF-e, integre com o seu sistema de emissao fiscal (SEFAZ).');

// ────────────────────────────────────────────────────────────────────────────
// CAP 12 — RANKING
// ────────────────────────────────────────────────────────────────────────────
newSection('12. Ranking de Vendas', 'Desempenho de produtos e servicos');

addScreenshot('17-ranking.jpg', 'Figura 15 — Ranking de produtos e servicos mais vendidos no periodo');

sectionHeader('Como usar o Ranking');
bodyText('O Ranking exibe os 20 produtos e servicos mais (ou menos) vendidos no periodo selecionado. Use os filtros:');
bulletList([
  'Periodo — Ultimos 30, 60 ou 90 dias, ou periodo personalizado',
  'Ordenacao — Mais vendidos ou Menos vendidos',
  'Aba Produtos — Ranking de motos e pecas',
  'Aba Servicos — Ranking de servicos executados',
]);

bodyText('Os cards no topo mostram o PRODUTO MAIS VENDIDO, PRODUTO MENOS VENDIDO, SERVICO MAIS EXECUTADO e SERVICO MENOS EXECUTADO do periodo. Util para tomar decisoes de estoque e pricing.');

// ────────────────────────────────────────────────────────────────────────────
// CAP 13 — WHATSAPP CRM
// ────────────────────────────────────────────────────────────────────────────
newSection('13. WhatsApp CRM', 'Comunicacao em massa e automatica via WhatsApp');

addScreenshot('09-whatsapp.jpg', 'Figura 16 — WhatsApp CRM com abas Disparar, Templates e Historico');

sectionHeader('O que e o WhatsApp CRM');
bodyText('O modulo de WhatsApp CRM permite disparar mensagens personalizadas para clientes, fornecedores e vendedores atraves de links wa.me que abrem diretamente o WhatsApp — sem necessidade de API paga ou integracao externa.');

sectionHeader('Tipos de Destinatarios');
bulletList([
  'Vendedores — Equipe de vendas da rede',
  'Clientes — Clientes cadastrados com telefone',
  'Fornecedores — Parceiros comerciais',
  'Avulso — Qualquer numero nao cadastrado',
]);

sectionHeader('Templates de Mensagem');
bodyText('O sistema possui 8 templates pre-configurados:');
bulletList([
  'MOTIVACIONAL VENDEDOR — Mensagem de incentivo para a equipe',
  'FOLLOW-UP CLIENTE — Acompanhamento pos-venda',
  'FOLLOW-UP FORNECEDOR — Contato com parceiros',
  'COBRANCA — Lembrete de parcela em atraso',
  'BOAS-VINDAS — Recepcao de novo cliente',
  'CONFIRMACAO VENDA — Confirmacao de compra',
  'AVISO GARANTIA — Alerta de garantia proxima ao vencimento',
  'PERSONALIZADO — Mensagem livre',
]);

sectionHeader('Disparo Automatico');
bodyText('Toda segunda a sexta-feira, as 8h (horario de Brasilia), o sistema envia automaticamente mensagens motivacionais para todos os vendedores ativos que possuem telefone cadastrado.');

stepBox(1, 'Selecione os destinatarios', 'Marque os contatos que devem receber a mensagem.');
stepBox(2, 'Escolha um template (opcional)', 'Selecione um template ou escreva uma mensagem personalizada.');
stepBox(3, 'Clique em "Gerar Links"', 'O sistema cria um link wa.me para cada destinatario selecionado.');
stepBox(4, 'Abra os links', 'Cada link abre o WhatsApp com a mensagem pre-preenchida. Clique em "Enviar" no WhatsApp.');

// ────────────────────────────────────────────────────────────────────────────
// CAP 14 — RELATORIOS
// ────────────────────────────────────────────────────────────────────────────
newSection('14. Relatorios Automaticos', 'Envio de relatorios por e-mail e disparo manual');

addScreenshot('10-relatorios.jpg', 'Figura 17 — Pagina de Relatorios com configuracao de destinatarios e disparo manual');

sectionHeader('Como Funcionam os Relatorios');
bodyText('O sistema envia automaticamente relatorios em Excel (XLSX) por e-mail. Existem 3 tipos de relatorio, cada um destinado a um perfil diferente:');
bulletList([
  'Relatorio Geral — Para ADMIN_GERAL. Inclui financeiro, comercial, estoque e alertas.',
  'Relatorio Financeiro — Para ADMIN_FINANCEIRO. Foca em contas a pagar/receber e fluxo de caixa.',
  'Relatorio Comercial — Para DONO_LOJA, GERENTE e ADMIN_REDE. Foca em vendas e desempenho.',
]);

sectionHeader('Agendamento Automatico');
bulletList([
  'Semanal — Toda segunda-feira as 7h00 (horario de Brasilia)',
  'Mensal — Todo dia 1 de cada mes as 7h30 (horario de Brasilia)',
]);

sectionHeader('Disparo Manual');
bodyText('Voce pode disparar um relatorio a qualquer momento:');
stepBox(1, 'Selecione o tipo', 'Todos, Geral, Financeiro ou Comercial.');
stepBox(2, 'Selecione o periodo', 'Semanal (ultimos 7 dias) ou Mensal (ultimo mes).');
stepBox(3, 'Clique em "Enviar Relatorio"', 'O sistema envia imediatamente para os destinatarios configurados.');

infoBox('Para configurar os destinatarios de cada tipo de relatorio, e necessario configurar o SMTP no servidor (SMTP_USER e SMTP_PASS). Entre em contato com o administrador tecnico.', ORANGE);

// ────────────────────────────────────────────────────────────────────────────
// CAP 15 — CONFIGURACOES
// ────────────────────────────────────────────────────────────────────────────
newSection('15. Configuracoes e Usuarios', 'Administracao do sistema');

addScreenshot('11-configuracoes.jpg', 'Figura 18 — Configuracoes com parametros de comissao, desconto e margens');
addScreenshot('12-usuarios.jpg', 'Figura 19 — Gerenciamento de usuarios do sistema');

sectionHeader('Parametros do Sistema');
bodyText('A pagina Configuracoes > Parametros permite ajustar as regras de negocio globais:');

bulletList([
  'Comissao do Vendedor sobre Moto (%) — Percentual aplicado ao valor de venda da moto',
  'Comissao do Tecnico (%) — Percentual sobre o valor total da OS',
  'Periodo de Comissao — Mensal ou Semanal',
  'Habilitar Comissao sobre Pecas — Ativa/desativa comissao em vendas de pecas',
  'Desconto Max. Moto (%) — Limite de desconto para vendedores em motos',
  'Desconto Max. Peca (%) — Limite de desconto em pecas',
  'Desconto Max. Servico (%) — Limite de desconto em servicos',
  'Desconto Max. OS (%) — Limite de desconto em ordens de servico',
  'Margem Lucro Moto (%) — Margem aplicada sobre o custo para calcular preco',
  'Margem Lucro Peca (%) — Idem para pecas',
]);

infoBox('ATENCAO: Gerentes tem o DOBRO do limite de desconto configurado. Ex: se o limite e 10%, o gerente pode dar ate 20%.', ORANGE);

sectionHeader('Botao "Recalcular Precos dos Produtos"');
bodyText('Ao alterar a margem de lucro, clique neste botao para atualizar o preco de venda de todos os produtos cadastrados com base no novo percentual. Esta operacao nao afeta vendas ja realizadas.');

sectionHeader('Historico de Alteracoes');
bodyText('Clique em "Ver Historico" para ver todas as alteracoes de configuracao: data/hora, usuario, parametro alterado, valor anterior e valor novo.');

sectionHeader('Gestao de Usuarios');
stepBox(1, 'Acesse Configuracoes > Usuarios', 'Lista todos os usuarios do sistema com perfil, loja e status.');
stepBox(2, 'Clique em "+ Novo Usuario"', 'Preencha nome, e-mail, perfil e (quando aplicavel) a loja ou grupo.');
stepBox(3, 'Defina o Perfil', 'Selecione o papel do usuario (veja Cap. 16 para detalhes).');
stepBox(4, 'Senha Temporaria', 'O sistema define uma senha temporaria. O usuario sera forcado a troca-la no primeiro acesso.');

// ────────────────────────────────────────────────────────────────────────────
// CAP 16 — PERFIS RBAC
// ────────────────────────────────────────────────────────────────────────────
newSection('16. Perfis de Acesso (RBAC)', 'Controle granular de permissoes por papel');

sectionHeader('Os 7 Perfis do Sistema');
roleTable([
  ['Administrador Geral', 'ADMIN_GERAL', 'Acesso total ao sistema, sem vinculo com loja/grupo'],
  ['Administrador Financeiro', 'ADMIN_FINANCEIRO', 'Comercial + Financeiro completo, sem vinculo com loja'],
  ['Admin de Rede', 'ADMIN_REDE', 'Gestao de toda a rede de franquias, vinculado a um grupo'],
  ['Dono da Loja', 'DONO_LOJA', 'Gestao completa de todas as lojas do seu grupo'],
  ['Gerente de Loja', 'GERENTE_LOJA', 'Gestao operacional de uma loja especifica'],
  ['Vendedor', 'VENDEDOR', 'Clientes, Vendas, OS, Garantias, Comissoes da sua loja'],
  ['Tecnico', 'TECNICO', 'Dashboard Tecnico, Estoque, OS e Garantias da sua loja'],
]);

sectionHeader('O que cada perfil ve no menu');
bodyText('ADMIN_GERAL e ADMIN_FINANCEIRO — Sem vinculo com loja: veem dados de toda a rede.');
bodyText('ADMIN_REDE e DONO_LOJA — Vinculados a um Grupo: veem todos os dados das lojas do grupo.');
bodyText('GERENTE_LOJA e VENDEDOR — Vinculados a uma Loja: veem apenas os dados daquela unidade.');
bodyText('TECNICO — Menu reduzido: Dashboard, Estoque, Ordens de Servico, Garantias e Comissoes.');

infoBox('O ADMIN_GERAL (admin@teclemotos.com) nunca tem lojaId nem grupoId. E o superusuario da plataforma e ve todos os dados consolidados.', ORANGE);

sectionHeader('Permissoes por Modulo');
bulletList([
  'Configuracoes do Sistema — Apenas ADMIN_GERAL',
  'Grupos e Lojas — ADMIN_GERAL e ADMIN_REDE',
  'Usuarios — ADMIN_GERAL, DONO_LOJA e GERENTE_LOJA (limitado a sua loja)',
  'Produtos — ADMIN_GERAL, ADMIN_REDE e DONO_LOJA',
  'Estoque (gerencial) — ADMIN_GERAL, ADMIN_REDE, DONO_LOJA e GERENTE_LOJA',
  'Financeiro completo — ADMIN_GERAL e ADMIN_FINANCEIRO',
  'Relatorios — ADMIN_GERAL e ADMIN_FINANCEIRO',
  'WhatsApp CRM — Todos exceto TECNICO e VENDEDOR',
]);

// ────────────────────────────────────────────────────────────────────────────
// CAP 17 — FAQ
// ────────────────────────────────────────────────────────────────────────────
newSection('17. Perguntas Frequentes (FAQ)', 'Resolucao rapida de duvidas comuns');

const faqs = [
  ['Esqueci minha senha. Como recuperar?',
   'Entre em contato com o administrador do sistema (ADMIN_GERAL ou GERENTE da sua loja). Ele pode redefinir sua senha e voce recebera uma senha temporaria para o proximo acesso.'],
  ['A garantia nao foi gerada apos uma venda de moto. O que fazer?',
   'Acesse Vendas, selecione a venda e clique em "Gerar Garantias Retroativas". O sistema reprocessa a geracao das 4 garantias para aquela venda.'],
  ['Como transferir estoque entre lojas do mesmo grupo?',
   'Acesse Estoque, selecione a loja de origem, clique em "Transferir" no item desejado e informe a loja de destino e quantidade. Apenas lojas do mesmo grupo podem trocar estoque.'],
  ['A conta a receber nao foi gerada apos confirmar uma venda.',
   'Acesse Financeiro > A Receber > "Gerar Retroativas". O sistema reprocessa as contas para vendas que nao tiveram o registro gerado.'],
  ['Como faço para que os relatorios cheguem por e-mail?',
   'Confirme com o administrador tecnico que as variaveis SMTP_USER e SMTP_PASS estao configuradas no servidor. Sem isso, o envio de e-mail nao funciona.'],
  ['O dashboard esta mostrando dados zerados. E normal?',
   'Sim, se o sistema for recentemente implantado e nao houver vendas ou OS registradas, todos os KPIs aparecem zerados. Isso e esperado.'],
  ['Como ver o extrato de estoque por chassi (unitario)?',
   'Acesse Estoque e procure a secao "Visao Unitaria" ou "Por Chassi". Voce pode buscar por numero de chassi, modelo ou loja.'],
  ['Posso excluir um cliente que ja tem venda registrada?',
   'Nao. O sistema bloqueia a exclusao de clientes com vendas, OS ou outras dependencias vinculadas. Para "inativar" um cliente, use o campo de observacoes.'],
];

faqs.forEach(([q, a]) => {
  const y = doc.y;
  if (y > doc.page.height - 150) { doc.addPage(); doc.y = 50; }
  doc.rect(50, doc.y, pageW(), 18).fill('#1e293b');
  doc.rect(50, doc.y, 4, 18).fill('#3b82f6');
  doc.fontSize(9).fillColor(WHITE).font('Helvetica-Bold').text(`P: ${q}`, 60, doc.y + 4, { width: pageW() - 20 });
  doc.y += 22;
  doc.fontSize(9).fillColor('#d4d4d8').font('Helvetica').text(`R: ${a}`, 54, doc.y, { width: pageW() - 10, lineGap: 2 });
  doc.moveDown(0.8);
});

// ────────────────────────────────────────────────────────────────────────────
// PAGINA FINAL
// ────────────────────────────────────────────────────────────────────────────
doc.addPage();
doc.rect(0, 0, doc.page.width, doc.page.height).fill('#09090b');
doc.rect(0, 0, doc.page.width, 8).fill(ORANGE);
doc.y = 200;
doc.fontSize(28).fillColor(WHITE).font('Helvetica-Bold').text('TM Imports', { align: 'center' });
doc.fontSize(16).fillColor(ORANGE).text('Tecle Motos', { align: 'center' });
doc.moveDown(1);
doc.rect(150, doc.y, pageW() - 100, 2).fill(ORANGE);
doc.moveDown(1.5);
doc.fontSize(13).fillColor('#a1a1aa').font('Helvetica')
   .text('Sistema Integrado de Gestao Multi-Empresa', { align: 'center' });
doc.moveDown(0.5);
doc.fontSize(10).fillColor(GRAY)
   .text('Manual do Sistema — Versao 1.0', { align: 'center' });
doc.moveDown(3);
doc.fontSize(10).fillColor(GRAY)
   .text('Para suporte tecnico, entre em contato com o administrador da plataforma.', { align: 'center' });
doc.moveDown(0.5);
doc.fontSize(10).fillColor(ORANGE)
   .text('admin@teclemotos.com', { align: 'center' });

// Numeros de pagina
const range = doc.bufferedPageRange();
for (let i = range.start; i < range.start + range.count; i++) {
  doc.switchToPage(i);
  if (i > 0) {
    doc.fontSize(8).fillColor(GRAY)
       .text(`Pagina ${i} de ${range.count - 1} — TM Imports / Tecle Motos`, 50, doc.page.height - 35, { align: 'center', width: pageW() });
  }
}

doc.end();
console.log('PDF gerado em:', OUTPUT);
