const { gerarCPF, gerarCNPJ } = require('../utils/cpfCnpj');

const nomes = ['João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa', 'Carlos Souza', 'Juliana Lima', 'Rafael Pereira', 'Fernanda Alves', 'Lucas Martins', 'Camila Rodrigues'];
const sobrenomes = ['da Silva', 'Santos', 'Oliveira', 'Costa', 'Souza', 'Lima', 'Pereira', 'Alves', 'Martins', 'Rodrigues'];
const cidades = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre', 'Salvador', 'Brasília', 'Recife', 'Fortaleza', 'Manaus'];
const estados = ['SP', 'RJ', 'MG', 'PR', 'RS', 'BA', 'DF', 'PE', 'CE', 'AM'];
const bairros = ['Centro', 'Jardim América', 'Vila Nova', 'Boa Vista', 'Copacabana', 'Pinheiros', 'Moema', 'Ipanema', 'Leblon', 'Botafogo'];

const motosModelos = [
  { nome: 'E-Scooter Sport 3000W', potencia: 3000, velocidade: 80, autonomia: 120 },
  { nome: 'E-Bike Urban 1500W', potencia: 1500, velocidade: 45, autonomia: 80 },
  { nome: 'E-Moto Delivery 4000W', potencia: 4000, velocidade: 90, autonomia: 150 },
  { nome: 'E-Scooter City 2000W', potencia: 2000, velocidade: 60, autonomia: 100 },
  { nome: 'E-Bike Cargo 2500W', potencia: 2500, velocidade: 50, autonomia: 90 },
  { nome: 'E-Moto Racing 5000W', potencia: 5000, velocidade: 120, autonomia: 180 },
  { nome: 'E-Scooter Compact 1000W', potencia: 1000, velocidade: 35, autonomia: 60 },
  { nome: 'E-Bike Mountain 3500W', potencia: 3500, velocidade: 70, autonomia: 130 },
  { nome: 'E-Moto Touring 4500W', potencia: 4500, velocidade: 100, autonomia: 200 },
  { nome: 'E-Scooter Premium 3000W', potencia: 3000, velocidade: 75, autonomia: 140 }
];

const pecasModelos = [
  { nome: 'Bateria Lithium 60V 30Ah', categoria: 'Bateria' },
  { nome: 'Controlador 72V 50A', categoria: 'Eletrônica' },
  { nome: 'Motor Hub 3000W', categoria: 'Motor' },
  { nome: 'Pneu 16x3.0 Tubeless', categoria: 'Pneu' },
  { nome: 'Freio Disco Hidráulico', categoria: 'Freio' },
  { nome: 'Carregador Rápido 72V 5A', categoria: 'Carregador' },
  { nome: 'Display LCD Multifunção', categoria: 'Painel' },
  { nome: 'Farol LED 48V 20W', categoria: 'Iluminação' },
  { nome: 'Amortecedor Dianteiro', categoria: 'Suspensão' },
  { nome: 'Corrente Reforçada 420', categoria: 'Transmissão' }
];

const servicosModelos = [
  { nome: 'Revisão Completa', duracao: 60, preco: 350 },
  { nome: 'Troca de Bateria', duracao: 30, preco: 150 },
  { nome: 'Reparo Controlador', duracao: 45, preco: 280 },
  { nome: 'Troca Pneu Dianteiro', duracao: 20, preco: 150 },
  { nome: 'Troca Pneu Traseiro', duracao: 25, preco: 290 },
  { nome: 'Revitalização Motor', duracao: 90, preco: 1200 },
  { nome: 'Reparo Motor', duracao: 120, preco: 1000 },
  { nome: 'Reparo Módulo', duracao: 60, preco: 700 },
  { nome: 'Diagnóstico Elétrico', duracao: 30, preco: 140 },
  { nome: 'Alinhamento e Balanceamento', duracao: 45, preco: 270 }
];

function gerarDataUltimos30Dias() {
  const agora = new Date();
  const diasAtras = Math.floor(Math.random() * 30);
  return new Date(agora.getTime() - diasAtras * 24 * 60 * 60 * 1000);
}

function gerarEndereco(index) {
  return {
    cep: `${String(Math.floor(Math.random() * 90000) + 10000).padStart(5, '0')}-${String(Math.floor(Math.random() * 900) + 100)}`,
    logradouro: `Rua ${nomes[index % nomes.length].split(' ')[0]}`,
    numero: String(Math.floor(Math.random() * 1000) + 1),
    bairro: bairros[index % bairros.length],
    cidade: cidades[index % cidades.length],
    estado: estados[index % estados.length]
  };
}

function gerarEmail(nome, dominio) {
  return `${nome.toLowerCase().replace(/\s+/g, '.').normalize('NFD').replace(/[\u0300-\u036f]/g, '')}@${dominio}`;
}

async function criarSeedRealista(models, sequelize) {
  const { 
    User, Role, UserRole, Company, Store, Customer, Product, Category,
    InventoryMain, InventoryStore, Sale, SaleItem, ServiceOrder, 
    PaymentPayable, PaymentReceivable, PurchaseRequest, PurchaseRequestItem,
    AuditLog
  } = models;

  const transaction = await sequelize.transaction();

  try {
    console.log('Iniciando seed realista "10 de tudo"...');

    const empresaTMI = await Company.findOne({ where: { nome: { [require('sequelize').Op.like]: '%TM Imports%' } } });
    if (!empresaTMI) {
      throw new Error('Empresa TM Imports não encontrada. Execute o seed inicial primeiro.');
    }

    const lojaCentral = await Store.findOne({ where: { empresa_id: empresaTMI.id, tipo: 'MATRIZ' } });
    if (!lojaCentral) {
      throw new Error('Loja matriz TM Imports não encontrada.');
    }

    let categoriaMoto = await Category.findOne({ where: { nome: 'Motos Elétricas' } });
    if (!categoriaMoto) {
      categoriaMoto = await Category.create({ nome: 'Motos Elétricas', descricao: 'Motos e scooters elétricos' }, { transaction });
    }

    let categoriaPeca = await Category.findOne({ where: { nome: 'Peças' } });
    if (!categoriaPeca) {
      categoriaPeca = await Category.create({ nome: 'Peças', descricao: 'Peças e componentes' }, { transaction });
    }

    let categoriaServico = await Category.findOne({ where: { nome: 'Serviços' } });
    if (!categoriaServico) {
      categoriaServico = await Category.create({ nome: 'Serviços', descricao: 'Serviços de manutenção' }, { transaction });
    }

    console.log('Criando 10 franquias Tecle Motos...');
    const franquias = [];
    for (let i = 1; i <= 10; i++) {
      const cnpj = gerarCNPJ();
      const [empresa] = await Company.findOrCreate({
        where: { cnpj },
        defaults: {
          nome: `Tecle Motos ${cidades[i-1]}`,
          cnpj,
          razao_social: `Tecle Motos ${cidades[i-1]} LTDA`,
          email: `contato@teclemotos${cidades[i-1].toLowerCase().replace(/\s/g, '')}.com.br`,
          telefone: `(${10+i}) 9${Math.floor(Math.random()*9000)+1000}-${Math.floor(Math.random()*9000)+1000}`,
          endereco: `Av. Principal, ${i*100}`,
          cidade: cidades[i-1],
          estado: estados[i-1],
          ativo: true
        },
        transaction
      });

      const [loja] = await Store.findOrCreate({
        where: { empresa_id: empresa.id },
        defaults: {
          empresa_id: empresa.id,
          nome: `Tecle Motos ${cidades[i-1]}`,
          tipo: 'FRANQUIA',
          endereco: `Av. Principal, ${i*100}`,
          cidade: cidades[i-1],
          estado: estados[i-1],
          telefone: empresa.telefone,
          ativo: true
        },
        transaction
      });

      franquias.push({ empresa, loja });
    }

    console.log('Criando 10 vendedores TM Imports...');
    const roleVendedorTMI = await Role.findOne({ where: { codigo: 'VENDEDOR_TMI' } });
    for (let i = 1; i <= 10; i++) {
      const nome = nomes[i-1];
      const email = gerarEmail(nome, 'tmimports.com.br');
      
      const [vendedor] = await User.findOrCreate({
        where: { email },
        defaults: {
          nome,
          email,
          senha: await require('bcryptjs').hash('vendedor123', 10),
          perfil: 'VENDEDOR_TMI',
          loja_id: lojaCentral.id,
          empresa_id: empresaTMI.id,
          ativo: true,
          primeiro_acesso: true
        },
        transaction
      });

      if (roleVendedorTMI) {
        await UserRole.findOrCreate({
          where: { user_id: vendedor.id, role_id: roleVendedorTMI.id },
          transaction
        });
      }
    }

    console.log('Criando produtos, clientes, vendas e OS por franquia...');
    for (const { loja } of franquias) {
      const roleFranqueado = await Role.findOne({ where: { codigo: 'FRANQUEADO_GESTOR' } });
      const roleGerente = await Role.findOne({ where: { codigo: 'GERENTE_LOJA' } });
      const roleVendedor = await Role.findOne({ where: { codigo: 'VENDEDOR_LOJA' } });

      const [gestor] = await User.findOrCreate({
        where: { email: `gestor@${loja.nome.toLowerCase().replace(/\s/g, '')}.com.br` },
        defaults: {
          nome: `Gestor ${loja.nome}`,
          email: `gestor@${loja.nome.toLowerCase().replace(/\s/g, '')}.com.br`,
          senha: await require('bcryptjs').hash('gestor123', 10),
          perfil: 'FRANQUEADO_GESTOR',
          loja_id: loja.id,
          empresa_id: loja.empresa_id,
          ativo: true,
          primeiro_acesso: true
        },
        transaction
      });
      if (roleFranqueado) {
        await UserRole.findOrCreate({ where: { user_id: gestor.id, role_id: roleFranqueado.id }, transaction });
      }

      for (let v = 1; v <= 10; v++) {
        const nomeVendedor = `${nomes[(v-1) % nomes.length]} ${sobrenomes[v % sobrenomes.length]}`;
        const emailV = `vendedor${v}@${loja.nome.toLowerCase().replace(/\s/g, '')}.com.br`;
        
        const [vend] = await User.findOrCreate({
          where: { email: emailV },
          defaults: {
            nome: nomeVendedor,
            email: emailV,
            senha: await require('bcryptjs').hash('vendedor123', 10),
            perfil: v <= 2 ? 'GERENTE_LOJA' : 'VENDEDOR_LOJA',
            loja_id: loja.id,
            empresa_id: loja.empresa_id,
            ativo: true,
            primeiro_acesso: true
          },
          transaction
        });

        const role = v <= 2 ? roleGerente : roleVendedor;
        if (role) {
          await UserRole.findOrCreate({ where: { user_id: vend.id, role_id: role.id }, transaction });
        }
      }

      for (let c = 1; c <= 10; c++) {
        const cpf = gerarCPF();
        const endereco = gerarEndereco(c);
        await Customer.findOrCreate({
          where: { cpf_cnpj: cpf, loja_id: loja.id },
          defaults: {
            nome: `${nomes[(c-1) % nomes.length]} ${sobrenomes[c % sobrenomes.length]}`,
            tipo: 'PF',
            cpf_cnpj: cpf,
            email: `cliente.pf${c}@email.com`,
            telefone: `(11) 9${Math.floor(Math.random()*9000)+1000}-${Math.floor(Math.random()*9000)+1000}`,
            cep: endereco.cep,
            logradouro: endereco.logradouro,
            numero: endereco.numero,
            bairro: endereco.bairro,
            cidade: endereco.cidade,
            estado: endereco.estado,
            loja_id: loja.id,
            ativo: true
          },
          transaction
        });
      }

      for (let c = 1; c <= 10; c++) {
        const cnpj = gerarCNPJ();
        const endereco = gerarEndereco(c);
        await Customer.findOrCreate({
          where: { cpf_cnpj: cnpj, loja_id: loja.id },
          defaults: {
            nome: `Empresa ${nomes[c % nomes.length]} ${c} LTDA`,
            razao_social: `Empresa ${nomes[c % nomes.length]} ${c} LTDA`,
            tipo: 'PJ',
            cpf_cnpj: cnpj,
            email: `empresa.pj${c}@empresa.com`,
            telefone: `(11) 3${Math.floor(Math.random()*900)+100}-${Math.floor(Math.random()*9000)+1000}`,
            cep: endereco.cep,
            logradouro: endereco.logradouro,
            numero: endereco.numero,
            bairro: endereco.bairro,
            cidade: endereco.cidade,
            estado: endereco.estado,
            loja_id: loja.id,
            ativo: true
          },
          transaction
        });
      }
    }

    console.log('Criando 10 motos elétricas...');
    const produtosMotos = [];
    for (let i = 0; i < 10; i++) {
      const moto = motosModelos[i];
      const precoCusto = 5000 + Math.floor(Math.random() * 15000);
      const margem = 0.2632;
      const precoVenda = Math.round(precoCusto * (1 + margem));
      
      const [produto] = await Product.findOrCreate({
        where: { nome: moto.nome },
        defaults: {
          nome: moto.nome,
          descricao: `Potência: ${moto.potencia}W, Velocidade: ${moto.velocidade}km/h, Autonomia: ${moto.autonomia}km`,
          tipo: 'MOTO',
          categoria_id: categoriaMoto.id,
          preco_custo: precoCusto,
          preco_venda: precoVenda,
          margem_lucro: margem * 100,
          ncm: '87119000',
          unidade: 'UN',
          ativo: true
        },
        transaction
      });
      produtosMotos.push(produto);

      const quantidades = [0, 1, 2, 5, 10];
      await InventoryMain.findOrCreate({
        where: { produto_id: produto.id },
        defaults: {
          produto_id: produto.id,
          quantidade: quantidades[i % quantidades.length] + (10 - i),
          quantidade_minima: 2,
          localizacao: `GALPAO-A${i+1}`
        },
        transaction
      });
    }

    console.log('Criando 10 peças...');
    const produtosPecas = [];
    for (let i = 0; i < 10; i++) {
      const peca = pecasModelos[i];
      const precoCusto = 100 + Math.floor(Math.random() * 900);
      const margem = 0.60;
      const precoVenda = Math.round(precoCusto * (1 + margem));
      
      const [produto] = await Product.findOrCreate({
        where: { nome: peca.nome },
        defaults: {
          nome: peca.nome,
          descricao: `Categoria: ${peca.categoria}`,
          tipo: 'PECA',
          categoria_id: categoriaPeca.id,
          preco_custo: precoCusto,
          preco_venda: precoVenda,
          margem_lucro: margem * 100,
          ncm: '85044090',
          unidade: 'UN',
          ativo: true
        },
        transaction
      });
      produtosPecas.push(produto);

      const quantidades = [0, 1, 2, 5, 10, 15, 20, 25, 30, 50];
      await InventoryMain.findOrCreate({
        where: { produto_id: produto.id },
        defaults: {
          produto_id: produto.id,
          quantidade: quantidades[i],
          quantidade_minima: 5,
          localizacao: `PRATELEIRA-${String.fromCharCode(65 + i)}`
        },
        transaction
      });
    }

    console.log('Criando 10 serviços...');
    const produtosServicos = [];
    for (let i = 0; i < 10; i++) {
      const servico = servicosModelos[i];
      
      const [produto] = await Product.findOrCreate({
        where: { nome: servico.nome },
        defaults: {
          nome: servico.nome,
          descricao: `Duração aproximada: ${servico.duracao} minutos`,
          tipo: 'SERVICO',
          categoria_id: categoriaServico.id,
          preco_custo: 0,
          preco_venda: servico.preco,
          margem_lucro: 100,
          unidade: 'SV',
          ativo: true
        },
        transaction
      });
      produtosServicos.push(produto);
    }

    console.log('Criando estoque nas franquias + vendas + OS...');
    for (const { loja } of franquias) {
      for (let i = 0; i < produtosMotos.length; i++) {
        const qtd = [0, 1, 2, 3, 5][i % 5];
        await InventoryStore.findOrCreate({
          where: { loja_id: loja.id, produto_id: produtosMotos[i].id },
          defaults: { loja_id: loja.id, produto_id: produtosMotos[i].id, quantidade: qtd, quantidade_minima: 1 },
          transaction
        });
      }

      for (let i = 0; i < produtosPecas.length; i++) {
        const qtd = [0, 2, 5, 10, 15][i % 5];
        await InventoryStore.findOrCreate({
          where: { loja_id: loja.id, produto_id: produtosPecas[i].id },
          defaults: { loja_id: loja.id, produto_id: produtosPecas[i].id, quantidade: qtd, quantidade_minima: 3 },
          transaction
        });
      }

      const clientes = await Customer.findAll({ where: { loja_id: loja.id }, transaction });
      const vendedores = await User.findAll({ where: { loja_id: loja.id, perfil: { [require('sequelize').Op.in]: ['VENDEDOR_LOJA', 'GERENTE_LOJA'] } }, transaction });

      const formasPagamento = ['DINHEIRO', 'PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'BOLETO'];
      const statusVenda = ['PENDENTE', 'APROVADA', 'CONCLUIDA', 'CONCLUIDA', 'CONCLUIDA'];

      for (let v = 1; v <= 10; v++) {
        const cliente = clientes[v % clientes.length];
        const vendedor = vendedores[v % vendedores.length];
        const dataVenda = gerarDataUltimos30Dias();
        const formaPgto = formasPagamento[v % formasPagamento.length];
        const status = statusVenda[v % statusVenda.length];

        const produto = v <= 3 ? produtosMotos[v-1] : produtosPecas[(v-4) % produtosPecas.length];
        const quantidade = v <= 3 ? 1 : Math.floor(Math.random() * 3) + 1;
        const subtotal = produto.preco_venda * quantidade;

        const venda = await Sale.create({
          loja_id: loja.id,
          cliente_id: cliente?.id,
          vendedor_id: vendedor?.id,
          data_venda: dataVenda,
          subtotal,
          desconto: formaPgto === 'DINHEIRO' || formaPgto === 'PIX' ? subtotal * 0.03 : 0,
          total: subtotal - (formaPgto === 'DINHEIRO' || formaPgto === 'PIX' ? subtotal * 0.03 : 0),
          forma_pagamento: formaPgto,
          parcelas: formaPgto === 'CARTAO_CREDITO' ? Math.min(v, 10) : 1,
          status,
          observacoes: `Venda seed #${v} - ${loja.nome}`
        }, { transaction });

        await SaleItem.create({
          venda_id: venda.id,
          produto_id: produto.id,
          quantidade,
          preco_unitario: produto.preco_venda,
          desconto: 0,
          total: subtotal
        }, { transaction });

        if (status === 'CONCLUIDA') {
          await PaymentReceivable.create({
            loja_id: loja.id,
            venda_id: venda.id,
            descricao: `Venda #${venda.id}`,
            valor: venda.total,
            data_vencimento: new Date(dataVenda.getTime() + 30 * 24 * 60 * 60 * 1000),
            data_pagamento: dataVenda,
            status: 'PAGO'
          }, { transaction });
        }
      }

      const statusOS = ['ABERTA', 'EM_EXECUCAO', 'AGUARDANDO_PECA', 'CONCLUIDA', 'CONCLUIDA'];
      for (let o = 1; o <= 10; o++) {
        const cliente = clientes[o % clientes.length];
        const tecnico = vendedores[o % vendedores.length];
        const dataOS = gerarDataUltimos30Dias();
        const status = statusOS[o % statusOS.length];

        await ServiceOrder.create({
          loja_id: loja.id,
          cliente_id: cliente?.id,
          tecnico_id: tecnico?.id,
          numero: `OS-${loja.id}-${String(o).padStart(4, '0')}`,
          data_entrada: dataOS,
          data_previsao: new Date(dataOS.getTime() + 7 * 24 * 60 * 60 * 1000),
          data_conclusao: status === 'CONCLUIDA' ? new Date(dataOS.getTime() + 3 * 24 * 60 * 60 * 1000) : null,
          status,
          descricao_problema: `Problema de manutenção #${o}`,
          servico_id: produtosServicos[o % produtosServicos.length]?.id,
          valor_servico: produtosServicos[o % produtosServicos.length]?.preco_venda || 200,
          valor_pecas: 0,
          valor_total: produtosServicos[o % produtosServicos.length]?.preco_venda || 200,
          observacoes: `OS seed #${o}`
        }, { transaction });
      }

      const categoriasPagar = ['ALUGUEL', 'ENERGIA', 'INTERNET', 'FORNECEDOR', 'SALARIOS'];
      for (let p = 1; p <= 10; p++) {
        const dataConta = gerarDataUltimos30Dias();
        const status = p <= 5 ? 'PAGO' : 'PENDENTE';

        await PaymentPayable.create({
          loja_id: loja.id,
          descricao: `${categoriasPagar[p % categoriasPagar.length]} - ${loja.nome}`,
          categoria: categoriasPagar[p % categoriasPagar.length],
          valor: 500 + Math.floor(Math.random() * 2000),
          data_vencimento: new Date(dataConta.getTime() + (p * 5) * 24 * 60 * 60 * 1000),
          data_pagamento: status === 'PAGO' ? dataConta : null,
          status,
          recorrente: p % 3 === 0,
          frequencia_recorrencia: p % 3 === 0 ? 'MENSAL' : null
        }, { transaction });
      }

      for (let r = 1; r <= 10; r++) {
        const dataConta = gerarDataUltimos30Dias();
        const status = r <= 6 ? 'PAGO' : 'PENDENTE';

        await PaymentReceivable.create({
          loja_id: loja.id,
          descricao: `Recebimento avulso #${r} - ${loja.nome}`,
          valor: 300 + Math.floor(Math.random() * 1500),
          data_vencimento: new Date(dataConta.getTime() + (r * 3) * 24 * 60 * 60 * 1000),
          data_pagamento: status === 'PAGO' ? dataConta : null,
          status
        }, { transaction });
      }

      const statusPedido = ['PENDENTE', 'APROVADA', 'REJEITADA', 'FATURADA', 'ENVIADA', 'RECEBIDA', 'PENDENTE', 'APROVADA', 'FATURADA', 'ENVIADA'];
      for (let pd = 1; pd <= 10; pd++) {
        const dataPedido = gerarDataUltimos30Dias();
        const status = statusPedido[pd - 1];

        const pedido = await PurchaseRequest.create({
          loja_id: loja.id,
          solicitante_id: gestor?.id || vendedores[0]?.id,
          status,
          observacoes: `Pedido seed #${pd}`,
          data_solicitacao: dataPedido,
          data_aprovacao: ['APROVADA', 'FATURADA', 'ENVIADA', 'RECEBIDA'].includes(status) ? dataPedido : null,
          data_envio: ['ENVIADA', 'RECEBIDA'].includes(status) ? new Date(dataPedido.getTime() + 2 * 24 * 60 * 60 * 1000) : null,
          data_recebimento: status === 'RECEBIDA' ? new Date(dataPedido.getTime() + 5 * 24 * 60 * 60 * 1000) : null
        }, { transaction });

        const produtoPedido = pd <= 5 ? produtosMotos[pd % produtosMotos.length] : produtosPecas[pd % produtosPecas.length];
        const qtdPedido = pd <= 5 ? 2 : 10;

        await PurchaseRequestItem.create({
          solicitacao_id: pedido.id,
          produto_id: produtoPedido.id,
          quantidade_solicitada: qtdPedido,
          quantidade_aprovada: ['APROVADA', 'FATURADA', 'ENVIADA', 'RECEBIDA'].includes(status) ? qtdPedido : null,
          preco_unitario: produtoPedido.preco_custo
        }, { transaction });
      }
    }

    await transaction.commit();
    console.log('Seed realista "10 de tudo" concluído com sucesso!');

    return {
      franquias: 10,
      vendedoresTMI: 10,
      produtosMotos: 10,
      produtosPecas: 10,
      produtosServicos: 10,
      clientesPorLoja: 20,
      vendasPorLoja: 10,
      osPorLoja: 10,
      contasPagarPorLoja: 10,
      contasReceberPorLoja: 10,
      pedidosPorLoja: 10
    };

  } catch (error) {
    await transaction.rollback();
    console.error('Erro no seed realista:', error);
    throw error;
  }
}

async function resetarESeed(models, sequelize) {
  const { 
    SaleItem, Sale, ServiceOrder, PaymentPayable, PaymentReceivable,
    PurchaseRequestItem, PurchaseRequest, InventoryStore, Customer, AuditLog
  } = models;

  const transaction = await sequelize.transaction();

  try {
    console.log('Limpando dados transacionais...');

    await SaleItem.destroy({ where: {}, transaction });
    await Sale.destroy({ where: {}, transaction });
    await ServiceOrder.destroy({ where: {}, transaction });
    await PaymentPayable.destroy({ where: {}, transaction });
    await PaymentReceivable.destroy({ where: {}, transaction });
    await PurchaseRequestItem.destroy({ where: {}, transaction });
    await PurchaseRequest.destroy({ where: {}, transaction });
    await InventoryStore.destroy({ where: {}, transaction });
    await Customer.destroy({ where: {}, transaction });
    await AuditLog.destroy({ where: { acao: { [require('sequelize').Op.like]: '%seed%' } }, transaction });

    await transaction.commit();
    console.log('Dados limpos. Recriando seed...');

    return await criarSeedRealista(models, sequelize);

  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao resetar e recriar seed:', error);
    throw error;
  }
}

module.exports = { criarSeedRealista, resetarESeed };
