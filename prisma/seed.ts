import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Xóa data cũ
  await prisma.sessionParticipant.deleteMany();
  await prisma.session.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.user.deleteMany();

  // Tạo 3 user với username + zalo nickname
  await prisma.user.createMany({
    data: [
      { username: "admin", name: "Admin Tuấn", zaloNickname: "TuanPickleball", role: "ADMIN", balance: 0 },
      { username: "an", name: "User An", zaloNickname: "An deptrai", role: "USER", balance: 0 },
      { username: "binh", name: "User Bình", zaloNickname: "Binh volley", role: "USER", balance: 0 },
    ],
  });

  console.log("✅ Seed data created successfully!");
  console.log("  - admin / Admin Tuấn (ADMIN) — Zalo: TuanPickleball");
  console.log("  - an / User An (USER) — Zalo: An deptrai");
  console.log("  - binh / User Bình (USER) — Zalo: Binh volley");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });