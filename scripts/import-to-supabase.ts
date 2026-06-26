/**
 * Script import data từ data-export.json → Supabase (PostgreSQL)
 * 
 * Chạy: npx tsx scripts/import-to-supabase.ts
 * 
 * LƯU Ý: 
 * - Hãy đổi DATABASE_URL và DIRECT_URL trong .env sang Supabase trước
 * - Chạy `npx prisma db push` trước để tạo schema trên Supabase
 * - File data-export.json phải tồn tại (từ bước export)
 */

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
  const exportPath = path.join(process.cwd(), 'data-export.json')

  if (!fs.existsSync(exportPath)) {
    console.error('❌ Không tìm thấy file data-export.json')
    console.error('   Hãy chạy: npx tsx scripts/export-sqlite.ts trước')
    process.exit(1)
  }

  const raw = fs.readFileSync(exportPath, 'utf-8')
  const { data, counts } = JSON.parse(raw)

  console.log('🚀 Đang import data vào Supabase...')
  console.log(`   📊 Sẽ import: ${counts.users} users, ${counts.sessions} sessions, ${counts.sessionParticipants} participants, ${counts.settlements} settlements`)

  // Import theo thứ tự (tránh foreign key conflict)
  
  // 1. Users
  if (data.users.length > 0) {
    console.log('👤 Importing users...')
    await prisma.user.createMany({
      data: data.users,
      skipDuplicates: true,
    })
    console.log(`   ✅ ${data.users.length} users`)
  }

  // 2. Sessions
  if (data.sessions.length > 0) {
    console.log('🏓 Importing sessions...')
    for (const session of data.sessions) {
      await prisma.session.create({
        data: {
          ...session,
          date: new Date(session.date),
          createdAt: new Date(session.createdAt),
        },
      })
    }
    console.log(`   ✅ ${data.sessions.length} sessions`)
  }

  // 3. SessionParticipants
  if (data.sessionParticipants.length > 0) {
    console.log('👥 Importing session participants...')
    await prisma.sessionParticipant.createMany({
      data: data.sessionParticipants,
      skipDuplicates: true,
    })
    console.log(`   ✅ ${data.sessionParticipants.length} participants`)
  }

  // 4. Settlements
  if (data.settlements.length > 0) {
    console.log('💰 Importing settlements...')
    for (const settlement of data.settlements) {
      await prisma.settlement.create({
        data: {
          ...settlement,
          createdAt: new Date(settlement.createdAt),
        },
      })
    }
    console.log(`   ✅ ${data.settlements.length} settlements`)
  }

  console.log('')
  console.log('🎉 Import hoàn tất! Data đã lên Supabase.')
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi import:', e.message)
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
