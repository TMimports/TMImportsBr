const bcrypt = require('bcryptjs');

async function runSeed(models) {
  const { 
    Company, Store, User, Customer, Product, Category,
    InventoryMain, InventoryStore, Vendor, Sale, SaleItem,
    ServiceOrder, ServiceOrderItem, PaymentReceivable, PaymentPayable,
    PurchaseRequest, PurchaseRequestItem
  } = models;

  const countStores = await Store.count();
  if (countStores >= 10) {
    console.log('Seed already applied - skipping');
    return;
  }

  console.log('Running complete seed with 10 of everything...');

  const matriz = await Company.findOne({ where: { tipo: 'MATRIZ' } });
  if (!matriz) {
    console.log('Matriz not found - run initializeDatabase first');
    return;
  }

  const lojaCentral = await Store.findOrCreate({
    where: { codigo: 'TMI-001' },
    defaults: {
      nome: 'TM Imports Central',
      empresa_id: matriz.id,
      cidade: 'São Paulo',
      estado: 'SP',
      telefone: '(11) 3000-1000',
      email: 'central@tmimports.com'
    }
  });

  const franquias = [];
  const cidades = [
    { nome: 'Tecle Motos Campinas', cidade: 'Campinas', estado: 'SP' },
    { nome: 'Tecle Motos Ribeirão', cidade: 'Ribeirão Preto', estado: 'SP' },
    { nome: 'Tecle Motos BH', cidade: 'Belo Horizonte', estado: 'MG' },
    { nome: 'Tecle Motos Rio', cidade: 'Rio de Janeiro', estado: 'RJ' },
    { nome: 'Tecle Motos Curitiba', cidade: 'Curitiba', estado: 'PR' },
    { nome: 'Tecle Motos POA', cidade: 'Porto Alegre', estado: 'RS' },
    { nome: 'Tecle Motos Salvador', cidade: 'Salvador', estado: 'BA' },
    { nome: 'Tecle Motos Recife', cidade: 'Recife', estado: 'PE' },
    { nome: 'Tecle Motos Brasília', cidade: 'Brasília', estado: 'DF' },
    { nome: 'Tecle Motos Fortaleza', cidade: 'Fortaleza', estado: 'CE' }
  ];

  for (let i = 0; i < 10; i++) {
    const [franquia] = await Company.findOrCreate({
      where: { cnpj: `${10 + i}.000.000/0001-${String(10 + i).padStart(2, '0')}` },
      defaults: {
        nome: cidades[i].nome,
        tipo: 'FRANQUIA',
        endereco: `Av. Principal, ${100 + i}`,
        telefone: `(11) 9${1000 + i}-${2000 + i}`,
        email: `contato${i + 1}@teclemotos.com`
      }
    });
    franquias.push(franquia);

    const [loja] = await Store.findOrCreate({
      where: { codigo: `TM-${String(i + 2).padStart(3, '0')}` },
      defaults: {
        nome: cidades[i].nome,
        empresa_id: franquia.id,
        cidade: cidades[i].cidade,
        estado: cidades[i].estado,
        telefone: `(11) 9${1000 + i}-${3000 + i}`,
        email: `loja${i + 1}@teclemotos.com`,
        margem_padrao: 26.32
      }
    });
    franquias[i].lojaId = loja.id;
  }

  const senhaHash = await bcrypt.hash('senha123', 10);
  const vendedoresTMI = [];
  for (let i = 0; i < 10; i++) {
    const [vendedor] = await User.findOrCreate({
      where: { email: `vendedor.tmi${i + 1}@tmimports.com` },
      defaults: {
        nome: `Vendedor TMI ${i + 1}`,
        senha: senhaHash,
        perfil: 'OPERACIONAL',
        empresa_id: matriz.id,
        loja_id: lojaCentral[0].id,
        primeiro_acesso: false
      }
    });
    vendedoresTMI.push(vendedor);

    await Vendor.findOrCreate({
      where: { user_id: vendedor.id },
      defaults: {
        nome: vendedor.nome,
        email: vendedor.email,
        telefone: `(11) 98${100 + i}-${1000 + i}`,
        comissao: 3 + (i % 5),
        desconto_maximo: 5 + (i % 6),
        loja_id: lojaCentral[0].id
      }
    });
  }

  const [catMotos] = await Category.findOrCreate({ where: { nome: 'Motos Elétricas' }, defaults: { tipo: 'MOTO' } });
  const [catPecas] = await Category.findOrCreate({ where: { nome: 'Peças e Acessórios' }, defaults: { tipo: 'PECA' } });
  const [catServicos] = await Category.findOrCreate({ where: { nome: 'Serviços' }, defaults: { tipo: 'SERVICO' } });

  const motosData = [
    { nome: 'Scooter X1 1500W', preco_custo: 4500, preco_venda: 6999, cor: 'Branco' },
    { nome: 'Scooter X2 2000W', preco_custo: 5500, preco_venda: 8499, cor: 'Preto' },
    { nome: 'Scooter X3 3000W', preco_custo: 7000, preco_venda: 10999, cor: 'Vermelho' },
    { nome: 'E-Moto Sport 3000W', preco_custo: 9000, preco_venda: 13999, cor: 'Azul' },
    { nome: 'E-Moto City 2500W', preco_custo: 6500, preco_venda: 9999, cor: 'Prata' },
    { nome: 'E-Bike Cargo 1000W', preco_custo: 3500, preco_venda: 5499, cor: 'Verde' },
    { nome: 'Triciclo Elétrico 1500W', preco_custo: 5000, preco_venda: 7999, cor: 'Amarelo' },
    { nome: 'Scooter Premium 4000W', preco_custo: 11000, preco_venda: 16999, cor: 'Preto Fosco' },
    { nome: 'E-Moto Trail 3500W', preco_custo: 12000, preco_venda: 18499, cor: 'Laranja' },
    { nome: 'Scooter Eco 800W', preco_custo: 2500, preco_venda: 3999, cor: 'Branco' }
  ];
  const motos = [];
  for (let i = 0; i < 10; i++) {
    const [moto] = await Product.findOrCreate({
      where: { codigo: `MOTO-${String(i + 1).padStart(3, '0')}` },
      defaults: {
        ...motosData[i],
        categoria_id: catMotos.id,
        tipo: 'MOTO',
        percentual_lucro: 26.32,
        garantia: '12 meses',
        capacidade_bateria: `${48 + (i * 4)}V ${20 + (i * 5)}Ah`
      }
    });
    motos.push(moto);
  }

  const pecasData = [
    { nome: 'Bateria 48V 20Ah', preco_custo: 800, preco_venda: 1299 },
    { nome: 'Bateria 60V 30Ah', preco_custo: 1200, preco_venda: 1899 },
    { nome: 'Controlador 1500W', preco_custo: 250, preco_venda: 449 },
    { nome: 'Motor Hub 2000W', preco_custo: 600, preco_venda: 999 },
    { nome: 'Carregador Universal 5A', preco_custo: 150, preco_venda: 279 },
    { nome: 'Pneu 10 polegadas', preco_custo: 80, preco_venda: 149 },
    { nome: 'Kit Freio Hidráulico', preco_custo: 180, preco_venda: 329 },
    { nome: 'Painel LCD Digital', preco_custo: 120, preco_venda: 229 },
    { nome: 'Farol LED Duplo', preco_custo: 60, preco_venda: 119 },
    { nome: 'Capacete Elétrico', preco_custo: 100, preco_venda: 189 }
  ];
  const pecas = [];
  for (let i = 0; i < 10; i++) {
    const [peca] = await Product.findOrCreate({
      where: { codigo: `PECA-${String(i + 1).padStart(3, '0')}` },
      defaults: {
        ...pecasData[i],
        categoria_id: catPecas.id,
        tipo: 'PECA',
        percentual_lucro: 60,
        garantia: '6 meses'
      }
    });
    pecas.push(peca);
  }

  const servicosData = [
    { nome: 'Revisão Completa', preco_venda: 350 },
    { nome: 'Troca de Bateria', preco_venda: 150 },
    { nome: 'Balanceamento', preco_venda: 80 },
    { nome: 'Troca de Pneus', preco_venda: 120 },
    { nome: 'Diagnóstico Elétrico', preco_venda: 100 },
    { nome: 'Reparo Controlador', preco_venda: 200 },
    { nome: 'Instalação Acessórios', preco_venda: 80 },
    { nome: 'Pintura', preco_venda: 500 },
    { nome: 'Polimento', preco_venda: 150 },
    { nome: 'Garantia Estendida 1 ano', preco_venda: 299 }
  ];
  const servicos = [];
  for (let i = 0; i < 10; i++) {
    const [servico] = await Product.findOrCreate({
      where: { codigo: `SERV-${String(i + 1).padStart(3, '0')}` },
      defaults: {
        ...servicosData[i],
        preco_custo: 0,
        categoria_id: catServicos.id,
        tipo: 'SERVICO',
        percentual_lucro: 100
      }
    });
    servicos.push(servico);
  }

  const todosOsProdutos = [...motos, ...pecas, ...servicos];
  for (const produto of todosOsProdutos) {
    if (produto.tipo === 'SERVICO') continue;
    const qtdVariada = produto.tipo === 'MOTO' 
      ? [0, 1, 2, 3, 5, 8, 10, 15, 2, 1][motos.indexOf(produto) % 10]
      : [0, 1, 2, 5, 10, 15, 20, 30, 8, 3][pecas.indexOf(produto) % 10];
    
    await InventoryMain.findOrCreate({
      where: { produto_id: produto.id },
      defaults: { quantidade: qtdVariada * 3, localizacao: `A${Math.floor(Math.random() * 10) + 1}` }
    });
  }

  const lojas = await Store.findAll();
  
  for (const loja of lojas) {
    const nomesPF = ['João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa', 'Carlos Souza'];
    const nomesPJ = ['Auto Peças SP', 'Motoservice LTDA', 'Delivery Express', 'Frota Verde', 'EcoTransport'];
    
    for (let i = 0; i < 10; i++) {
      const isPJ = i >= 5;
      await Customer.findOrCreate({
        where: { cpf_cnpj: isPJ ? `${loja.id}${i}.000.000/0001-00` : `${loja.id}${i}0.000.000-00` },
        defaults: {
          nome: isPJ ? `${nomesPJ[i - 5]} - ${loja.cidade}` : `${nomesPF[i]} - ${loja.cidade}`,
          email: `cliente${loja.id}${i}@email.com`,
          telefone: `(11) 9${loja.id}${i}00-${1000 + i}`,
          cidade: loja.cidade,
          estado: loja.estado,
          loja_id: loja.id
        }
      });
    }

    for (let i = 0; i < 10; i++) {
      const [vendedorUser] = await User.findOrCreate({
        where: { email: `vendedor${loja.id}${i}@teclemotos.com` },
        defaults: {
          nome: `Vendedor ${i + 1} - ${loja.nome}`,
          senha: senhaHash,
          perfil: 'OPERACIONAL',
          empresa_id: loja.empresa_id,
          loja_id: loja.id,
          primeiro_acesso: false
        }
      });
      await Vendor.findOrCreate({
        where: { user_id: vendedorUser.id },
        defaults: {
          nome: vendedorUser.nome,
          email: vendedorUser.email,
          telefone: `(11) 9${loja.id}${i}0-${2000 + i}`,
          comissao: 3 + (i % 4),
          desconto_maximo: 5 + (i % 5),
          loja_id: loja.id
        }
      });
    }

    for (const produto of todosOsProdutos) {
      if (produto.tipo === 'SERVICO') continue;
      const qtd = Math.floor(Math.random() * 15);
      await InventoryStore.findOrCreate({
        where: { loja_id: loja.id, produto_id: produto.id },
        defaults: { quantidade: qtd, preco_venda_local: parseFloat(produto.preco_venda) * 1.1 }
      });
    }
  }

  const allCustomers = await Customer.findAll();
  const allVendors = await Vendor.findAll();
  
  let saleNum = 1;
  let osNum = 1;
  
  for (const loja of lojas) {
    const lojaCustomers = allCustomers.filter(c => c.loja_id === loja.id);
    const lojaVendors = allVendors.filter(v => v.loja_id === loja.id);
    
    for (let i = 0; i < 10; i++) {
      const cliente = lojaCustomers[i % lojaCustomers.length];
      const vendedor = lojaVendors[i % (lojaVendors.length || 1)];
      const dias = Math.floor(Math.random() * 60);
      const dataVenda = new Date();
      dataVenda.setDate(dataVenda.getDate() - dias);
      
      const status = ['ORCAMENTO', 'PENDENTE', 'APROVADA', 'CONCLUIDA', 'CONCLUIDA', 'CONCLUIDA', 'CONCLUIDA', 'CONCLUIDA', 'CANCELADA', 'CONCLUIDA'][i];
      const produto = i < 3 ? motos[i % motos.length] : pecas[i % pecas.length];
      const qtd = i < 3 ? 1 : Math.floor(Math.random() * 3) + 1;
      const total = parseFloat(produto.preco_venda) * qtd;

      const [venda] = await Sale.findOrCreate({
        where: { numero: `VND-${String(saleNum).padStart(6, '0')}` },
        defaults: {
          loja_id: loja.id,
          cliente_id: cliente?.id,
          vendedor_id: vendedor?.id,
          data_venda: dataVenda,
          status,
          subtotal: total,
          desconto: 0,
          total,
          forma_pagamento: ['PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO', 'BOLETO'][i % 5],
          parcelas: i % 5 === 1 ? (i % 12 + 1) : 1
        }
      });
      saleNum++;

      await SaleItem.findOrCreate({
        where: { venda_id: venda.id, produto_id: produto.id },
        defaults: {
          quantidade: qtd,
          preco_unitario: produto.preco_venda,
          desconto: 0,
          total
        }
      });

      if (status === 'CONCLUIDA') {
        const venc = new Date(dataVenda);
        venc.setDate(venc.getDate() + 30);
        await PaymentReceivable.findOrCreate({
          where: { venda_id: venda.id },
          defaults: {
            loja_id: loja.id,
            cliente_id: cliente?.id,
            descricao: `Venda ${venda.numero}`,
            valor: total,
            data_vencimento: venc,
            status: dias > 15 ? 'PAGO' : 'PENDENTE',
            data_pagamento: dias > 15 ? new Date() : null
          }
        });
      }
    }

    for (let i = 0; i < 10; i++) {
      const cliente = lojaCustomers[i % lojaCustomers.length];
      const vendedor = lojaVendors[i % (lojaVendors.length || 1)];
      const dias = Math.floor(Math.random() * 30);
      const dataOS = new Date();
      dataOS.setDate(dataOS.getDate() - dias);
      
      const status = i < 5 ? ['ABERTA', 'EM_EXECUCAO', 'ABERTA', 'EM_EXECUCAO', 'ABERTA'][i] : 'CONCLUIDA';
      const servico = servicos[i % servicos.length];
      const peca = pecas[i % pecas.length];
      const totalServico = parseFloat(servico.preco_venda);
      const totalPeca = parseFloat(peca.preco_venda);
      const total = totalServico + totalPeca;

      const [os] = await ServiceOrder.findOrCreate({
        where: { numero: `OS-${String(osNum).padStart(6, '0')}` },
        defaults: {
          loja_id: loja.id,
          cliente_id: cliente?.id,
          vendedor_id: vendedor?.id,
          veiculo_marca: ['Tecle', 'X-Moto', 'E-Scooter', 'GreenMoto', 'VoltBike'][i % 5],
          veiculo_modelo: ['Sport 2000W', 'City 1500W', 'Cargo 1000W', 'Trail 3000W', 'Urban 800W'][i % 5],
          veiculo_placa: `ABC${loja.id}${i}${String.fromCharCode(65 + i)}${10 + i}`,
          defeito_relatado: ['Não liga', 'Bateria fraca', 'Barulho no motor', 'Freio travando', 'Painel apagado', 'Pneu furado', 'Luz queimada', 'Acelerador lento', 'Ruído estranho', 'Revisão preventiva'][i],
          status,
          total_servicos: totalServico,
          total_pecas: totalPeca,
          total,
          data_entrada: dataOS,
          data_previsao: new Date(dataOS.getTime() + 3 * 24 * 60 * 60 * 1000),
          data_conclusao: status === 'CONCLUIDA' ? new Date() : null
        }
      });
      osNum++;

      await ServiceOrderItem.findOrCreate({
        where: { ordem_id: os.id, produto_id: servico.id },
        defaults: { tipo: 'SERVICO', quantidade: 1, preco_unitario: totalServico, total: totalServico }
      });
      await ServiceOrderItem.findOrCreate({
        where: { ordem_id: os.id, produto_id: peca.id },
        defaults: { tipo: 'PECA', quantidade: 1, preco_unitario: totalPeca, total: totalPeca }
      });
    }

    for (let i = 0; i < 10; i++) {
      const dias = Math.floor(Math.random() * 60);
      const venc = new Date();
      venc.setDate(venc.getDate() + (i < 5 ? 30 - dias : -dias));
      
      await PaymentPayable.findOrCreate({
        where: { loja_id: loja.id, descricao: `Fornecedor ${loja.id}-${i + 1}` },
        defaults: {
          descricao: `Fornecedor ${loja.id}-${i + 1} - ${['Peças', 'Baterias', 'Controladores', 'Pneus', 'Acessórios', 'Capacetes', 'Ferramentas', 'Marketing', 'Aluguel', 'Energia'][i]}`,
          valor: 500 + (i * 200),
          data_vencimento: venc,
          status: i < 5 ? 'PENDENTE' : 'PAGO',
          data_pagamento: i >= 5 ? new Date() : null,
          categoria: ['FORNECEDOR', 'FIXO', 'VARIAVEL'][i % 3]
        }
      });
    }
  }

  const statusPedidos = ['PENDENTE', 'PENDENTE', 'APROVADA', 'APROVADA', 'FATURADA', 'FATURADA', 'ENVIADA', 'ENVIADA', 'RECEBIDA', 'RECEBIDA'];
  for (let i = 0; i < 10; i++) {
    const franquia = franquias[i % franquias.length];
    const dias = Math.floor(Math.random() * 30);
    const dataPedido = new Date();
    dataPedido.setDate(dataPedido.getDate() - dias);

    const [pedido] = await PurchaseRequest.findOrCreate({
      where: { numero: `PED-${String(i + 1).padStart(6, '0')}` },
      defaults: {
        loja_id: franquia.lojaId,
        status: statusPedidos[i],
        observacoes: `Pedido de reposição ${i + 1}`,
        data_aprovacao: ['APROVADA', 'FATURADA', 'ENVIADA', 'RECEBIDA'].includes(statusPedidos[i]) ? new Date() : null,
        data_envio: ['ENVIADA', 'RECEBIDA'].includes(statusPedidos[i]) ? new Date() : null,
        data_recebimento: statusPedidos[i] === 'RECEBIDA' ? new Date() : null,
        createdAt: dataPedido
      }
    });

    for (let j = 0; j < 3; j++) {
      const produto = [...motos, ...pecas][(i + j) % 20];
      await PurchaseRequestItem.findOrCreate({
        where: { solicitacao_id: pedido.id, produto_id: produto.id },
        defaults: {
          quantidade: Math.floor(Math.random() * 5) + 1,
          preco_unitario: produto.preco_custo,
          total: parseFloat(produto.preco_custo) * (Math.floor(Math.random() * 5) + 1)
        }
      });
    }
  }

  console.log('Seed completed successfully!');
  console.log('Created: 10 franchises, 11 stores, 100+ vendors, 100+ customers');
  console.log('Created: 10 motorcycles, 10 parts, 10 services');
  console.log('Created: 100+ sales, 100+ service orders, 100+ receivables, 100+ payables');
  console.log('Created: 10 purchase requests with varied statuses');
}

module.exports = { runSeed };
