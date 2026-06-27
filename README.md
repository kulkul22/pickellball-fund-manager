# 🏸 Quản lý Quỹ Pickleball

> Ứng dụng web quản lý quỹ chi phí chơi Pickleball cho nhóm bạn. Theo dõi các buổi đánh, tự động tính toán công nợ, và hỗ trợ thanh toán giữa các thành viên.

🔗 **Live Demo**: [https://workspace-fund-pickellball-manager.vercel.app](https://workspace-fund-pickellball-manager.vercel.app)

---

## 📋 Mục lục

- [Tổng quan](#-tổng-quan)
- [Tính năng chính](#-tính-năng-chính)
- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [Cài đặt & Chạy dự án](#-cài-đặt--chạy-dự-án)
- [Hướng dẫn sử dụng](#-hướng-dẫn-sử-dụng)
- [API Endpoints](#-api-endpoints)
- [Cơ sở dữ liệu](#-cơ-sở-dữ-liệu)
- [Scripts tiện ích](#-scripts-tiện-ích)
- [Quản lý phiên bản](#-quản-lý-phiên-bản)
- [Triển khai (Deployment)](#-triển-khai-deployment)

---

## 🎯 Tổng quan

Ứng dụng giúp nhóm Pickleball quản lý chi phí thuê sân một cách minh bạch:

- Mỗi buổi đánh, **1 người trả tiền** cho cả nhóm.
- Hệ thống **tự động tính toán số tiền** mỗi người nợ người trả.
- Người nợ có thể **xác nhận đã chuyển tiền**, người nhận **xác nhận đã nhận**.
- Admin có thể **duyệt hộ** hoặc **quản lý thành viên**.

---

## ✨ Tính năng chính

### 1. 🔐 Đăng nhập (Login)
- Đăng nhập bằng **username** và **password**.
- Phân quyền: `ADMIN` (quản trị viên) và `USER` (thành viên thường).
- Sau khi đăng nhập, trang mặc định là **Dashboard**.

### 2. 📊 Dashboard (Trang chính)
- Hiển thị **số dư hiện tại** (nợ/được nợ) của người đăng nhập.
- Danh sách **giao dịch chờ xử lý** (PENDING) với các hành động:
  - 🔵 **Đã chuyển**: Xác nhận người nợ đã gửi tiền.
  - ✅ **Xác nhận**: Người nhận xác nhận đã nhận tiền.
  - 🛡️ **Admin duyệt hộ**: Admin có thể xác nhận thay cho thành viên.
- Gộp hiển thị **Lộc + Mỹ Vân** thành 1 dòng chung với tổng số tiền.
- Hiển thị **ngày nợ đầy đủ** (tất cả các ngày đã đánh).

### 3. ➕ Tạo buổi đánh mới
- Chọn **ngày đánh** (hỗ trợ chọn nhiều ngày).
- Chọn **sân** (mặc định: `Smile`).
- Nhập **tổng chi phí** (mặc định: `280,000 VNĐ`).
- Chọn **người trả tiền** (mặc định: Nguyên/admin).
- Chọn **người tham gia** với label hiển thị số lượng đã chọn.
- **Auto-select theo cặp**: Chọn Nguyên tự động chọn Yến, chọn Lộc tự động chọn Mỹ Vân (và ngược lại).
- Khi Nguyên là người trả tiền → tự động được chọn trong danh sách đánh.

### 4. 📜 Lịch sử buổi đánh (History)
- Xem danh sách tất cả các buổi đánh đã diễn ra.
- Thông tin hiển thị: ngày, sân, chi phí, người trả, danh sách người đánh.
- **Chỉnh sửa** buổi đánh (thay đổi ngày, sân, chi phí, người trả, người tham gia).
- **Xóa** buổi đánh (chỉ Admin).

### 5. 📈 Thống kê theo tuần (Stats)
- Xem thống kê chi tiêu **theo từng tuần** (ISO week).
- Chọn tuần từ dropdown.
- Bảng hiển thị:
  - Mỗi hàng = 1 buổi đánh trong tuần.
  - Mỗi cột = 1 thành viên, hiển thị số tiền phải trả.
  - Dòng **Tổng cộng** tính tổng nợ cả tuần.
  - Icon ✅ cho các giao dịch đã thanh toán.
- **Gộp cột Lộc + Mỹ Vân**: Hiển thị tổng tiền chung, khi Lộc thanh toán thì Mỹ Vân cũng tự động được tick.

### 6. 🛡️ Quản trị (Admin)
- **Quản lý thành viên**: Thêm, sửa, xóa thành viên.
- **Reset số dư**: Đặt lại số dư về 0 cho tất cả thành viên.
- Chỉ tài khoản có quyền `ADMIN` mới truy cập được trang này.

---

## 🛠 Công nghệ sử dụng

| Thành phần         | Công nghệ                                          |
| ------------------- | --------------------------------------------------- |
| **Framework**       | [Next.js 16](https://nextjs.org/) (App Router)     |
| **Ngôn ngữ**        | TypeScript                                          |
| **UI Components**   | [shadcn/ui](https://ui.shadcn.com/) + Radix UI      |
| **Styling**         | Tailwind CSS 4                                      |
| **Database**        | PostgreSQL (Supabase)                               |
| **ORM**             | [Prisma](https://www.prisma.io/)                    |
| **State Management**| Zustand                                             |
| **Icons**           | Lucide React                                        |
| **Animations**      | Framer Motion                                       |
| **Deployment**      | Vercel                                              |

---

## 📁 Cấu trúc dự án

```
pickellball-fund-manager/
├── prisma/
│   ├── schema.prisma        # Định nghĩa cấu trúc database
│   └── seed.ts              # Dữ liệu mẫu (seed)
├── scripts/
│   ├── release.js           # Script phát hành phiên bản tự động
│   ├── repair-balances.js   # Sửa/tính lại số dư thành viên
│   ├── check-db.js          # Kiểm tra kết nối database
│   ├── clean-sessions.js    # Dọn dẹp session trùng lặp
│   ├── fix-dates.js         # Sửa lỗi định dạng ngày
│   └── update-admin-password.js  # Cập nhật mật khẩu admin
├── src/
│   ├── app/
│   │   ├── page.tsx             # 📊 Dashboard (trang chính)
│   │   ├── login/page.tsx       # 🔐 Trang đăng nhập
│   │   ├── history/page.tsx     # 📜 Lịch sử buổi đánh
│   │   ├── stats/page.tsx       # 📈 Thống kê theo tuần
│   │   ├── admin/page.tsx       # 🛡️ Quản trị thành viên
│   │   ├── layout.tsx           # Layout chung
│   │   ├── globals.css          # CSS toàn cục
│   │   └── api/
│   │       ├── auth/route.ts        # API đăng nhập
│   │       ├── users/
│   │       │   ├── route.ts         # GET/POST users
│   │       │   └── [id]/route.ts    # PUT/DELETE user
│   │       ├── sessions/
│   │       │   ├── route.ts         # GET/POST sessions
│   │       │   ├── [id]/route.ts    # PUT/DELETE session
│   │       │   └── weekly/route.ts  # GET thống kê theo tuần
│   │       └── settlements/
│   │           ├── route.ts         # GET/POST settlements
│   │           └── [id]/route.ts    # PATCH settlement (xác nhận)
│   ├── components/ui/           # shadcn/ui components
│   └── lib/
│       ├── auth-store.ts        # Zustand store cho authentication
│       ├── settlement-helper.ts # Logic xử lý thanh toán gộp
│       ├── prisma.ts            # Prisma client singleton
│       └── utils.ts             # Hàm tiện ích
├── GIT_GUIDELINES.md        # Hướng dẫn quản lý Git
├── CHANGELOG.md             # Nhật ký thay đổi
├── package.json
└── README.md                # 📖 Tài liệu này
```

---

## 🚀 Cài đặt & Chạy dự án

### Yêu cầu hệ thống
- **Node.js** >= 18
- **npm** hoặc **yarn**
- **PostgreSQL** database (khuyến nghị dùng [Supabase](https://supabase.com/))

### Các bước cài đặt

```bash
# 1. Clone repository
git clone https://github.com/kulkul22/pickellball-fund-manager.git
cd pickellball-fund-manager

# 2. Cài đặt dependencies
npm install

# 3. Tạo file .env từ mẫu
# Tạo file .env ở thư mục gốc với nội dung:
```

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?pgbouncer=true"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
```

```bash
# 4. Khởi tạo database
npx prisma db push

# 5. (Tùy chọn) Chạy seed data
npx prisma db seed

# 6. Chạy ứng dụng ở chế độ phát triển
npm run dev
```

Ứng dụng sẽ chạy tại **http://localhost:3000**

### Tài khoản mặc định

| Username | Password    | Quyền  |
| -------- | ----------- | ------ |
| admin    | admin@123   | ADMIN  |
| loc      | 12345       | USER   |
| myvan    | 12345       | USER   |
| yen      | 12345       | USER   |

---

## 📖 Hướng dẫn sử dụng

### Luồng sử dụng cơ bản

```
Đăng nhập → Dashboard → Tạo buổi đánh → Xác nhận thanh toán → Xem thống kê
```

### Bước 1: Đăng nhập
1. Truy cập ứng dụng → Trang đăng nhập hiện ra.
2. Nhập **username** và **password**.
3. Nhấn **Đăng nhập** → Chuyển đến Dashboard.

### Bước 2: Tạo buổi đánh mới (trên Dashboard)
1. Nhấn nút **➕ Tạo buổi đánh**.
2. Chọn **ngày đánh** (có thể chọn nhiều ngày).
3. Sân mặc định là `Smile`, chi phí mặc định là `280,000 VNĐ` (có thể sửa).
4. Chọn **người trả tiền** và **người tham gia**.
5. Nhấn **Tạo buổi** → Hệ thống tự động tính toán công nợ.

### Bước 3: Thanh toán
1. Trên Dashboard, xem phần **Giao dịch chờ xử lý**.
2. Nếu bạn là **người nợ**: Nhấn **🔵 Đã chuyển** khi đã chuyển tiền.
3. Nếu bạn là **người nhận**: Nhấn **✅ Xác nhận** khi đã nhận được tiền.
4. Admin có thể nhấn **🛡️ Duyệt hộ** để xác nhận thay.

### Bước 4: Xem thống kê
1. Vào menu → **Thống kê**.
2. Chọn **tuần** cần xem từ dropdown.
3. Bảng thống kê hiển thị chi tiết từng buổi và tổng nợ theo tuần.

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint     | Mô tả                      |
| ------ | ------------ | --------------------------- |
| POST   | `/api/auth`  | Đăng nhập (username + password) |

### Users
| Method | Endpoint          | Mô tả                       |
| ------ | ----------------- | ---------------------------- |
| GET    | `/api/users`      | Lấy danh sách tất cả users  |
| POST   | `/api/users`      | Tạo user mới                |
| PUT    | `/api/users/:id`  | Cập nhật thông tin user      |
| DELETE | `/api/users/:id`  | Xóa user                    |

### Sessions (Buổi đánh)
| Method | Endpoint              | Mô tả                                    |
| ------ | --------------------- | ----------------------------------------- |
| GET    | `/api/sessions`       | Lấy danh sách buổi đánh                  |
| POST   | `/api/sessions`       | Tạo buổi đánh mới + tự động tạo settlements |
| PUT    | `/api/sessions/:id`   | Cập nhật buổi đánh                       |
| DELETE | `/api/sessions/:id`   | Xóa buổi đánh                            |
| GET    | `/api/sessions/weekly` | Lấy thống kê theo tuần (ISO week)       |

### Settlements (Thanh toán)
| Method | Endpoint               | Mô tả                                 |
| ------ | ---------------------- | -------------------------------------- |
| GET    | `/api/settlements`     | Lấy danh sách giao dịch (lọc theo userId) |
| PATCH  | `/api/settlements/:id` | Cập nhật trạng thái (SENT / SETTLED)   |

#### Trạng thái Settlement:
- `PENDING` → Chưa thanh toán
- `SENT` → Người nợ đã chuyển tiền
- `SETTLED` → Người nhận xác nhận đã nhận

---

## 🗄 Cơ sở dữ liệu

### Mô hình dữ liệu (Database Schema)

```
┌──────────┐     ┌───────────────────┐     ┌────────────┐
│   User   │     │ SessionParticipant│     │  Session   │
├──────────┤     ├───────────────────┤     ├────────────┤
│ id       │◄────│ userId            │     │ id         │
│ username │     │ sessionId         │────►│ date       │
│ name     │     └───────────────────┘     │ location   │
│ password │                                │ totalCost  │
│ role     │◄───────────────────────────────│ payerId    │
│ balance  │                                └────────────┘
│          │
│          │     ┌──────────────┐
│          │◄────│ Settlement   │
│          │     ├──────────────┤
│          │     │ id           │
│          │◄────│ fromUserId   │
│          │     │ toUserId     │
│          │     │ amount       │
│          │     │ status       │
│          │     │ week         │
│          │     │ createdAt    │
└──────────┘     └──────────────┘
```

### Các lệnh Prisma hữu ích

```bash
npx prisma studio         # Mở giao diện quản lý database
npx prisma db push        # Đồng bộ schema lên database
npx prisma migrate dev    # Tạo migration mới
npx prisma generate       # Generate Prisma Client
npx prisma db seed        # Chạy dữ liệu seed
```

---

## 🔧 Scripts tiện ích

| Lệnh                         | Mô tả                                    |
| ----------------------------- | ----------------------------------------- |
| `npm run dev`                 | Chạy ứng dụng ở chế độ development       |
| `npm run build`               | Build ứng dụng cho production             |
| `npm run release`             | Phát hành phiên bản mới (tự động)         |
| `node scripts/check-db.js`    | Kiểm tra kết nối database                 |
| `node scripts/repair-balances.js` | Tính lại và sửa số dư thành viên     |
| `node scripts/clean-sessions.js`  | Dọn dẹp session trùng lặp            |
| `node scripts/fix-dates.js`       | Sửa lỗi định dạng ngày               |
| `node scripts/update-admin-password.js` | Cập nhật mật khẩu admin        |

---

## 🏷 Quản lý phiên bản

Dự án sử dụng **Semantic Versioning** (`vMAJOR.MINOR.PATCH`):

- **PATCH**: Sửa lỗi nhỏ (ví dụ: `0.2.0` → `0.2.1`)
- **MINOR**: Tính năng mới (ví dụ: `0.2.0` → `0.3.0`)
- **MAJOR**: Thay đổi lớn, không tương thích ngược

### Phát hành phiên bản mới

```bash
# 1. Chạy script release tự động
npm run release

# 2. Đẩy code và tag lên GitHub
git push origin main --tags
```

### Quy tắc phân nhánh

| Loại nhánh                 | Mục đích                    | Ví dụ                          |
| -------------------------- | --------------------------- | ------------------------------ |
| `main`                     | Code ổn định trên production | —                              |
| `feature/ten-tinh-nang`    | Phát triển tính năng mới    | `feature/export-report`        |
| `bugfix/ten-loi`           | Sửa lỗi thông thường        | `bugfix/settlement-amount`     |
| `hotfix/loi-khan-cap`      | Sửa lỗi khẩn cấp            | `hotfix/login-crash`           |

> Chi tiết đầy đủ xem tại [GIT_GUIDELINES.md](./GIT_GUIDELINES.md)

---

## 🌐 Triển khai (Deployment)

Ứng dụng được triển khai trên **Vercel** với cấu hình tự động:

1. Push code lên nhánh `main` trên GitHub.
2. Vercel tự động detect và build.
3. Ứng dụng deploy tại: [https://workspace-fund-pickellball-manager.vercel.app](https://workspace-fund-pickellball-manager.vercel.app)

### Biến môi trường cần thiết trên Vercel

| Tên biến        | Mô tả                          |
| ---------------- | ------------------------------- |
| `DATABASE_URL`   | Connection string PostgreSQL (pooled) |
| `DIRECT_URL`     | Connection string PostgreSQL (direct) |

---

## 📄 License

Private project — Không được phân phối công khai.

---

<p align="center">
  🏸 Made with ❤️ for the Pickleball crew
</p>
