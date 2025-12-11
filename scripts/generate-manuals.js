const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function createFranqueadoManual() {
  const doc = new PDFDocument({ margin: 50 });
  const filePath = path.join(uploadsDir, 'Manual_Franqueado_TecleMotos.pdf');
  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(24).fillColor('#FF6B35').text('Manual do Franqueado', { align: 'center' });
  doc.fontSize(16).fillColor('#666').text('Tecle Motos - Sistema ERP', { align: 'center' });
  doc.moveDown(2);

  doc.fontSize(12).fillColor('#333');
  doc.text('Bem-vindo ao sistema de gestão Tecle Motos! Este manual vai ajudá-lo a usar todas as funcionalidades disponíveis para sua franquia.');
  doc.moveDown(2);

  doc.fontSize(18).fillColor('#FF6B35').text('1. Acesso ao Sistema');
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#333');
  doc.text('Para acessar o sistema, use o email e senha fornecidos pelo administrador da TM Imports.');
  doc.text('Após o primeiro acesso, recomendamos alterar sua senha.');
  doc.moveDown(1.5);

  doc.fontSize(18).fillColor('#FF6B35').text('2. Dashboard');
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#333');
  doc.text('O Dashboard mostra um resumo da sua loja:');
  doc.moveDown(0.3);
  doc.text('   • Vendas do Mês: Total vendido no período atual');
  doc.text('   • Ordens de Serviço: Quantidade de OS abertas');
  doc.text('   • Clientes Cadastrados: Total de clientes da sua loja');
  doc.text('   • Gráfico de Vendas: Evolução das vendas nos últimos 6 meses');
  doc.moveDown(1.5);

  doc.fontSize(18).fillColor('#FF6B35').text('3. Vendas');
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#333');
  doc.text('Para registrar uma venda:');
  doc.moveDown(0.3);
  doc.text('   1. Clique em "Vendas" no menu lateral');
  doc.text('   2. Clique no botão "Nova Venda"');
  doc.text('   3. Selecione o cliente (ou cadastre um novo)');
  doc.text('   4. Adicione os produtos desejados');
  doc.text('   5. Escolha a forma de pagamento');
  doc.text('   6. Clique em "Salvar"');
  doc.moveDown(0.5);
  doc.text('A venda ficará com status PENDENTE até ser aprovada pelo gestor.');
  doc.moveDown(1.5);

  doc.fontSize(18).fillColor('#FF6B35').text('4. Ordens de Serviço');
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#333');
  doc.text('Para criar uma ordem de serviço:');
  doc.moveDown(0.3);
  doc.text('   1. Acesse "Ordens de Serviço" no menu');
  doc.text('   2. Clique em "Nova OS"');
  doc.text('   3. Selecione o cliente e o veículo');
  doc.text('   4. Descreva o problema/serviço solicitado');
  doc.text('   5. Adicione peças e mão de obra se necessário');
  doc.text('   6. Salve a OS');
  doc.moveDown(1.5);

  doc.fontSize(18).fillColor('#FF6B35').text('5. Estoque da Loja');
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#333');
  doc.text('Em "Estoque" você pode visualizar todos os produtos disponíveis na sua loja.');
  doc.text('O estoque é atualizado automaticamente quando:');
  doc.moveDown(0.3);
  doc.text('   • Uma venda é concluída (diminui o estoque)');
  doc.text('   • Você recebe produtos da matriz (aumenta o estoque)');
  doc.moveDown(1.5);

  doc.fontSize(18).fillColor('#FF6B35').text('6. Solicitar Produtos (Importante!)');
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#333');
  doc.text('Para repor o estoque da sua loja, você deve solicitar produtos da matriz:');
  doc.moveDown(0.3);
  doc.text('   1. Acesse "Solicitar Produtos" no menu');
  doc.text('   2. Clique em "Nova Solicitação"');
  doc.text('   3. Selecione os produtos e quantidades desejadas');
  doc.text('   4. Adicione observações se necessário');
  doc.text('   5. Envie a solicitação');
  doc.moveDown(0.5);
  doc.text('Status da solicitação:');
  doc.text('   • PENDENTE: Aguardando análise da TM Imports');
  doc.text('   • APROVADA: A matriz aprovou seu pedido');
  doc.text('   • ENVIADA: Os produtos estão a caminho');
  doc.text('   • RECEBIDA: Você confirmou o recebimento');
  doc.text('   • REJEITADA: A matriz negou a solicitação');
  doc.moveDown(0.5);
  doc.text('Importante: Quando os produtos chegarem, confirme o recebimento no sistema!');
  doc.moveDown(1.5);

  doc.addPage();
  
  doc.fontSize(18).fillColor('#FF6B35').text('7. Clientes');
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#333');
  doc.text('Para cadastrar um novo cliente:');
  doc.moveDown(0.3);
  doc.text('   1. Acesse "Clientes" no menu');
  doc.text('   2. Clique em "Novo Cliente"');
  doc.text('   3. Preencha os dados: Nome, CPF/CNPJ, Telefone, Email, Endereço');
  doc.text('   4. Salve o cadastro');
  doc.moveDown(1.5);

  doc.fontSize(18).fillColor('#FF6B35').text('8. Financeiro');
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#333');
  doc.text('Contas a Receber:');
  doc.text('   • Geradas automaticamente pelas vendas');
  doc.text('   • Você pode dar baixa quando o cliente pagar');
  doc.text('   • Suporta pagamentos parciais');
  doc.moveDown(0.5);
  doc.text('Contas a Pagar:');
  doc.text('   • Cadastre suas despesas (aluguel, energia, etc.)');
  doc.text('   • Acompanhe vencimentos');
  doc.text('   • Registre os pagamentos realizados');
  doc.moveDown(1.5);

  doc.fontSize(18).fillColor('#FF6B35').text('9. Conciliação Bancária');
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#333');
  doc.text('Para controlar suas contas bancárias:');
  doc.moveDown(0.3);
  doc.text('   1. Cadastre suas contas bancárias');
  doc.text('   2. Importe o extrato (arquivo OFX, CSV ou Excel)');
  doc.text('   3. Use a conciliação automática para associar transações');
  doc.text('   4. Concilie manualmente as que não foram identificadas');
  doc.moveDown(1.5);

  doc.fontSize(18).fillColor('#FF6B35').text('10. Dicas Importantes');
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#333');
  doc.text('   • Mantenha o cadastro de clientes sempre atualizado');
  doc.text('   • Solicite produtos com antecedência para não ficar sem estoque');
  doc.text('   • Confirme o recebimento de produtos assim que chegarem');
  doc.text('   • Dê baixa nas contas a receber quando receber pagamentos');
  doc.text('   • Em caso de dúvidas, entre em contato com a TM Imports');
  doc.moveDown(2);

  doc.fontSize(10).fillColor('#888').text('TM Imports / Tecle Motos - Sistema ERP', { align: 'center' });
  doc.text('Suporte: contato@tmimports.com', { align: 'center' });

  doc.end();
  console.log('Manual do Franqueado gerado:', filePath);
  return filePath;
}

function createAdminManual() {
  const doc = new PDFDocument({ margin: 50 });
  const filePath = path.join(uploadsDir, 'Manual_AdminGlobal_TMImports.pdf');
  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(24).fillColor('#FF6B35').text('Manual do Administrador Global', { align: 'center' });
  doc.fontSize(16).fillColor('#666').text('TM Imports - Sistema ERP', { align: 'center' });
  doc.moveDown(2);

  doc.fontSize(12).fillColor('#333');
  doc.text('Este manual apresenta todas as funcionalidades disponíveis para o Administrador Global da TM Imports, responsável pela gestão da matriz e de todas as franquias Tecle Motos.');
  doc.moveDown(2);

  doc.fontSize(18).fillColor('#FF6B35').text('1. Dashboard Global');
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#333');
  doc.text('O Dashboard Global apresenta métricas consolidadas de toda a rede:');
  doc.moveDown(0.3);
  doc.text('   • Total de Vendas: Soma de vendas de todas as franquias');
  doc.text('   • Total de Franquias: Quantidade de lojas na rede');
  doc.text('   • Faturamento: Receita total do período');
  doc.text('   • Solicitações Pendentes: Pedidos de produtos aguardando aprovação');
  doc.text('   • Gráfico de Vendas: Evolução mensal (últimos 6 meses)');
  doc.text('   • Fluxo de Caixa: Entradas vs Saídas com projeção de saldo');
  doc.moveDown(1.5);

  doc.fontSize(18).fillColor('#FF6B35').text('2. Gestão de Franquias');
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#333');
  doc.text('Para cadastrar uma nova franquia:');
  doc.moveDown(0.3);
  doc.text('   1. Acesse "Franquias" no menu');
  doc.text('   2. Clique em "Nova Franquia"');
  doc.text('   3. Preencha os dados da empresa (CNPJ, Razão Social, etc.)');
  doc.text('   4. Preencha os dados da loja principal (endereço, telefone)');
  doc.text('   5. Crie o usuário administrador da franquia');
  doc.text('   6. Clique em "Criar Franquia"');
  doc.moveDown(0.5);
  doc.text('O sistema cria automaticamente: empresa + loja + usuário admin em uma única operação.');
  doc.moveDown(0.5);
  doc.text('Clique em uma franquia para ver detalhes da loja e do administrador.');
  doc.moveDown(1.5);

  doc.fontSize(18).fillColor('#FF6B35').text('3. Produtos / Serviços');
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#333');
  doc.text('Cadastro manual:');
  doc.text('   1. Acesse "Produtos / Serviços"');
  doc.text('   2. Clique em "Novo Produto"');
  doc.text('   3. Preencha os dados e salve');
  doc.moveDown(0.5);
  doc.text('Importação por planilha:');
  doc.text('   1. Na mesma tela, clique em "Importar Planilha"');
  doc.text('   2. Selecione o arquivo Excel ou CSV');
  doc.text('   3. O sistema importa os produtos e cria categorias automaticamente');
  doc.moveDown(1.5);

  doc.fontSize(18).fillColor('#FF6B35').text('4. Estoque Central');
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#333');
  doc.text('O estoque central é o inventário da TM Imports (matriz).');
  doc.text('Todas as franquias solicitam produtos deste estoque.');
  doc.moveDown(0.3);
  doc.text('Para ajustar o estoque:');
  doc.text('   1. Acesse "Estoque Central"');
  doc.text('   2. Localize o produto');
  doc.text('   3. Clique em "Ajustar" para alterar a quantidade');
  doc.moveDown(1.5);

  doc.fontSize(18).fillColor('#FF6B35').text('5. Solicitações de Compra');
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#333');
  doc.text('As franquias enviam solicitações de produtos para a matriz.');
  doc.moveDown(0.3);
  doc.text('Para processar uma solicitação:');
  doc.text('   1. Acesse "Solicitações" no menu');
  doc.text('   2. Visualize os pedidos pendentes');
  doc.text('   3. Para cada solicitação, você pode:');
  doc.text('      • APROVAR: Aceitar o pedido');
  doc.text('      • REJEITAR: Negar o pedido');
  doc.text('      • ENVIAR: Após aprovar, enviar os produtos');
  doc.moveDown(0.5);
  doc.text('Ao clicar em "Enviar", o sistema automaticamente:');
  doc.text('   • Baixa os produtos do estoque central');
  doc.text('   • Adiciona no estoque da loja franqueada');
  doc.moveDown(1.5);

  doc.addPage();

  doc.fontSize(18).fillColor('#FF6B35').text('6. Usuários');
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#333');
  doc.text('Perfis de usuário disponíveis:');
  doc.moveDown(0.3);
  doc.text('   • ADMIN_GLOBAL: Acesso total ao sistema (você)');
  doc.text('   • GESTOR_FRANQUIA: Administra uma loja específica');
  doc.text('   • OPERACIONAL: Acesso limitado (vendas, OS, clientes)');
  doc.moveDown(0.5);
  doc.text('Para gerenciar usuários:');
  doc.text('   1. Acesse "Usuários" no menu');
  doc.text('   2. Visualize todos os usuários do sistema');
  doc.text('   3. Crie novos usuários ou apague existentes');
  doc.moveDown(1.5);

  doc.fontSize(18).fillColor('#FF6B35').text('7. Financeiro Consolidado');
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#333');
  doc.text('Como Admin Global, você tem visão de todo o financeiro:');
  doc.moveDown(0.3);
  doc.text('Contas a Receber:');
  doc.text('   • Lista todas as contas de todas as lojas');
  doc.text('   • Filtro por status (Pendente, Parcial, Pago)');
  doc.text('   • Destaque para contas vencidas');
  doc.text('   • Baixa com suporte a pagamento parcial');
  doc.moveDown(0.5);
  doc.text('Contas a Pagar:');
  doc.text('   • Cadastre despesas da matriz');
  doc.text('   • Categorize por tipo (Aluguel, Energia, Fornecedor, etc.)');
  doc.text('   • Registre pagamentos realizados');
  doc.moveDown(1.5);

  doc.fontSize(18).fillColor('#FF6B35').text('8. Conciliação Bancária');
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#333');
  doc.text('Sistema estilo Conta Azul para controle bancário:');
  doc.moveDown(0.3);
  doc.text('   1. Cadastre as contas bancárias da empresa');
  doc.text('   2. Importe extratos (OFX, CSV, Excel)');
  doc.text('   3. Use "Conciliar Automaticamente" para associar transações');
  doc.text('   4. Concilie manualmente as pendentes');
  doc.moveDown(0.5);
  doc.text('Métricas exibidas:');
  doc.text('   • Total a Receber');
  doc.text('   • Total a Pagar');
  doc.text('   • Saldo Bancário');
  doc.text('   • Transações Pendentes');
  doc.moveDown(1.5);

  doc.fontSize(18).fillColor('#FF6B35').text('9. Logs de Auditoria');
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#333');
  doc.text('O sistema registra todas as ações importantes:');
  doc.moveDown(0.3);
  doc.text('   • Quem criou/alterou cada registro');
  doc.text('   • Data e hora da ação');
  doc.text('   • Dados antes e depois da alteração');
  doc.moveDown(0.5);
  doc.text('Acesse "Logs" no menu para visualizar o histórico completo.');
  doc.moveDown(1.5);

  doc.fontSize(18).fillColor('#FF6B35').text('10. Boas Práticas');
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#333');
  doc.text('   • Mantenha o estoque central sempre atualizado');
  doc.text('   • Processe as solicitações das franquias rapidamente');
  doc.text('   • Monitore o fluxo de caixa regularmente');
  doc.text('   • Faça a conciliação bancária semanalmente');
  doc.text('   • Revise os logs de auditoria periodicamente');
  doc.text('   • Treine os gestores das franquias no uso do sistema');
  doc.moveDown(2);

  doc.fontSize(10).fillColor('#888').text('TM Imports - Sistema ERP Multi-Empresa', { align: 'center' });
  doc.text('Desenvolvido para gestão de motos e scooters elétricas', { align: 'center' });

  doc.end();
  console.log('Manual do Admin Global gerado:', filePath);
  return filePath;
}

console.log('Gerando manuais em PDF...\n');
const franqueadoPath = createFranqueadoManual();
const adminPath = createAdminManual();
console.log('\nManuais gerados com sucesso!');
console.log('Arquivos disponíveis em:');
console.log('  -', franqueadoPath);
console.log('  -', adminPath);
