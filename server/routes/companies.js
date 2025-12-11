const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Company, Store, User, AuditLog, sequelize } = require('../models');
const { verifyToken, isAdminGlobal } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const where = {};
    if (req.user.perfil !== 'ADMIN_GLOBAL') {
      where.id = req.user.empresa_id;
    }

    const companies = await Company.findAll({
      where,
      include: [
        { model: Store, as: 'lojas' },
        { 
          model: User, 
          where: { perfil: 'GESTOR_FRANQUIA' },
          required: false,
          attributes: ['id', 'nome', 'email', 'ativo']
        }
      ],
      order: [['nome', 'ASC']]
    });

    res.json(companies);
  } catch (error) {
    console.error('Erro ao listar empresas:', error);
    res.status(500).json({ error: 'Erro ao listar empresas' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id, {
      include: [{ model: Store, as: 'lojas' }]
    });

    if (!company) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    res.json(company);
  } catch (error) {
    console.error('Erro ao buscar empresa:', error);
    res.status(500).json({ error: 'Erro ao buscar empresa' });
  }
});

router.post('/', isAdminGlobal, async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { 
      nome, cnpj, endereco, telefone, email,
      loja_nome, loja_cidade, loja_estado,
      admin_nome, admin_email, admin_senha
    } = req.body;

    if (!admin_email || !admin_senha) {
      await t.rollback();
      return res.status(400).json({ error: 'Email e senha do administrador são obrigatórios' });
    }

    const existingUser = await User.findOne({ where: { email: admin_email } });
    if (existingUser) {
      await t.rollback();
      return res.status(400).json({ error: 'Já existe um usuário com este email' });
    }

    const company = await Company.create({
      nome,
      cnpj,
      tipo: 'FRANQUIA',
      endereco,
      telefone,
      email
    }, { transaction: t });

    const codigoLoja = `FR${String(company.id).padStart(3, '0')}`;
    const store = await Store.create({
      nome: loja_nome || nome,
      codigo: codigoLoja,
      empresa_id: company.id,
      endereco,
      cidade: loja_cidade,
      estado: loja_estado,
      telefone,
      email
    }, { transaction: t });

    const senhaHash = await bcrypt.hash(admin_senha, 10);
    const admin = await User.create({
      nome: admin_nome || 'Gestor ' + nome,
      email: admin_email,
      senha: senhaHash,
      perfil: 'GESTOR_FRANQUIA',
      empresa_id: company.id,
      loja_id: store.id,
      primeiro_acesso: true
    }, { transaction: t });

    await AuditLog.create({
      user_id: req.user.id,
      acao: 'CREATE',
      tabela: 'companies',
      registro_id: company.id,
      dados_depois: { 
        franquia: nome, 
        loja: store.nome, 
        admin: admin_email 
      }
    }, { transaction: t });

    await t.commit();

    res.status(201).json({
      ...company.toJSON(),
      lojas: [store],
      Users: [{ id: admin.id, nome: admin.nome, email: admin.email, ativo: admin.ativo }]
    });
  } catch (error) {
    await t.rollback();
    console.error('Erro ao criar franquia:', error);
    res.status(500).json({ error: 'Erro ao criar franquia: ' + error.message });
  }
});

router.put('/:id', isAdminGlobal, async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);
    if (!company) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    const dadosAntes = { nome: company.nome, ativo: company.ativo };

    await company.update(req.body);

    await AuditLog.create({
      user_id: req.user.id,
      acao: 'UPDATE',
      tabela: 'companies',
      registro_id: company.id,
      dados_antes: dadosAntes,
      dados_depois: { nome: company.nome, ativo: company.ativo }
    });

    res.json(company);
  } catch (error) {
    console.error('Erro ao atualizar empresa:', error);
    res.status(500).json({ error: 'Erro ao atualizar empresa' });
  }
});

router.delete('/:id', isAdminGlobal, async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);
    if (!company) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    await AuditLog.create({
      user_id: req.user.id,
      acao: 'DELETE',
      tabela: 'companies',
      registro_id: company.id,
      dados_antes: { nome: company.nome }
    });

    await company.destroy();
    res.json({ message: 'Empresa excluída' });
  } catch (error) {
    console.error('Erro ao excluir empresa:', error);
    res.status(500).json({ error: 'Erro ao excluir empresa' });
  }
});

module.exports = router;
