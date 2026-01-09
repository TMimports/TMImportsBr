const bcrypt = require('bcryptjs');

function gerarCPFValido() {
  const random = () => Math.floor(Math.random() * 9);
  const n = Array.from({ length: 9 }, random);
  
  let d1 = n.reduce((acc, val, i) => acc + val * (10 - i), 0);
  d1 = 11 - (d1 % 11);
  if (d1 >= 10) d1 = 0;
  n.push(d1);
  
  let d2 = n.reduce((acc, val, i) => acc + val * (11 - i), 0);
  d2 = 11 - (d2 % 11);
  if (d2 >= 10) d2 = 0;
  n.push(d2);
  
  return `${n[0]}${n[1]}${n[2]}.${n[3]}${n[4]}${n[5]}.${n[6]}${n[7]}${n[8]}-${n[9]}${n[10]}`;
}

function gerarCNPJValido() {
  const random = () => Math.floor(Math.random() * 9);
  const n = Array.from({ length: 8 }, random);
  n.push(0, 0, 0, 1);
  
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let d1 = n.reduce((acc, val, i) => acc + val * pesos1[i], 0);
  d1 = 11 - (d1 % 11);
  if (d1 >= 10) d1 = 0;
  n.push(d1);
  
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let d2 = n.reduce((acc, val, i) => acc + val * pesos2[i], 0);
  d2 = 11 - (d2 % 11);
  if (d2 >= 10) d2 = 0;
  n.push(d2);
  
  return `${n[0]}${n[1]}.${n[2]}${n[3]}${n[4]}.${n[5]}${n[6]}${n[7]}/${n[8]}${n[9]}${n[10]}${n[11]}-${n[12]}${n[13]}`;
}

function randomDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  date.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60), 0, 0);
  return date;
}

function randomFutureDate(daysAhead) {
  const date = new Date();
  date.setDate(date.getDate() + Math.floor(Math.random() * daysAhead));
  return date;
}

async function runSeed(models) {
  const { 
    Company, Store, User, Customer, Product, Category,
    InventoryMain, InventoryStore, Vendor, Sale, SaleItem,
    ServiceOrder, ServiceOrderItem, PaymentReceivable, PaymentPayable,
    PurchaseRequest, PurchaseRequestItem, Role, UserRole
  } = models;

  const existingStores = await Store.count();
  if (existingStores >= 10) {
    console.log('Seed already applied - skipping');
    return;
  }

  console.log('Running complete seed with realistic data...');

  const matriz = await Company.findOne({ where: { tipo: 'MATRIZ' } });
  if (!matriz) {
    console.log('Matriz not found - run initializeDatabase first');
    return;
  }

  const senhaHash = await bcrypt.hash('senha123', 10);

  const [lojaCentral] = await Store.findOrCreate({
    where: { codigo: 'TMI-001' },
    defaults: {
      nome: 'TM Imports Central',
      empresa_id: matriz.id,
      cidade: 'São Paulo',
      estado: 'SP',
      endereco: 'Av. Paulista, 1000',
      telefone: '(11) 3000-1000',
      email: 'central@tmimports.com'
    }
  });

  const cidades = [
    { nome: 'Campinas', estado: 'SP', cep: '13010-000' },
    { nome: 'Ribeirão Preto', estado: 'SP', cep: '14010-000' },
    { nome: 'Belo Horizonte', estado: 'MG', cep: '30130-000' },
    { nome: 'Rio de Janeiro', estado: 'RJ', cep: '20040-000' },
    { nome: 'Curitiba', estado: 'PR', cep: '80010-000' },
    { nome: 'Porto Alegre', estado: 'RS', cep: '90010-000' },
    { nome: 'Salvador', estado: 'BA', cep: '40010-000' },
    { nome: 'Recife', estado: 'PE', cep: '50010-000' },
    { nome: 'Brasília', estado: 'DF', cep: '70040-000' },
    { nome: 'Fortaleza', estado: 'CE', cep: '60010-000' }
  ];

  const franquias = [];
  const lojas = [];

  for (let i = 0; i < 10; i++) {
    const cnpj = gerarCNPJValido();
    const cidade = cidades[i];
    
    const [franquia] = await Company.findOrCreate({
      where: { cnpj },
      defaults: {
        nome: `Franqueado ${String(i + 1).padStart(2, '0')} - ${cidade.nome}`,
        tipo: 'FRANQUIA',
        endereco: `Rua Principal, ${100 + i * 50}, Centro`,
        telefone: `(${11 + i}) 9${1000 + i}-${2000 + i}`,
        email: `franqueado${i + 1}@teclemotos.com`
      }
    });
    franquias.push(franquia);

    const [loja] = await Store.findOrCreate({
      where: { codigo: `TM-${String(i + 2).padStart(3, '0')}` },
      defaults: {
        nome: `Tecle Motos - ${cidade.nome}`,
        empresa_id: franquia.id,
        cidade: cidade.nome,
        estado: cidade.estado,
        endereco: `Av. Central, ${200 + i * 100}, Centro, ${cidade.cep}`,
        telefone: `(${11 + i}) 9${3000 + i}-${4000 + i}`,
        email: `loja.${cidade.nome.toLowerCase().replace(' ', '')}@teclemotos.com`,
        margem_padrao: 26.32
      }
    });
    lojas.push(loja);
  }

  const roles = await Role.findAll();
  const roleMap = {};
  roles.forEach(r => { roleMap[r.codigo] = r.id; });

  const tmiRoles = ['GERENTE_OP', 'GERENTE_OP', 'FINANCEIRO', 'FINANCEIRO', 'ADM1_LOGISTICA', 'ADM1_LOGISTICA', 'ADM2_CADASTRO', 'ADM2_CADASTRO', 'ADM3_OS_GARANTIA', 'GESTOR_DASHBOARD'];
  for (let i = 0; i < 10; i++) {
    const [user] = await User.findOrCreate({
      where: { email: `usuario.tmi${i + 1}@tmimports.com` },
      defaults: {
        nome: `Usuário TMI ${i + 1}`,
        senha: senhaHash,
        perfil: 'OPERACIONAL',
        empresa_id: matriz.id,
        loja_id: lojaCentral.id,
        primeiro_acesso: false
      }
    });
    if (roleMap[tmiRoles[i]]) {
      await UserRole.findOrCreate({
        where: { user_id: user.id, role_id: roleMap[tmiRoles[i]] },
        defaults: { principal: true }
      });
    }
  }

  for (let i = 0; i < 10; i++) {
    const [vendedor] = await User.findOrCreate({
      where: { email: `vendedor.tmi${i + 1}@tmimports.com` },
      defaults: {
        nome: `Vendedor TMI ${i + 1}`,
        senha: senhaHash,
        perfil: 'OPERACIONAL',
        empresa_id: matriz.id,
        loja_id: lojaCentral.id,
        primeiro_acesso: false
      }
    });
    await Vendor.findOrCreate({
      where: { user_id: vendedor.id },
      defaults: {
        nome: vendedor.nome,
        email: vendedor.email,
        telefone: `(11) 98${100 + i}-${1000 + i}`,
        comissao: 3 + (i % 5),
        desconto_maximo: 3.5,
        loja_id: lojaCentral.id
      }
    });
    if (roleMap['VENDEDOR_TMI']) {
      await UserRole.findOrCreate({
        where: { user_id: vendedor.id, role_id: roleMap['VENDEDOR_TMI'] },
        defaults: { principal: true }
      });
    }
  }

  for (let idx = 0; idx < 10; idx++) {
    const franquia = franquias[idx];
    const loja = lojas[idx];

    const [gestor] = await User.findOrCreate({
      where: { email: `gestor.${loja.codigo.toLowerCase()}@teclemotos.com` },
      defaults: {
        nome: `Gestor ${cidades[idx].nome}`,
        senha: senhaHash,
        perfil: 'GESTOR_FRANQUIA',
        empresa_id: franquia.id,
        loja_id: loja.id,
        primeiro_acesso: false
      }
    });
    if (roleMap['FRANQUEADO_GESTOR']) {
      await UserRole.findOrCreate({
        where: { user_id: gestor.id, role_id: roleMap['FRANQUEADO_GESTOR'] },
        defaults: { principal: true }
      });
    }

    const [gerente] = await User.findOrCreate({
      where: { email: `gerente.${loja.codigo.toLowerCase()}@teclemotos.com` },
      defaults: {
        nome: `Gerente ${cidades[idx].nome}`,
        senha: senhaHash,
        perfil: 'OPERACIONAL',
        empresa_id: franquia.id,
        loja_id: loja.id,
        primeiro_acesso: false
      }
    });
    if (roleMap['GERENTE_LOJA']) {
      await UserRole.findOrCreate({
        where: { user_id: gerente.id, role_id: roleMap['GERENTE_LOJA'] },
        defaults: { principal: true }
      });
    }

    for (let v = 0; v < 10; v++) {
      const [vendedor] = await User.findOrCreate({
        where: { email: `vendedor${v + 1}.${loja.codigo.toLowerCase()}@teclemotos.com` },
        defaults: {
          nome: `Vendedor ${v + 1} - ${cidades[idx].nome}`,
          senha: senhaHash,
          perfil: 'OPERACIONAL',
          empresa_id: franquia.id,
          loja_id: loja.id,
          primeiro_acesso: false
        }
      });
      await Vendor.findOrCreate({
        where: { user_id: vendedor.id },
        defaults: {
          nome: vendedor.nome,
          email: vendedor.email,
          telefone: `(${11 + idx}) 9${v}${100 + idx}-${2000 + v}`,
          comissao: 3 + (v % 4),
          desconto_maximo: 3.5,
          loja_id: loja.id
        }
      });
      if (roleMap['VENDEDOR_LOJA']) {
        await UserRole.findOrCreate({
          where: { user_id: vendedor.id, role_id: roleMap['VENDEDOR_LOJA'] },
          defaults: { principal: true }
        });
      }
    }
  }

  const [catMotos] = await Category.findOrCreate({ where: { nome: 'Motos Elétricas' }, defaults: { tipo: 'MOTO' } });
  const [catPecas] = await Category.findOrCreate({ where: { nome: 'Peças e Acessórios' }, defaults: { tipo: 'PECA' } });
  const [catServicos] = await Category.findOrCreate({ where: { nome: 'Serviços' }, defaults: { tipo: 'SERVICO' } });

  const motosData = [
    { nome: 'Scooter Urban 1500W', preco_custo: 4500, preco_venda: 6999, cor: 'Branco', capacidade_bateria: '48V 20Ah' },
    { nome: 'Scooter City 2000W', preco_custo: 5500, preco_venda: 8499, cor: 'Preto', capacidade_bateria: '60V 25Ah' },
    { nome: 'Scooter Sport 3000W', preco_custo: 7000, preco_venda: 10999, cor: 'Vermelho', capacidade_bateria: '72V 30Ah' },
    { nome: 'E-Moto Racing 3500W', preco_custo: 9000, preco_venda: 13999, cor: 'Azul Racing', capacidade_bateria: '72V 40Ah' },
    { nome: 'E-Moto Comfort 2500W', preco_custo: 6500, preco_venda: 9999, cor: 'Prata', capacidade_bateria: '60V 30Ah' },
    { nome: 'E-Bike Cargo 1000W', preco_custo: 3500, preco_venda: 5499, cor: 'Verde', capacidade_bateria: '48V 15Ah' },
    { nome: 'Triciclo Delivery 1500W', preco_custo: 5000, preco_venda: 7999, cor: 'Amarelo', capacidade_bateria: '60V 25Ah' },
    { nome: 'Scooter Premium 4000W', preco_custo: 11000, preco_venda: 16999, cor: 'Preto Fosco', capacidade_bateria: '72V 50Ah' },
    { nome: 'E-Moto Trail 3500W', preco_custo: 12000, preco_venda: 18499, cor: 'Laranja', capacidade_bateria: '72V 45Ah' },
    { nome: 'Scooter Eco 800W', preco_custo: 2500, preco_venda: 3999, cor: 'Branco', capacidade_bateria: '36V 12Ah' }
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
        estoque_minimo: 2
      }
    });
    motos.push(moto);
  }

  const pecasData = [
    { nome: 'Bateria 48V 20Ah Lithium', preco_custo: 800, preco_venda: 1299, ncm: '8507.60.00' },
    { nome: 'Bateria 60V 30Ah Lithium', preco_custo: 1200, preco_venda: 1899, ncm: '8507.60.00' },
    { nome: 'Controlador 1500W', preco_custo: 250, preco_venda: 449, ncm: '8504.40.90' },
    { nome: 'Motor Hub 2000W', preco_custo: 600, preco_venda: 999, ncm: '8501.31.00' },
    { nome: 'Carregador Universal 5A', preco_custo: 150, preco_venda: 279, ncm: '8504.40.10' },
    { nome: 'Pneu 10 polegadas', preco_custo: 80, preco_venda: 149, ncm: '4011.40.00' },
    { nome: 'Kit Freio Hidráulico', preco_custo: 180, preco_venda: 329, ncm: '8714.94.90' },
    { nome: 'Painel LCD Digital', preco_custo: 120, preco_venda: 229, ncm: '9029.20.10' },
    { nome: 'Farol LED Duplo', preco_custo: 60, preco_venda: 119, ncm: '8512.20.29' },
    { nome: 'Capacete Elétrico Pro', preco_custo: 100, preco_venda: 189, ncm: '6506.10.00' }
  ];
  const pecas = [];
  for (let i = 0; i < 10; i++) {
    const [peca] = await Product.findOrCreate({
      where: { codigo: `PECA-${String(i + 1).padStart(3, '0')}` },
      defaults: {
        nome: pecasData[i].nome,
        preco_custo: pecasData[i].preco_custo,
        preco_venda: pecasData[i].preco_venda,
        categoria_id: catPecas.id,
        tipo: 'PECA',
        percentual_lucro: 60,
        garantia: '6 meses',
        estoque_minimo: 5,
        observacoes: `NCM: ${pecasData[i].ncm}`
      }
    });
    pecas.push(peca);
  }

  const servicosData = [
    { nome: 'Mão de obra 15min', preco_venda: 70, parcelas_max: 1 },
    { nome: 'Mão de obra 30min', preco_venda: 140, parcelas_max: 1 },
    { nome: 'Mão de obra 45min', preco_venda: 270, parcelas_max: 2 },
    { nome: 'Mão de obra 1h', preco_venda: 330, parcelas_max: 3 },
    { nome: 'Revitalização Completa', preco_venda: 1200, parcelas_max: 5 },
    { nome: 'Serviço de Motor', preco_venda: 1000, parcelas_max: 5 },
    { nome: 'Serviço de Módulo', preco_venda: 700, parcelas_max: 4 },
    { nome: 'Troca Pneu Dianteiro', preco_venda: 150, parcelas_max: 2 },
    { nome: 'Troca Pneu Traseiro', preco_venda: 290, parcelas_max: 2 },
    { nome: 'Revisão Completa', preco_venda: 350, parcelas_max: 2 }
  ];
  const servicos = [];
  for (let i = 0; i < 10; i++) {
    const [servico] = await Product.findOrCreate({
      where: { codigo: `SERV-${String(i + 1).padStart(3, '0')}` },
      defaults: {
        nome: servicosData[i].nome,
        preco_custo: 0,
        preco_venda: servicosData[i].preco_venda,
        categoria_id: catServicos.id,
        tipo: 'SERVICO',
        percentual_lucro: 100,
        observacoes: `Parcelas máx: ${servicosData[i].parcelas_max}`
      }
    });
    servicos.push(servico);
  }

  const qtdEstoqueCentral = [0, 1, 2, 5, 10, 15, 20, 30, 8, 3];
  for (let i = 0; i < motos.length; i++) {
    await InventoryMain.findOrCreate({
      where: { produto_id: motos[i].id },
      defaults: { quantidade: qtdEstoqueCentral[i], localizacao: `A${i + 1}` }
    });
  }
  for (let i = 0; i < pecas.length; i++) {
    await InventoryMain.findOrCreate({
      where: { produto_id: pecas[i].id },
      defaults: { quantidade: qtdEstoqueCentral[i] * 3, localizacao: `B${i + 1}` }
    });
  }

  const qtdEstoqueLoja = [0, 1, 2, 2, 5, 5, 10, 10, 3, 1];
  for (const loja of lojas) {
    for (let i = 0; i < motos.length; i++) {
      await InventoryStore.findOrCreate({
        where: { loja_id: loja.id, produto_id: motos[i].id },
        defaults: { quantidade: qtdEstoqueLoja[i], preco_venda_local: parseFloat(motos[i].preco_venda) * 1.1 }
      });
    }
    for (let i = 0; i < pecas.length; i++) {
      await InventoryStore.findOrCreate({
        where: { loja_id: loja.id, produto_id: pecas[i].id },
        defaults: { quantidade: qtdEstoqueLoja[i] * 2, preco_venda_local: parseFloat(pecas[i].preco_venda) * 1.1 }
      });
    }
  }

  const nomesPF = ['João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa', 'Carlos Souza', 'Fernanda Lima', 'Ricardo Alves', 'Juliana Pereira', 'Bruno Rocha', 'Camila Mendes'];
  const nomesPJ = ['Auto Peças Express', 'Delivery Rápido', 'Frota Verde', 'EcoTransport', 'Motoboy Sul', 'LogiExpress', 'TransEco', 'MotoFrete', 'Entregas JP', 'FastBike'];
  
  for (const loja of lojas) {
    for (let i = 0; i < 10; i++) {
      await Customer.findOrCreate({
        where: { cpf_cnpj: gerarCPFValido(), loja_id: loja.id, nome: `${nomesPF[i]} - ${loja.cidade}` },
        defaults: {
          nome: `${nomesPF[i]} - ${loja.cidade}`,
          email: `${nomesPF[i].toLowerCase().replace(' ', '.')}${loja.id}@email.com`,
          telefone: `(${11 + lojas.indexOf(loja)}) 9${8000 + i}-${1000 + i}`,
          cidade: loja.cidade,
          estado: loja.estado,
          endereco: `Rua ${i + 1}, ${100 + i * 10}`
        }
      });
    }
    for (let i = 0; i < 10; i++) {
      await Customer.findOrCreate({
        where: { cpf_cnpj: gerarCNPJValido(), loja_id: loja.id, nome: `${nomesPJ[i]} - ${loja.cidade}` },
        defaults: {
          nome: `${nomesPJ[i]} - ${loja.cidade}`,
          email: `contato.${nomesPJ[i].toLowerCase().replace(' ', '')}${loja.id}@empresa.com`,
          telefone: `(${11 + lojas.indexOf(loja)}) 3${200 + i}-${3000 + i}`,
          cidade: loja.cidade,
          estado: loja.estado,
          endereco: `Av. Comercial, ${500 + i * 50}`
        }
      });
    }
  }

  const allCustomers = await Customer.findAll();
  const allVendors = await Vendor.findAll();
  
  let saleNum = 1;
  let osNum = 1;
  const formasPagamento = ['PIX', 'DINHEIRO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'BOLETO'];
  
  for (const loja of lojas) {
    const lojaCustomers = allCustomers.filter(c => c.loja_id === loja.id);
    const lojaVendors = allVendors.filter(v => v.loja_id === loja.id);

    for (let i = 0; i < 10; i++) {
      const cliente = lojaCustomers[i % lojaCustomers.length];
      const vendedor = lojaVendors[i % (lojaVendors.length || 1)];
      const dataVenda = randomDate(30);
      const formaPag = formasPagamento[i % 5];
      
      let produto, servico;
      let subtotal = 0;
      let parcelas = 1;
      
      if (i < 5) {
        produto = i < 2 ? motos[i % motos.length] : pecas[i % pecas.length];
        subtotal = parseFloat(produto.preco_venda);
        if (formaPag === 'CARTAO_CREDITO') {
          parcelas = produto.tipo === 'MOTO' ? Math.min(i + 2, 21) : Math.min(i + 1, 10);
        }
      } else if (i < 8) {
        produto = pecas[i % pecas.length];
        servico = servicos[i % servicos.length];
        subtotal = parseFloat(produto.preco_venda) + parseFloat(servico.preco_venda);
        parcelas = formaPag === 'CARTAO_CREDITO' ? Math.min(i, 10) : 1;
      } else {
        servico = servicos[i % servicos.length];
        subtotal = parseFloat(servico.preco_venda);
        parcelas = 1;
      }
      
      let juros = 0;
      if (formaPag === 'CARTAO_CREDITO' && parcelas > 1 && produto) {
        const taxas = {2:3.5,3:4.5,4:5.5,5:6.5,6:7.5,7:8.5,8:9.5,9:10.5,10:11.5,11:12.5,12:13.5};
        juros = (taxas[parcelas] || 0) / 100 * parseFloat(produto.preco_venda);
      }
      if (formaPag === 'CARTAO_DEBITO') {
        juros = 0.01 * subtotal;
      }
      
      let desconto = 0;
      if (['PIX', 'DINHEIRO'].includes(formaPag) && i % 3 === 0) {
        desconto = subtotal * 0.03;
      }
      
      const total = subtotal + juros - desconto;
      const status = i < 2 ? 'PENDENTE' : i === 9 ? 'CANCELADA' : 'CONCLUIDA';
      
      const [venda] = await Sale.findOrCreate({
        where: { numero: `VND-${String(saleNum).padStart(6, '0')}` },
        defaults: {
          loja_id: loja.id,
          cliente_id: cliente?.id,
          vendedor_id: vendedor?.id,
          data_venda: dataVenda,
          status,
          subtotal,
          desconto,
          total,
          forma_pagamento: formaPag,
          parcelas
        }
      });
      saleNum++;

      if (produto) {
        await SaleItem.findOrCreate({
          where: { venda_id: venda.id, produto_id: produto.id },
          defaults: { quantidade: 1, preco_unitario: produto.preco_venda, desconto: 0, total: produto.preco_venda }
        });
      }
      if (servico) {
        await SaleItem.findOrCreate({
          where: { venda_id: venda.id, produto_id: servico.id },
          defaults: { quantidade: 1, preco_unitario: servico.preco_venda, desconto: 0, total: servico.preco_venda }
        });
      }

      if (status === 'CONCLUIDA') {
        const venc = new Date(dataVenda);
        venc.setDate(venc.getDate() + 30);
        const pago = i % 3 === 0;
        await PaymentReceivable.findOrCreate({
          where: { venda_id: venda.id },
          defaults: {
            loja_id: loja.id,
            cliente_id: cliente?.id,
            descricao: `Venda ${venda.numero}`,
            valor: total,
            data_vencimento: venc,
            status: pago ? 'PAGO' : 'PENDENTE',
            data_pagamento: pago ? new Date() : null
          }
        });
      }
    }

    for (let i = 0; i < 10; i++) {
      const cliente = lojaCustomers[i % lojaCustomers.length];
      const vendedor = lojaVendors[i % (lojaVendors.length || 1)];
      const dataOS = randomDate(30);
      
      const status = i < 5 ? ['ABERTA', 'EM_EXECUCAO', 'ABERTA', 'EM_EXECUCAO', 'ABERTA'][i] : 'CONCLUIDA';
      const servico = servicos[i % servicos.length];
      const peca = pecas[i % pecas.length];
      const totalServico = parseFloat(servico.preco_venda);
      const totalPeca = i % 2 === 0 ? parseFloat(peca.preco_venda) : 0;
      const total = totalServico + totalPeca;

      const [os] = await ServiceOrder.findOrCreate({
        where: { numero: `OS-${String(osNum).padStart(6, '0')}` },
        defaults: {
          loja_id: loja.id,
          cliente_id: cliente?.id,
          vendedor_id: vendedor?.id,
          veiculo_marca: ['Tecle', 'X-Moto', 'EcoRide', 'GreenMoto', 'VoltBike'][i % 5],
          veiculo_modelo: ['Sport 2000W', 'City 1500W', 'Cargo 1000W', 'Trail 3000W', 'Urban 800W'][i % 5],
          veiculo_placa: `ABC${loja.id}${i}${String.fromCharCode(65 + i)}${10 + i}`,
          problema_relatado: ['Não liga', 'Bateria fraca', 'Barulho no motor', 'Freio travando', 'Painel apagado', 'Pneu furado', 'Luz queimada', 'Acelerador lento', 'Ruído estranho', 'Revisão preventiva'][i],
          status,
          total,
          data_abertura: dataOS,
          data_previsao: new Date(dataOS.getTime() + 3 * 24 * 60 * 60 * 1000),
          data_conclusao: status === 'CONCLUIDA' ? new Date() : null
        }
      });
      osNum++;

      await ServiceOrderItem.findOrCreate({
        where: { os_id: os.id, produto_id: servico.id },
        defaults: { tipo: 'SERVICO', quantidade: 1, preco_unitario: totalServico, total: totalServico }
      });
      if (totalPeca > 0) {
        await ServiceOrderItem.findOrCreate({
          where: { os_id: os.id, produto_id: peca.id },
          defaults: { tipo: 'PECA', quantidade: 1, preco_unitario: totalPeca, total: totalPeca }
        });
      }
    }

    for (let i = 0; i < 10; i++) {
      const diasVenc = i < 3 ? -(5 + i * 3) : (i < 5 ? 0 : (i - 5) * 7);
      const venc = new Date();
      venc.setDate(venc.getDate() + diasVenc);
      
      let status;
      if (i < 3) status = 'PENDENTE';
      else if (i < 6) status = 'PAGO';
      else status = 'PENDENTE';
      
      await PaymentReceivable.findOrCreate({
        where: { loja_id: loja.id, descricao: `Recebimento Avulso ${loja.id}-${i + 1}` },
        defaults: {
          descricao: `Recebimento Avulso ${loja.id}-${i + 1}`,
          valor: 200 + (i * 150),
          data_vencimento: venc,
          status,
          data_pagamento: status === 'PAGO' ? new Date() : null
        }
      });
    }

    const categoriasPagar = ['FORNECEDOR', 'FIXO', 'VARIAVEL'];
    const descricoesPagar = ['Compra Peças', 'Aluguel', 'Energia', 'Internet', 'Água', 'Material Escritório', 'Marketing', 'Manutenção', 'Impostos', 'Salários'];
    for (let i = 0; i < 10; i++) {
      const diasVenc = i < 2 ? -(10 + i * 5) : (i < 5 ? (i * 5) : (i - 5) * 10);
      const venc = new Date();
      venc.setDate(venc.getDate() + diasVenc);
      
      let status;
      if (i < 5) status = 'PENDENTE';
      else if (i < 8) status = 'PAGO';
      else status = 'PENDENTE';
      
      await PaymentPayable.findOrCreate({
        where: { loja_id: loja.id, descricao: `${descricoesPagar[i]} - ${loja.cidade}` },
        defaults: {
          descricao: `${descricoesPagar[i]} - ${loja.cidade}`,
          valor: 300 + (i * 250),
          data_vencimento: venc,
          status,
          data_pagamento: status === 'PAGO' ? new Date() : null,
          categoria: categoriasPagar[i % 3]
        }
      });
    }
  }

  const statusPedidos = ['PENDENTE', 'PENDENTE', 'APROVADA', 'APROVADA', 'FATURADA', 'FATURADA', 'ENVIADA', 'ENVIADA', 'RECEBIDA', 'RECEBIDA'];
  for (let i = 0; i < 10; i++) {
    const loja = lojas[i % lojas.length];
    const dataPedido = randomDate(30);

    const [pedido] = await PurchaseRequest.findOrCreate({
      where: { numero: `PED-${String(i + 1).padStart(6, '0')}` },
      defaults: {
        loja_id: loja.id,
        status: statusPedidos[i],
        observacoes: `Pedido de reposição ${i + 1}`,
        data_aprovacao: ['APROVADA', 'FATURADA', 'ENVIADA', 'RECEBIDA'].includes(statusPedidos[i]) ? new Date() : null,
        data_envio: ['ENVIADA', 'RECEBIDA'].includes(statusPedidos[i]) ? new Date() : null,
        data_recebimento: statusPedidos[i] === 'RECEBIDA' ? new Date() : null
      }
    });

    const qtdItens = 2 + (i % 3);
    for (let j = 0; j < qtdItens; j++) {
      const produto = j % 2 === 0 ? motos[(i + j) % motos.length] : pecas[(i + j) % pecas.length];
      const qtd = 1 + (j % 3);
      await PurchaseRequestItem.findOrCreate({
        where: { solicitacao_id: pedido.id, produto_id: produto.id },
        defaults: {
          quantidade: qtd,
          preco_unitario: produto.preco_custo,
          total: parseFloat(produto.preco_custo) * qtd
        }
      });
    }
  }

  const totalClientes = await Customer.count();
  const totalVendas = await Sale.count();
  const totalOS = await ServiceOrder.count();
  const totalReceber = await PaymentReceivable.count();
  const totalPagar = await PaymentPayable.count();
  const totalPedidos = await PurchaseRequest.count();

  console.log('========================================');
  console.log('SEED CONCLUÍDO COM SUCESSO!');
  console.log('========================================');
  console.log(`Franquias: 10`);
  console.log(`Lojas: ${lojas.length + 1} (incluindo central)`);
  console.log(`Clientes: ${totalClientes}`);
  console.log(`Vendas: ${totalVendas}`);
  console.log(`Ordens de Serviço: ${totalOS}`);
  console.log(`Contas a Receber: ${totalReceber}`);
  console.log(`Contas a Pagar: ${totalPagar}`);
  console.log(`Pedidos de Franquia: ${totalPedidos}`);
  console.log('========================================');
}

async function resetAndSeed(models) {
  const { sequelize } = models;
  
  console.log('Resetting database...');
  
  await sequelize.query("SET session_replication_role = replica");
  
  const tables = [
    'audit_logs', 'invoice_events', 'invoice_items', 'invoices', 'fiscal_data',
    'purchase_request_items', 'purchase_requests', 'bank_transactions', 'bank_accounts',
    'reconciliation_rules', 'payments_payable', 'payments_receivable', 'os_items',
    'service_orders', 'sales_items', 'sales', 'inventory_movements', 'inventory_store',
    'inventory_main', 'vendors', 'customers', 'products', 'notifications',
    'user_roles', 'users', 'stores', 'companies', 'settings', 'roles', 'categories'
  ];
  
  for (const table of tables) {
    try {
      await sequelize.query(`TRUNCATE TABLE ${table} CASCADE`);
    } catch (e) {}
  }
  
  await sequelize.query("SET session_replication_role = DEFAULT");
  
  console.log('Database reset complete. Restarting initialization...');
}

module.exports = { runSeed, resetAndSeed, gerarCPFValido, gerarCNPJValido };
