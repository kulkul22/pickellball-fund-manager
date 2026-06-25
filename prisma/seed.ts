import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Xóa data cũ
  await prisma.sessionParticipant.deleteMany();
  await prisma.session.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.user.deleteMany();

  // Tạo 3 user
  await prisma.user.createMany({
    data: [
      { name: "Admin Tuấn", role: "ADMIN", balance: 0 },
      { name: "User An", role: "USER", balance: 0 },
      { name: "User Bình", role: "USER", balance: 0 },
    ],
  });

  console.log("✅ Seed data created successfully!");
  console.log("  - Admin Tuấn (ADMIN)");
  console.log("  - User An (USER)");
  console.log("  - User Bình (USER)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });