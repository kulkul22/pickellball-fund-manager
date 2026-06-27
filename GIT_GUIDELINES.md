# Hướng dẫn Quản lý Phiên bản và Phân nhánh (Git Guidelines)

Tài liệu này hướng dẫn cách tổ chức nhánh (branch), viết thông điệp commit (commit message) và quy trình phát hành phiên bản (release version) cho dự án Quản lý quỹ Pickleball.

---

## 1. Quy tắc Phân nhánh (Branching Strategy)

Khi phát triển tính năng mới hoặc sửa lỗi, hãy tạo các nhánh riêng biệt từ nhánh `main`:

*   **Nhánh chính (`main`)**: Chứa mã nguồn ổn định nhất đang chạy trên production.
*   **Nhánh tính năng (`feature/ten-tinh-nang`)**: Dùng khi phát triển tính năng mới.
    *   *Ví dụ*: `feature/auto-select-payer`
*   **Nhánh sửa lỗi (`bugfix/ten-loi` hoặc `hotfix/loi-khan-cap`)**: Dùng khi sửa lỗi.
    *   *Ví dụ*: `bugfix/settlement-timeout-error`

### Quy trình làm việc:
1.  Đứng ở nhánh `main` và cập nhật code mới nhất:
    ```bash
    git checkout main
    git pull origin main
    ```
2.  Tạo nhánh mới để làm việc:
    ```bash
    git checkout -b feature/ten-tinh-nang
    ```
3.  Viết code, kiểm tra và commit trên nhánh này.
4.  Khi hoàn thành, gộp nhánh (merge) lại vào `main` hoặc tạo Pull Request trên GitHub.

---

## 2. Quy chuẩn thông điệp Commit (Conventional Commits)

Để lịch sử Git sạch sẽ và dễ tra cứu, hãy viết thông điệp commit theo cấu trúc:
```
<type>: <mô tả ngắn bằng tiếng Việt hoặc tiếng Anh>
```

Các `type` thông dụng:
*   `feat`: Tính năng mới (ví dụ: `feat: add password fields to login`)
*   `fix`: Sửa lỗi (ví dụ: `fix: resolve pending transactions timeout`)
*   `docs`: Cập nhật tài liệu (ví dụ: `docs: update git guidelines`)
*   `refactor`: Tái cấu trúc mã nguồn nhưng không đổi tính năng (ví dụ: `refactor: clean up calculations`)
*   `chore`: Các việc vặt như cài thư viện, build, config (ví dụ: `chore: update dependencies`)

---

## 3. Quy trình phát hành phiên bản tự động (Release Version)

Dự án sử dụng chuẩn phiên bản ngữ nghĩa (Semantic Versioning): `vMAJOR.MINOR.PATCH`
*   **PATCH** (Bản vá): Tăng khi sửa lỗi (Ví dụ: `0.2.0` → `0.2.1`).
*   **MINOR** (Bản phụ): Tăng khi thêm tính năng mới tương thích ngược (Ví dụ: `0.2.0` → `0.3.0`).
*   **MAJOR** (Bản chính): Tăng khi thay đổi lớn không tương thích ngược.

Để phát hành phiên bản mới tự động, hãy chạy lệnh sau trong thư mục dự án:

```bash
npm run release
```

### Script tự động làm các bước sau:
1.  **Hỏi lựa chọn phiên bản tiếp theo** (Patch, Minor hoặc Major).
2.  **Hỏi nội dung cập nhật** (Ghi chú phát hành).
3.  **Tự động cập nhật số phiên bản** trong `package.json`.
4.  **Tự động ghi nhận thông tin** vào file `CHANGELOG.md` kèm theo ngày tháng hiện tại.
5.  **Tự động tạo Git commit và gắn tag** (Ví dụ: `v0.2.1`).

Sau khi script chạy xong, bạn chỉ cần đẩy mã nguồn và tag lên GitHub bằng lệnh:
```bash
git push origin main --tags
```
