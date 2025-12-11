## ĐẶC TẢ USE CASE – NHÀ HÀNG (RESTAURANT)

Tài liệu mô tả chi tiết các ca sử dụng dành cho Nhà hàng trong hệ thống Food Order App. Mỗi mục gồm phần mô tả và đoạn mã PlantUML để dựng sơ đồ giống định dạng của tài liệu Khách hàng.

---

## 1. Đăng nhập & phân quyền

- **Tác nhân**: Chủ/quản trị nhà hàng.
- **Mô tả**: Đăng nhập app nhà hàng, xác thực Firebase Auth, kiểm tra role `restaurant`.
- **Tiền điều kiện**: Tài khoản đã được cấp quyền `restaurant`.
- **Luồng sự kiện**:
  1. Mở app nhà hàng → màn `Login`.
  2. Nhập email/mật khẩu → hệ thống xác thực.
  3. Kiểm tra hồ sơ trong `users` với role `restaurant`; nếu sai role, từ chối.
  4. Điều hướng vào trang chủ/đơn hàng.
- **Hậu điều kiện**: Phiên đăng nhập hợp lệ, token lưu để gọi API/Firestore.

```plantuml
@startuml
left to right direction

actor "Nhà hàng" as Restaurant

rectangle "Đăng nhập & phân quyền" {
  usecase "Nhập email/mật khẩu" as RL1
  usecase "Gửi yêu cầu đăng nhập" as RL2
  usecase "Xác thực Firebase" as RL3
  usecase "Kiểm tra role restaurant" as RL4
  usecase "Tạo phiên & điều hướng" as RL5
  usecase "Thông báo lỗi" as RL6
}

Restaurant --> RL1
Restaurant --> RL2

RL2 --> RL3
RL3 --> RL4
RL4 --> RL5 : hợp lệ
RL4 --> RL6 : sai role/không tồn tại

@enduml
```

---

## 2. Quản lý hồ sơ & logo nhà hàng

- **Mô tả**: Cập nhật tên, địa chỉ, giờ mở cửa, logo (Cloudinary) và lưu `restaurants/{uid}`.
- **Tiền điều kiện**: Đã đăng nhập.
- **Luồng sự kiện**:
  1. Vào `Tài khoản nhà hàng`.
  2. Chỉnh sửa thông tin, chọn ảnh logo → upload Cloudinary → lấy `logoUrl`.
  3. Lưu Firestore: `restaurants/{uid}` cập nhật `logoUrl` và thông tin.
  4. Màn khách/nhà hàng hiển thị logo mới (ưu tiên `logoUrl`).
- **Hậu điều kiện**: Hồ sơ đồng bộ, logo hiển thị đúng cho khách.

```plantuml
@startuml
left to right direction

actor "Nhà hàng" as Restaurant

rectangle "Hồ sơ & logo" {
  usecase "Xem hồ sơ" as RP1
  usecase "Chỉnh sửa thông tin" as RP2
  usecase "Chọn ảnh logo" as RP3
  usecase "Upload Cloudinary" as RP4
  usecase "Lưu Firestore" as RP5
  usecase "Hiển thị kết quả" as RP6
}

Restaurant --> RP1
Restaurant --> RP2
Restaurant --> RP3

RP3 --> RP4
RP2 --> RP5
RP4 --> RP5
RP5 --> RP6

@enduml
```

---

## 3. Quản lý danh mục món

- **Mô tả**: Tạo/sửa/xóa danh mục món; liên kết với menu.
- **Tiền điều kiện**: Đã đăng nhập.
- **Luồng sự kiện**:
  1. Vào `Quản lý danh mục`.
  2. Thêm mới (tên, mô tả, ưu tiên) hoặc sửa/xóa danh mục.
  3. Hệ thống cập nhật Firestore `categories`.
- **Hậu điều kiện**: Danh mục sẵn sàng gắn vào món; menu được phân loại.

```plantuml
@startuml
left to right direction

actor "Nhà hàng" as Restaurant

rectangle "Danh mục món" {
  usecase "Xem danh sách danh mục" as CT1
  usecase "Thêm danh mục" as CT2
  usecase "Sửa danh mục" as CT3
  usecase "Xoá danh mục" as CT4
  usecase "Lưu thay đổi" as CT5
  usecase "Hiển thị kết quả" as CT6
}

Restaurant --> CT1
Restaurant --> CT2
Restaurant --> CT3
Restaurant --> CT4

CT2 --> CT5
CT3 --> CT5
CT4 --> CT5
CT5 --> CT6

@enduml
```

---

## 4. Quản lý món ăn

- **Mô tả**: CRUD món, đặt trạng thái `isAvailable`, giá, mô tả, ảnh.
- **Tiền điều kiện**: Đã có danh mục liên quan (nếu ràng buộc).
- **Luồng sự kiện**:
  1. Vào `Quản lý món`.
  2. Thêm mới: nhập thông tin, chọn danh mục, tải ảnh (Cloudinary tùy chọn).
  3. Sửa: cập nhật giá/trạng thái/ảnh; Xóa: ngừng bán.
  4. Lưu Firestore `foods`.
- **Hậu điều kiện**: Món sẵn sàng hiển thị cho khách; trạng thái phản ánh thực tế.

```plantuml
@startuml
left to right direction

actor "Nhà hàng" as Restaurant

rectangle "Quản lý món" {
  usecase "Xem danh sách món" as FM1
  usecase "Thêm món mới" as FM2
  usecase "Nhập thông tin món" as FM3
  usecase "Tải ảnh (Cloudinary)" as FM4
  usecase "Cập nhật trạng thái/giá" as FM5
  usecase "Xoá món" as FM6
  usecase "Lưu Firestore" as FM7
  usecase "Hiển thị kết quả" as FM8
}

Restaurant --> FM1
Restaurant --> FM2
Restaurant --> FM5
Restaurant --> FM6

FM2 --> FM3
FM3 --> FM4
FM3 --> FM7
FM4 --> FM7
FM5 --> FM7
FM6 --> FM7
FM7 --> FM8

@enduml
```

---

## 5. Quản lý đơn hàng & gán shipper

- **Mô tả**: Xem/lọc đơn, cập nhật trạng thái, gán shipper.
- **Tiền điều kiện**: Đã đăng nhập; có đơn hàng trong hệ thống.
- **Luồng sự kiện**:
  1. Vào `Quản lý đơn hàng`.
  2. Lọc theo trạng thái (`pending`, `confirmed`, `preparing`, `shipping`, `delivered`, `cancelled`).
  3. Mở chi tiết → xác nhận/chuẩn bị → gán shipper (nếu cần) → cập nhật trạng thái.
  4. Hệ thống ghi Firestore `orders`, gửi thông báo tới khách/shipper.
- **Hậu điều kiện**: Đơn được cập nhật đúng, các bên nhận thông báo.

```plantuml
@startuml
left to right direction

actor "Nhà hàng" as Restaurant

rectangle "Đơn hàng & gán shipper" {
  usecase "Xem danh sách đơn" as OR1
  usecase "Lọc theo trạng thái" as OR2
  usecase "Xem chi tiết đơn" as OR3
  usecase "Xác nhận/Chuẩn bị" as OR4
  usecase "Gán shipper" as OR5
  usecase "Cập nhật trạng thái" as OR6
  usecase "Gửi thông báo" as OR7
}

Restaurant --> OR1
Restaurant --> OR2

OR1 --> OR3
OR2 --> OR3
OR3 --> OR4
OR4 --> OR5
OR5 --> OR6
OR6 --> OR7

@enduml
```

---

## 6. Khuyến mãi

- **Mô tả**: Tạo/sửa khuyến mãi áp dụng cho nhà hàng.
- **Tiền điều kiện**: Đã đăng nhập.
- **Luồng sự kiện**:
  1. Vào `Khuyến mãi`.
  2. Nhập tiêu đề, mô tả, mã, giá trị giảm, HSD, điều kiện tối thiểu.
  3. Lưu Firestore `promotions` (trạng thái hoạt động).
- **Hậu điều kiện**: Mã giảm áp dụng cho khách; hiển thị ở app khách.

```plantuml
@startuml
left to right direction

actor "Nhà hàng" as Restaurant

rectangle "Khuyến mãi" {
  usecase "Xem danh sách KM" as PR1
  usecase "Tạo KM mới" as PR2
  usecase "Nhập thông tin KM" as PR3
  usecase "Bật/Tắt hiệu lực" as PR4
  usecase "Lưu Firestore" as PR5
  usecase "Hiển thị/áp dụng cho khách" as PR6
}

Restaurant --> PR1
Restaurant --> PR2
Restaurant --> PR4

PR2 --> PR3
PR3 --> PR5
PR4 --> PR5
PR5 --> PR6

@enduml
```

---

## 7. Báo cáo & thống kê

- **Mô tả**: Xem doanh thu, số đơn, top món bán chạy, công nợ.
- **Tiền điều kiện**: Có dữ liệu đơn/món.
- **Luồng sự kiện**:
  1. Vào `Thống kê/Báo cáo`.
  2. Chọn khoảng thời gian, tải dữ liệu đơn/doanh thu.
  3. Hệ thống tính tổng, vẽ biểu đồ, liệt kê top món.
- **Hậu điều kiện**: Nhà hàng nắm hiệu suất để điều chỉnh vận hành.

```plantuml
@startuml
left to right direction

actor "Nhà hàng" as Restaurant

rectangle "Báo cáo & thống kê" {
  usecase "Chọn khoảng thời gian" as RP1
  usecase "Tải dữ liệu đơn/doanh thu" as RP2
  usecase "Tính toán tổng hợp" as RP3
  usecase "Hiển thị biểu đồ" as RP4
  usecase "Liệt kê top món" as RP5
}

Restaurant --> RP1
RP1 --> RP2
RP2 --> RP3
RP3 --> RP4
RP3 --> RP5

@enduml
```

---

## 8. Thông báo & hỗ trợ

- **Mô tả**: Nhận thông báo hệ thống; gửi ticket hỗ trợ.
- **Tiền điều kiện**: Đã đăng nhập.
- **Luồng sự kiện**:
  1. Hệ thống đẩy `notifications` (đơn mới, trạng thái, ví…) hiển thị trong app.
  2. Với sự cố, vào `Hỗ trợ` → nhập nội dung → tạo ticket Firestore `support`.
  3. Admin phản hồi; nhà hàng nhận thông báo cập nhật.
- **Hậu điều kiện**: Vấn đề được ghi nhận; nhà hàng nhận thông tin kịp thời.

```plantuml
@startuml
left to right direction

actor "Nhà hàng" as Restaurant

rectangle "Thông báo & hỗ trợ" {
  usecase "Nhận thông báo" as NB1
  usecase "Xem danh sách thông báo" as NB2
  usecase "Tạo ticket hỗ trợ" as NB3
  usecase "Theo dõi ticket" as NB4
  usecase "Nhận phản hồi" as NB5
}

Restaurant --> NB1
Restaurant --> NB2
Restaurant --> NB3
NB3 --> NB4
NB4 --> NB5

@enduml
```

---

## 9. Quản lý nhân sự (nội bộ)

- **Mô tả**: Quản lý nhân viên phục vụ/bếp, gán quyền nội bộ.
- **Tiền điều kiện**: Đã đăng nhập với quyền quản lý nhà hàng.
- **Luồng sự kiện**:
  1. Vào `Quản lý nhân sự`.
  2. Thêm/sửa/xóa nhân viên; gán vai trò (bếp/phục vụ/quản lý).
  3. Lưu thông tin (Firestore hoặc hệ thống phụ trợ).
- **Hậu điều kiện**: Nhân sự được phân quyền rõ ràng cho vận hành.

```plantuml
@startuml
left to right direction

actor "Nhà hàng" as Restaurant

rectangle "Quản lý nhân sự" {
  usecase "Xem nhân viên" as ST1
  usecase "Thêm nhân viên" as ST2
  usecase "Sửa thông tin" as ST3
  usecase "Xoá nhân viên" as ST4
  usecase "Gán vai trò nội bộ" as ST5
  usecase "Lưu thay đổi" as ST6
}

Restaurant --> ST1
Restaurant --> ST2
Restaurant --> ST3
Restaurant --> ST4

ST2 --> ST5
ST3 --> ST5
ST4 --> ST6
ST5 --> ST6

@enduml
```

---

### Sơ đồ use case tổng quan (khớp file `So_Do_Use_Case_NhaHang.puml`)

```plantuml
@startuml
title Use Case Diagram - Nhà hàng (Restaurant)

left to right direction
skinparam actorStyle awesome

actor "Nhà hàng" as Restaurant

rectangle "Restaurant App" {
  usecase "Đăng nhập" as R_Login
  usecase "Quản lý thông tin\nnhà hàng" as R_Profile
  usecase "Quản lý nhân sự" as R_Staff
  usecase "Quản lý danh mục" as R_Category
  usecase "Quản lý món ăn" as R_Menu
  usecase "Quản lý đơn hàng" as R_Orders
  usecase "Gán tài xế giao" as R_Assign
  usecase "Quản lý khuyến mãi" as R_Promo
  usecase "Xem báo cáo & thống kê" as R_Report
  usecase "Giải quyết hỗ trợ" as R_Support
  usecase "Nhận thông báo" as R_Notify
}

Restaurant --> R_Login
Restaurant --> R_Profile
Restaurant --> R_Staff
Restaurant --> R_Category
Restaurant --> R_Menu
Restaurant --> R_Orders
Restaurant --> R_Assign
Restaurant --> R_Promo
Restaurant --> R_Report
Restaurant --> R_Support
Restaurant --> R_Notify

R_Category ..> R_Menu : <<include>>
R_Orders ..> R_Menu : <<include>>
R_Orders ..> R_Assign : <<include>>
R_Promo ..> R_Menu : <<extend>>
R_Report ..> R_Orders : <<include>>
R_Support ..> R_Orders : <<extend>>
R_Notify ..> R_Orders : <<include>>

@enduml
```

