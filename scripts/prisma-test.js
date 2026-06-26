const fs = require('fs');
const path = require('path');

const rootDb = path.resolve(__dirname, '..', 'db', 'custom.db');
console.log('Project root DB path:', rootDb);
console.log('Exists:', fs.existsSync(rootDb));
if (fs.existsSync(rootDb)) {
  console.log('Size:', fs.statSync(rootDb).size);
}

const formats = [
  'file:./db/custom.db',
  `file:${rootDb.replace(/\\/g, '/')}`,
  `file:${rootDb}`,
  `file:///${rootDb.replace(/\\/g, '/').replace(/^[A-Za-z]:/, (match) => match[0].toUpperCase() + ':')}`,
];

const { PrismaClient } = require('../node_modules/@prisma/client');

async function test(url) {
  console.log('\nTesting DATABASE_URL =', url);
  process.env.DATABASE_URL = url;
  const prisma = new PrismaClient();
  try {
    const result = await prisma.$queryRawUnsafe('SELECT 1 AS ok');
    console.log('  Query result:', result);
  } catch (error) {
    console.error('  Prisma error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

;(async () => {
  for (const url of formats) {
    await test(url);
  }
})();
