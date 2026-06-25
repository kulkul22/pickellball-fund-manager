---
Task ID: 1
Agent: Main Agent
Task: Build "Quản lý quỹ Pickleball" - a full-stack Next.js app for managing pickleball fund

Work Log:
- Examined existing project structure (Next.js 16, Tailwind CSS 4, Prisma, shadcn/ui)
- Created prisma/schema.prisma with User, Session, SessionParticipant, Settlement models
- Created prisma/seed.ts to seed 3 users (Admin Tuấn, User An, User Bình)
- Updated package.json with prisma seed config and tsx dependency
- Used existing lib/db.ts as PrismaClient singleton
- Created API routes: /api/users (GET), /api/sessions (GET/POST), /api/settlements (GET/POST), /api/settlements/[id] (PATCH)
- Created Dashboard page (app/page.tsx) with: user selector, balance display, admin actions, settlement management, create session modal
- Created History page (app/history/page.tsx) with timeline using <details> elements
- Ran db push, seed, and verified all APIs via curl
- Browser-verified: dashboard renders, user switching works, admin/non-admin views differ correctly, settlements display and actions work, history page shows session details

Stage Summary:
- All 4 API routes tested and verified (users, sessions, settlements, settlements/[id])
- Dashboard: user dropdown, balance (red/green), admin buttons (create/tổng kết), settlement actions (SEND/RECEIVE/ADMIN_FORCE)
- History: timeline with expandable <details> showing payer, location, cost per person, participants
- Debt simplification algorithm works correctly (greedy matching)
- Zero console errors in browser verification