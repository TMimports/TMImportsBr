const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { User, Company, Store, AuditLog, Role, UserRole } = require('../models');
const { verifyToken, isAdminGlobal, isGestorOuAdmin, hasPermission } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', isGestorOuAdmin, async (req, res) => {
  try {
    const where = {};
    if (req.user.perfil !== 'ADMIN_GLOBAL') {
      where.loja_id = req.user.loja_id;
    }

    const users = await User.findAll({
      where,
      include: [
        { model: Store, as: 'loja' },
        { model: Company }
      ],
      order: [['nome', 'ASC']]
    });

    res.json(users.map(u => ({
      id: u.id,
      nome: u.nome,
      email: u.email,
      perfil: u.perfil,
      ativo: u.ativo,
      loja: u.loja,
      Company: u.Company,
      ultimo_acesso: u.ultimo_acesso
    })));
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

router.get('/:id', isGestorOuAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [
        { model: Store, as: 'loja', include: [{ model: Company, as: 'empresa' }] },
        { model: Role, as: 'roles' }
      ]
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (req.user.perfil !== 'ADMIN_GLOBAL' && user.loja_id !== req.user.loja_id) {
      return res.status(403).json({ error: 'Sem permissão para ver este usuário' });
    }

    const userRoles = await UserRole.findAll({
      where: { user_id: user.id },
      include: [{ model: Role, as: 'role' }]
    });

    res.json({
      id: user.id,
      nome: user.nome,
      email: user.email,
      perfil: user.perfil,
      ativo: user.ativo,
      loja_id: user.loja_id,
      loja: user.loja,
      UserRoles: userRoles
    });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

router.post('/', isGestorOuAdmin, async (req, res) => {
  try {
    const { nome, email, senha, perfil, loja_id, empresa_id, permissoes, role_ids } = req.body;

    const existente = await User.findOne({ where: { email } });
    if (existente) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const senhaHash = await bcrypt.hash(senha || 'temp123', 10);

    let finalLojaId = loja_id;
    let finalEmpresaId = empresa_id;
    
    if (req.user.perfil !== 'ADMIN_GLOBAL') {
      finalLojaId = req.user.loja_id;
      finalEmpresaId = req.user.empresa_id;
    }

    const user = await User.create({
      nome,
      email,
      senha: senhaHash,
      perfil: perfil || 'OPERACIONAL',
      loja_id: finalLojaId,
      empresa_id: finalEmpresaId,
      permissoes: permissoes || {},
      primeiro_acesso: true
    });

    if (role_ids && Array.isArray(role_ids) && role_ids.length > 0) {
      const roleAssociations = role_ids.map((roleId, index) => ({
        user_id: user.id,
        role_id: roleId,
        principal: index === 0
      }));
      await UserRole.bulkCreate(roleAssociations);
    } else {
      const perfilRole = await Role.findOne({ where: { codigo: perfil || 'OPERACIONAL' } });
      if (perfilRole) {
        await UserRole.create({
          user_id: user.id,
          role_id: perfilRole.id,
          principal: true
        });
      }
    }

    await AuditLog.create({
      user_id: req.user.id,
      acao: 'CREATE',
      tabela: 'users',
      registro_id: user.id,
      dados_depois: { nome, email, perfil: user.perfil, roles: role_ids }
    });

    res.status(201).json({ id: user.id, nome: user.nome, email: user.email });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

router.put('/:id', isGestorOuAdmin, async (req, res) => {
  try {
    const { nome, email, senha, perfil, ativo, loja_id, permissoes, role_ids } = req.body;
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (req.user.perfil !== 'ADMIN_GLOBAL' && user.loja_id !== req.user.loja_id) {
      return res.status(403).json({ error: 'Sem permissão para editar este usuário' });
    }

    const dadosAntes = { nome: user.nome, email: user.email, perfil: user.perfil, ativo: user.ativo };

    const updateData = {
      nome: nome || user.nome,
      email: email || user.email,
      perfil: req.user.perfil === 'ADMIN_GLOBAL' ? (perfil || user.perfil) : user.perfil,
      ativo: ativo !== undefined ? ativo : user.ativo,
      loja_id: req.user.perfil === 'ADMIN_GLOBAL' ? (loja_id || user.loja_id) : user.loja_id,
      permissoes: permissoes || user.permissoes
    };

    if (senha && senha.trim() !== '') {
      updateData.senha = await bcrypt.hash(senha, 10);
    }

    await user.update(updateData);

    if (role_ids && Array.isArray(role_ids) && req.user.perfil === 'ADMIN_GLOBAL') {
      await UserRole.destroy({ where: { user_id: user.id } });
      
      if (role_ids.length > 0) {
        const roleAssociations = role_ids.map((roleId, index) => ({
          user_id: user.id,
          role_id: roleId,
          principal: index === 0
        }));
        await UserRole.bulkCreate(roleAssociations);
      }
    }

    await AuditLog.create({
      user_id: req.user.id,
      acao: 'UPDATE',
      tabela: 'users',
      registro_id: user.id,
      dados_antes: dadosAntes,
      dados_depois: { nome: user.nome, email: user.email, perfil: user.perfil, ativo: user.ativo, roles: role_ids }
    });

    res.json({ message: 'Usuário atualizado' });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

router.post('/:id/reset-senha', isGestorOuAdmin, async (req, res) => {
  try {
    const { novaSenha } = req.body;
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const senhaHash = await bcrypt.hash(novaSenha || 'temp123', 10);
    await user.update({ senha: senhaHash, primeiro_acesso: true });

    res.json({ message: 'Senha resetada com sucesso' });
  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    res.status(500).json({ error: 'Erro ao resetar senha' });
  }
});

router.delete('/:id', isAdminGlobal, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    await AuditLog.create({
      user_id: req.user.id,
      acao: 'DELETE',
      tabela: 'users',
      registro_id: user.id,
      dados_antes: { nome: user.nome, email: user.email }
    });

    await user.destroy();
    res.json({ message: 'Usuário excluído' });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});

module.exports = router;
