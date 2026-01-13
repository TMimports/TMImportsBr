const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { User, Company, Store, AuditLog, Role, UserRole, Permission, UserPermission } = require('../models');
const { verifyToken, isAdminGlobal, isGestorOuAdmin } = require('../middleware/auth');
const { requirePermission, requireAnyPermission } = require('../middleware/permissions');
const { MODULES_ORDER } = require('../seed/permissionsData');

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
      const rolesAnteriores = await UserRole.findAll({ where: { user_id: user.id } });
      const roleIdsAnteriores = rolesAnteriores.map(r => r.role_id);
      
      const mudouRoles = JSON.stringify(roleIdsAnteriores.sort()) !== JSON.stringify(role_ids.sort());
      
      await UserRole.destroy({ where: { user_id: user.id } });
      
      if (role_ids.length > 0) {
        const roleAssociations = role_ids.map((roleId, index) => ({
          user_id: user.id,
          role_id: roleId,
          principal: index === 0
        }));
        await UserRole.bulkCreate(roleAssociations);
        
        const primeiraRole = await Role.findByPk(role_ids[0]);
        if (primeiraRole) {
          if (mudouRoles) {
            await user.update({ 
              perfil: primeiraRole.codigo,
              primeiro_acesso: true,
              token_version: (user.token_version || 0) + 1
            });
          } else {
            await user.update({ perfil: primeiraRole.codigo });
          }
        }
      } else if (mudouRoles) {
        await user.update({ 
          primeiro_acesso: true,
          token_version: (user.token_version || 0) + 1
        });
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

router.get('/permissions/catalog', requireAnyPermission('users.view', 'users.permissions_manage'), async (req, res) => {
  try {
    const permissions = await Permission.findAll({
      order: [['sort_order', 'ASC'], ['module', 'ASC']]
    });
    
    const grouped = {};
    for (const perm of permissions) {
      if (!grouped[perm.module]) {
        const moduleInfo = MODULES_ORDER.find(m => m.code === perm.module) || { label: perm.module, icon: 'folder' };
        grouped[perm.module] = {
          code: perm.module,
          label: moduleInfo.label,
          icon: moduleInfo.icon,
          permissions: []
        };
      }
      grouped[perm.module].permissions.push({
        key: perm.key,
        label: perm.label,
        description: perm.description
      });
    }
    
    const modulesOrdered = MODULES_ORDER.filter(m => grouped[m.code]).map(m => grouped[m.code]);
    
    res.json({ modules: modulesOrdered });
  } catch (error) {
    console.error('Erro ao listar permissões:', error);
    res.status(500).json({ error: 'Erro ao listar permissões' });
  }
});

router.get('/:id/permissions', requireAnyPermission('users.view', 'users.permissions_manage'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    if (user.perfil === 'ADMIN_GLOBAL') {
      return res.json({ permissions: ['*'], isAdminGlobal: true });
    }
    
    const userPerms = await UserPermission.findAll({
      where: { user_id: user.id },
      attributes: ['permission_key']
    });
    
    res.json({ 
      permissions: userPerms.map(p => p.permission_key),
      isAdminGlobal: false
    });
  } catch (error) {
    console.error('Erro ao buscar permissões do usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar permissões' });
  }
});

router.put('/:id/permissions', requirePermission('users.permissions_manage'), async (req, res) => {
  try {
    const { permissions } = req.body;
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    if (user.perfil === 'ADMIN_GLOBAL') {
      return res.status(400).json({ error: 'Não é possível alterar permissões do ADMIN_GLOBAL' });
    }
    
    if (!req.user.isAdmin && req.user.perfil !== 'ADMIN_GLOBAL') {
      if (user.loja_id !== req.user.loja_id) {
        return res.status(403).json({ error: 'Sem permissão para alterar este usuário' });
      }
    }
    
    const oldPerms = await UserPermission.findAll({
      where: { user_id: user.id },
      attributes: ['permission_key']
    });
    
    await UserPermission.destroy({ where: { user_id: user.id } });
    
    if (Array.isArray(permissions) && permissions.length > 0) {
      const newPerms = permissions.map(perm => ({
        user_id: user.id,
        permission_key: perm
      }));
      await UserPermission.bulkCreate(newPerms);
    }
    
    await user.update({ 
      token_version: (user.token_version || 0) + 1,
      primeiro_acesso: true
    });
    
    await AuditLog.create({
      user_id: req.user.id,
      acao: 'UPDATE_PERMISSIONS',
      entidade: 'users',
      entidade_id: user.id,
      dados_anteriores: { permissions: oldPerms.map(p => p.permission_key) },
      dados_novos: { permissions }
    });
    
    res.json({ message: 'Permissões atualizadas com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar permissões:', error);
    res.status(500).json({ error: 'Erro ao atualizar permissões' });
  }
});

module.exports = router;
