// Entrypoint para deploy - executa o servidor TypeScript compilado
// Em produção, use: NODE_ENV=production npx tsx server/src/index.ts
require('child_process').execSync('NODE_ENV=production npx tsx server/src/index.ts', { stdio: 'inherit' });
