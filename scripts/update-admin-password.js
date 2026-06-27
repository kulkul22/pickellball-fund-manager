const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const result = await db.user.update({
    where: { username: 'admin' },
    data: { password: 'admin@123' }
  });
  console.log('✅ Admin password updated to admin@123 successfully for user:', result.name);
}

main()
  .catch(err => console.error('Error updating admin password:', err))
  .finally(() => db.$disconnect());
