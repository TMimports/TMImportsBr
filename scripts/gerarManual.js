const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({ 
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 50, right: 50 }
});

const outputPath = path.join(__dirname, '..', 'public', 'manual-tecle-motos.pdf');
doc.pipe(fs.createWriteStream(outputPath));

const logoPath = path.join(__dirname, '..', 'public', 'images', 'logo.png');

const orange = '#FF6B35';
const dark = '#1a1a1a';
const green = '#00ff88';

doc.image(logoPath, 200, 50, { width: 200 });

doc.y = 280;
doc.fontSize(28).fillColor(orange).text('Manual do Sistema', { align: 'center' });
doc.fontSize(16).fillColor('#666').text('Dashboard de Mobilidade Elétrica', { align: 'center' });
doc.moveDown(2);
doc.fontSize(12).fillColor('#999').text('Versão 1.0 - Dezembro 2024', { align: 'center' });

doc.addPage();

doc.fontSize(22).fillColor(orange).text('Sumário');
doc.moveDown();
doc.fontSize(12).fillColor('#333');
doc.text('1. Introdução ........................................ 3');
doc.text('2. Credenciais de Acesso ............................ 3');
doc.text('3. Perfis de Usuário ................................ 4');
doc.text('4. Produtos e Estoque ............................... 5');
doc.text('5. Gestão de Chassi ................................. 6');
doc.text('6. Sistema de Vendas ................................ 7');
doc.text('7. Ordens de Serviço (OS) ........................... 8');
doc.text('8. Sistema de Orçamentos ............................ 9');
doc.text('9. Módulo Financeiro ................................ 10');
doc.text('10. Conciliação Bancária ............................ 11');

doc.addPage();

doc.fontSize(22).fillColor(orange).text('1. Introdução');
doc.moveDown();
doc.fontSize(11).fillColor('#333');
doc.text('O Tecle Motos Dashboard é um sistema completo de gestão desenvolvido especialmente para empresas de mobilidade elétrica. Com ele, você pode gerenciar todo o ciclo de vendas de motos e scooters elétricas, peças, serviços e muito mais.', { align: 'justify' });
doc.moveDown();
doc.text('Principais funcionalidades:', { continued: false });
doc.moveDown(0.5);
doc.text('• Gestão completa de produtos (motos, scooters, peças, serviços)');
doc.text('• Controle de estoque e subestoques por localização');
doc.text('• Rastreamento individual de chassi');
doc.text('• Sistema de vendas com fluxo de aprovação');
doc.text('• Ordens de Serviço (OS) para manutenção');
doc.text('• Geração de orçamentos com validade de 7 dias');
doc.text('• Módulo financeiro com contas a pagar e receber');
doc.text('• Conciliação bancária com anexo de extratos');
doc.text('• Dashboard com gráficos e projeções');

doc.moveDown(2);
doc.fontSize(22).fillColor(orange).text('2. Credenciais de Acesso');
doc.moveDown();
doc.fontSize(11).fillColor('#333');
doc.text('Ao iniciar o sistema pela primeira vez, um usuário SUPER ADMIN é criado automaticamente:');
doc.moveDown();
doc.font('Helvetica-Bold').text('Email: ', { continued: true });
doc.font('Helvetica').text('admin@teclemotos.com');
doc.font('Helvetica-Bold').text('Senha: ', { continued: true });
doc.font('Helvetica').text('admin123');
doc.moveDown();
doc.fillColor('#cc0000').text('IMPORTANTE: Altere a senha após o primeiro login!');

doc.addPage();

doc.fontSize(22).fillColor(orange).text('3. Perfis de Usuário');
doc.moveDown();
doc.fontSize(11).fillColor('#333');

doc.font('Helvetica-Bold').fontSize(14).fillColor(green).text('SUPER ADMIN');
doc.font('Helvetica').fontSize(11).fillColor('#333');
doc.text('• Acesso total ao sistema');
doc.text('• Dashboard principal com gráficos e previsões');
doc.text('• Gerencia usuários, produtos, estoque, chassi');
doc.text('• Aprova e conclui vendas (seleciona chassi)');
doc.text('• Acesso ao módulo financeiro completo');
doc.moveDown();

doc.font('Helvetica-Bold').fontSize(14).fillColor(green).text('ADMIN');
doc.font('Helvetica').fontSize(11).fillColor('#333');
doc.text('• Cadastro de produtos/serviços');
doc.text('• Gestão de estoque e subestoque');
doc.text('• Sem acesso ao dashboard principal');
doc.text('• Sem acesso ao financeiro');
doc.moveDown();

doc.font('Helvetica-Bold').fontSize(14).fillColor(green).text('VENDEDOR');
doc.font('Helvetica').fontSize(11).fillColor('#333');
doc.text('• Dashboard próprio com indicadores de vendas, OS e orçamentos');
doc.text('• Cadastra e edita suas vendas (status pendente)');
doc.text('• Cria e gerencia Ordens de Serviço (OS)');
doc.text('• Gera orçamentos a partir de vendas e OS');
doc.text('• Consulta estoque (somente leitura)');
doc.text('• Não escolhe chassi nem conclui venda/OS');
doc.moveDown();

doc.font('Helvetica-Bold').fontSize(14).fillColor(green).text('CONTADOR');
doc.font('Helvetica').fontSize(11).fillColor('#333');
doc.text('• Acesso somente leitura ao financeiro');
doc.text('• Visualiza contas a receber/pagar');
doc.text('• Acessa conciliação bancária');
doc.text('• Não altera cadastros');

doc.addPage();

doc.fontSize(22).fillColor(orange).text('4. Produtos e Estoque');
doc.moveDown();
doc.fontSize(11).fillColor('#333');
doc.text('O sistema permite cadastrar três tipos de produtos:', { align: 'justify' });
doc.moveDown();

doc.font('Helvetica-Bold').text('MOTO/SCOOTER');
doc.font('Helvetica').text('Veículos elétricos que requerem controle de chassi, código do motor e capacidade da bateria.');
doc.moveDown(0.5);

doc.font('Helvetica-Bold').text('PRODUTO/PEÇA');
doc.font('Helvetica').text('Itens de estoque como baterias, carregadores, acessórios e peças de reposição.');
doc.moveDown(0.5);

doc.font('Helvetica-Bold').text('SERVIÇO');
doc.font('Helvetica').text('Serviços como manutenção, instalação e revisão.');
doc.moveDown();

doc.text('O controle de estoque permite:', { align: 'justify' });
doc.text('• Criar múltiplos estoques (ex: Matriz, Filial)');
doc.text('• Subestoques dentro de cada estoque (ex: Almoxarifado, Showroom)');
doc.text('• Definir quantidade mínima para alertas');
doc.text('• Movimentações de entrada e saída');

doc.addPage();

doc.fontSize(22).fillColor(orange).text('5. Gestão de Chassi');
doc.moveDown();
doc.fontSize(11).fillColor('#333');
doc.text('Cada moto ou scooter cadastrada pode ter múltiplos chassis vinculados. Isso permite:', { align: 'justify' });
doc.moveDown();
doc.text('• Rastreamento individual de cada unidade');
doc.text('• Controle de cores disponíveis');
doc.text('• Status do chassi: DISPONÍVEL, RESERVADO, VENDIDO');
doc.text('• Vinculação automática na conclusão da venda');
doc.moveDown();
doc.text('Quando uma venda é concluída, o SUPER ADMIN seleciona qual chassi específico foi vendido, e o sistema automaticamente marca como VENDIDO.');

doc.addPage();

doc.fontSize(22).fillColor(orange).text('6. Sistema de Vendas');
doc.moveDown();
doc.fontSize(11).fillColor('#333');
doc.text('O fluxo de vendas segue as seguintes etapas:', { align: 'justify' });
doc.moveDown();

doc.font('Helvetica-Bold').text('1. Criação da Venda (Vendedor)');
doc.font('Helvetica').text('O vendedor cria a venda com dados do cliente, produtos e forma de pagamento.');
doc.moveDown(0.5);

doc.font('Helvetica-Bold').text('2. Status PENDENTE');
doc.font('Helvetica').text('A venda fica aguardando aprovação do SUPER ADMIN.');
doc.moveDown(0.5);

doc.font('Helvetica-Bold').text('3. Aprovação (SUPER ADMIN)');
doc.font('Helvetica').text('O SUPER ADMIN pode editar, aprovar ou cancelar a venda.');
doc.moveDown(0.5);

doc.font('Helvetica-Bold').text('4. Seleção de Chassi');
doc.font('Helvetica').text('Para motos/scooters, o SUPER ADMIN seleciona qual chassi será entregue.');
doc.moveDown(0.5);

doc.font('Helvetica-Bold').text('5. Conclusão');
doc.font('Helvetica').text('Ao concluir, o sistema automaticamente:');
doc.text('   • Dá baixa no estoque');
doc.text('   • Marca o chassi como vendido');
doc.text('   • Gera conta a receber');

doc.addPage();

doc.fontSize(22).fillColor(orange).text('7. Ordens de Serviço (OS)');
doc.moveDown();
doc.fontSize(11).fillColor('#333');
doc.text('As Ordens de Serviço são usadas para registrar manutenções e serviços em veículos.', { align: 'justify' });
doc.moveDown();

doc.font('Helvetica-Bold').text('Dados da OS:');
doc.font('Helvetica');
doc.text('• Cliente e dados de contato');
doc.text('• Veículo (marca, modelo, placa, km)');
doc.text('• Descrição do problema');
doc.text('• Diagnóstico técnico');
doc.moveDown();

doc.font('Helvetica-Bold').text('Itens da OS:');
doc.font('Helvetica');
doc.text('• Moto - veículos completos');
doc.text('• Produto - peças e acessórios');
doc.text('• Serviço - mão de obra e serviços');
doc.moveDown();

doc.font('Helvetica-Bold').text('Status da OS:');
doc.font('Helvetica');
doc.text('ABERTA → EM EXECUÇÃO → AGUARDANDO APROVAÇÃO → APROVADA → CONCLUÍDA');

doc.addPage();

doc.fontSize(22).fillColor(orange).text('8. Sistema de Orçamentos');
doc.moveDown();
doc.fontSize(11).fillColor('#333');
doc.text('Orçamentos podem ser gerados a partir de Vendas ou Ordens de Serviço.', { align: 'justify' });
doc.moveDown();

doc.font('Helvetica-Bold').text('Características:');
doc.font('Helvetica');
doc.text('• Validade automática de 7 dias');
doc.text('• Inclui todos os descontos aplicados');
doc.text('• Documento formatado para impressão');
doc.text('• Status: RASCUNHO → ENVIADO → APROVADO (ou EXPIRADO)');
doc.moveDown();

doc.font('Helvetica-Bold').text('Regras:');
doc.font('Helvetica');
doc.text('• Orçamentos expirados não podem ser aprovados');
doc.text('• O vendedor pode gerar orçamentos de suas próprias vendas/OS');
doc.text('• O SUPER ADMIN pode aprovar qualquer orçamento');

doc.addPage();

doc.fontSize(22).fillColor(orange).text('9. Módulo Financeiro');
doc.moveDown();
doc.fontSize(11).fillColor('#333');

doc.font('Helvetica-Bold').fontSize(14).fillColor(green).text('Contas a Receber');
doc.font('Helvetica').fontSize(11).fillColor('#333');
doc.text('• Geradas automaticamente ao concluir vendas');
doc.text('• Podem ser criadas manualmente');
doc.text('• Controle de status: EM ABERTO, PAGO, VENCIDO');
doc.text('• Filtro por período');
doc.moveDown();

doc.font('Helvetica-Bold').fontSize(14).fillColor(green).text('Contas a Pagar');
doc.font('Helvetica').fontSize(11).fillColor('#333');
doc.text('• Cadastro de despesas e fornecedores');
doc.text('• Contas fixas (mensais) com geração automática de parcelas');
doc.text('• Controle de status: PENDENTE, PAGO, VENCIDO');
doc.text('• Arquivamento de contas antigas');
doc.moveDown();

doc.font('Helvetica-Bold').fontSize(14).fillColor(green).text('Contas Recorrentes');
doc.font('Helvetica').fontSize(11).fillColor('#333');
doc.text('Para contas fixas como luz, aluguel, etc:');
doc.text('1. Marque o tipo como "Fixa (Mensal)"');
doc.text('2. Ative "Gerar parcelas mensais até dezembro"');
doc.text('3. Edite a data e valor de cada parcela');
doc.text('4. Ao salvar, todas as parcelas são criadas');

doc.addPage();

doc.fontSize(22).fillColor(orange).text('10. Conciliação Bancária');
doc.moveDown();
doc.fontSize(11).fillColor('#333');
doc.text('A conciliação bancária permite comparar os lançamentos do sistema com os extratos bancários.', { align: 'justify' });
doc.moveDown();

doc.font('Helvetica-Bold').text('Funcionalidades:');
doc.font('Helvetica');
doc.text('• Registro de lançamentos bancários');
doc.text('• Anexo de extratos (PDF, JPG, PNG)');
doc.text('• Marcação de conciliado');
doc.text('• Filtro por período');
doc.text('• Arquivamento de lançamentos antigos');
doc.moveDown(2);

doc.fontSize(16).fillColor(orange).text('Suporte', { align: 'center' });
doc.moveDown();
doc.fontSize(11).fillColor('#333').text('Para dúvidas ou suporte técnico, entre em contato com o administrador do sistema.', { align: 'center' });

doc.end();

console.log('Manual gerado com sucesso em:', outputPath);
