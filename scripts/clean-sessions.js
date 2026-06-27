const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function run() {
  const sp = await db.sessionParticipant.deleteMany();
  console.log('SessionParticipants deleted:', sp.count);

  const st = await db.settlement.deleteMany();
  console.log('Settlements deleted:', st.count);

  const ss = await db.session.deleteMany();
  console.log('Sessions deleted:', ss.count);

  console.log('Done! All session data cleaned.');
  await db['$disconnect']();
}

run();
