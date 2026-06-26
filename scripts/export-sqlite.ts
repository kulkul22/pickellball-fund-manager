/**
 * Script export toàn bộ data từ SQLite → data-export.json
 * 
 * Chạy: npx tsx scripts/export-sqlite.ts
 * 
 * LƯU Ý: Chạy lệnh này TRƯỚC khi đổi DATABASE_URL sang Supabase
 */

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

// Đảm bảo dùng SQLite local
const dbUrl = process.env.DATABASE_URL
if (!dbUrl?.startsWith('file:')) {
  console.error('❌ DATABASE_URL không phải SQLite. Hãy chắc chắn .env đang trỏ đến SQLite local.')
  process.exit(1)
}

// Resolve path tuyệt đối
const filePath = dbUrl.slice(5)
if (!path.isAbsolute(filePath)) {
  process.env.DATABASE_URL = `file:${path.resolve(process.cwd(), filePath)}`
}

const prisma = new PrismaClient()

async function main() {
  console.log('📦 Đang export data từ SQLite...')

  const users = await prisma.user.findMany()
  const sessions = await prisma.session.findMany()
  const sessionParticipants = await prisma.sessionParticipant.findMany()
  const settlements = await prisma.settlement.findMany()

  const exportData = {
    exportedAt: new Date().toISOString(),
    counts: {
      users: users.length,
      sessions: sessions.length,
      sessionParticipants: sessionParticipants.length,
      settlements: settlements.length,
    },
    data: {
      users,
      sessions,
      sessionParticipants,
      settlements,
    },
  }

  const outputPath = path.join(process.cwd(), 'data-export.json')
  fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf-8')

  console.log('✅ Export thành công!')
  console.log(`   📁 File: ${outputPath}`)
  console.log(`   👤 Users: ${users.length}`)
  console.log(`   🏓 Sessions: ${sessions.length}`)
  console.log(`   👥 SessionParticipants: ${sessionParticipants.length}`)
  console.log(`   💰 Settlements: ${settlements.length}`)
}

main()
  .catch((e) => {
    console.error('❌ Lỗi:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
