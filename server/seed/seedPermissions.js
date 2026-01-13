const { Permission, UserPermission, User } = require('../models');
const { PERMISSIONS_CATALOG, LEGACY_PROFILE_MAPPING } = require('./permissionsData');

async function seedPermissions() {
  console.log('Seeding permissions catalog...');
  
  for (const perm of PERMISSIONS_CATALOG) {
    await Permission.findOrCreate({
      where: { key: perm.key },
      defaults: perm
    });
  }
  
  console.log(`${PERMISSIONS_CATALOG.length} permissions seeded.`);
}

async function migrateUserPermissions() {
  console.log('Migrating user permissions from legacy profiles...');
  
  const users = await User.findAll({
    where: { perfil: { [require('sequelize').Op.ne]: 'ADMIN_GLOBAL' } }
  });
  
  let migratedCount = 0;
  
  for (const user of users) {
    const existingPerms = await UserPermission.count({ where: { user_id: user.id } });
    
    if (existingPerms > 0) {
      continue;
    }
    
    const legacyPerms = LEGACY_PROFILE_MAPPING[user.perfil];
    
    if (legacyPerms && legacyPerms.length > 0) {
      for (const permKey of legacyPerms) {
        await UserPermission.findOrCreate({
          where: { user_id: user.id, permission_key: permKey },
          defaults: { user_id: user.id, permission_key: permKey }
        });
      }
      migratedCount++;
      console.log(`Migrated ${legacyPerms.length} permissions for user ${user.email} (${user.perfil})`);
    }
  }
  
  console.log(`${migratedCount} users migrated to new permission system.`);
}

module.exports = { seedPermissions, migrateUserPermissions };
