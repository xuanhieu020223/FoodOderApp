## ĐẶC TẢ USE CASE – ADMIN

Tài liệu mô tả chi tiết các ca sử dụng dành cho Admin trong hệ thống Food Order App. Định dạng tương tự tài liệu Khách hàng: mỗi mục có mô tả và PlantUML riêng.

---

## 1. Đăng nhập & phân quyền

- **Tác nhân**: Quản trị viên.
- **Mô tả**: Đăng nhập portal admin, xác thực Firebase Auth và role `admin`.
- **Tiền điều kiện**: Tài khoản tồn tại và có role `admin`.
- **Luồng sự kiện**:
  1. Mở `Admin Portal` → `Login`.
  2. Nhập email/mật khẩu → xác thực.
  3. Kiểm tra hồ sơ Firestore, role `admin`; nếu không, từ chối và đăng xuất.
  4. Điều hướng vào dashboard.
- **Hậu điều kiện**: Phiên hợp lệ, có quyền truy cập các trang quản trị.

```plantuml
@startuml
left to right direction

actor "Admin" as Admin

rectangle "Đăng nhập & phân quyền" {
  usecase "Nhập email/mật khẩu" as AL1
  usecase "Gửi yêu cầu đăng nhập" as AL2
  usecase "Xác thực & role admin" as AL3
  usecase "Tạo phiên & điều hướng" as AL4
  usecase "Thông báo lỗi" as AL5
}

Admin --> AL1
Admin --> AL2
AL2 --> AL3
AL3 --> AL4 : hợp lệ
AL3 --> AL5 : sai role/thông tin

@enduml
```

---

## 2. Quản lý người dùng/đối tác (user, nhà hàng, shipper)

- **Mô tả**: Tra cứu, duyệt, khóa/mở khóa tài khoản người dùng, nhà hàng, shipper.
- **Tiền điều kiện**: Đã đăng nhập.
- **Luồng sự kiện**:
  1. Vào `Users`, `Restaurants`, `Drivers`.
  2. Tìm kiếm theo email/số điện thoại/tên; lọc theo trạng thái hoặc role.
  3. Xem chi tiết hồ sơ; cập nhật trạng thái (active/banned/verified).
  4. Lưu Firestore và gửi thông báo nếu cần.
- **Hậu điều kiện**: Tài khoản được kiểm soát đúng quyền/trạng thái.

```plantuml
@startuml
left to right direction

actor "Admin" as Admin

rectangle "Quản lý tài khoản" {
  usecase "Tìm kiếm người dùng/đối tác" as AU1
  usecase "Lọc theo trạng thái/role" as AU2
  usecase "Xem hồ sơ chi tiết" as AU3
  usecase "Khoá/Mở khoá/Verify" as AU4
  usecase "Lưu & gửi thông báo" as AU5
}

Admin --> AU1
Admin --> AU2
AU1 --> AU3
AU2 --> AU3
AU3 --> AU4
AU4 --> AU5

@enduml
```

---

## 3. Quản lý đơn hàng

- **Mô tả**: Theo dõi, lọc, duyệt/cập nhật đơn.
- **Tiền điều kiện**: Đã đăng nhập.
- **Luồng sự kiện**:
  1. Vào `Orders`.
  2. Lọc theo trạng thái, ngày tạo; tìm theo mã đơn.
  3. Mở chi tiết: xem lịch sử, gán/đổi shipper, cập nhật trạng thái, hoàn tiền nếu có.
  4. Ghi nhận thay đổi vào Firestore, gửi thông báo tới khách/nhà hàng/shipper.
- **Hậu điều kiện**: Đơn được giám sát và điều chỉnh kịp thời.

```plantuml
@startuml
left to right direction

actor "Admin" as Admin

rectangle "Quản lý đơn hàng" {
  usecase "Tìm/ lọc đơn" as AO1
  usecase "Xem chi tiết đơn" as AO2
  usecase "Gán/đổi shipper" as AO3
  usecase "Cập nhật trạng thái/hoàn tiền" as AO4
  usecase "Lưu & thông báo" as AO5
}

Admin --> AO1
AO1 --> AO2
AO2 --> AO3
AO2 --> AO4
AO3 --> AO5
AO4 --> AO5

@enduml
```

---

## 4. Quản lý khuyến mãi & thông báo

- **Mô tả**: Tạo/sửa/xóa mã giảm giá và gửi thông báo hệ thống.
- **Tiền điều kiện**: Đã đăng nhập.
- **Luồng sự kiện**:
  1. Vào `Promotions`: tạo/activate/deactivate mã (giảm %, tiền, HSD, minOrder, maxDiscount).
  2. Vào `Notifications`: soạn nội dung, chọn nhóm đối tượng (khách, shipper, nhà hàng), gửi.
  3. Lưu vào `promotions`/`notifications`; trigger hiển thị ở app tương ứng.
- **Hậu điều kiện**: Ưu đãi và thông báo được phát hành đúng đối tượng.

```plantuml
@startuml
left to right direction

actor "Admin" as Admin

rectangle "Khuyến mãi & Thông báo" {
  usecase "Tạo/Chỉnh sửa khuyến mãi" as AP1
  usecase "Bật/Tắt hiệu lực" as AP2
  usecase "Soạn & gửi thông báo" as AP3
  usecase "Lưu Firestore" as AP4
}

Admin --> AP1
Admin --> AP2
Admin --> AP3
AP1 --> AP4
AP2 --> AP4
AP3 --> AP4

@enduml
```

---

## 5. Hỗ trợ & ticket

- **Mô tả**: Xử lý ticket hỗ trợ từ khách/shipper/nhà hàng.
- **Tiền điều kiện**: Đã đăng nhập.
- **Luồng sự kiện**:
  1. Vào `Support`.
  2. Lọc ticket theo trạng thái (open/pending/resolved); tìm theo từ khóa.
  3. Mở chi tiết, phản hồi, gán mức ưu tiên, đổi trạng thái.
  4. Gửi thông báo cập nhật cho người tạo.
- **Hậu điều kiện**: Ticket được giải quyết/đóng; người dùng nhận phản hồi.

```plantuml
@startuml
left to right direction

actor "Admin" as Admin

rectangle "Hỗ trợ & ticket" {
  usecase "Lọc/Tìm ticket" as AS1
  usecase "Xem chi tiết" as AS2
  usecase "Phản hồi & gán mức ưu tiên" as AS3
  usecase "Đổi trạng thái" as AS4
  usecase "Thông báo cho người tạo" as AS5
}

Admin --> AS1
AS1 --> AS2
AS2 --> AS3
AS3 --> AS4
AS4 --> AS5

@enduml
```

---

## 6. Báo cáo & phân tích

- **Mô tả**: Xem dashboard doanh thu, đơn, hiệu suất shipper/nhà hàng.
- **Tiền điều kiện**: Có dữ liệu đơn và người dùng.
- **Luồng sự kiện**:
  1. Vào `Reports`: chọn khoảng thời gian.
  2. Xem biểu đồ doanh thu, số đơn, top nhà hàng/shipper.
  3. Xuất báo cáo (nếu có).
- **Hậu điều kiện**: Số liệu được giám sát, hỗ trợ quyết định vận hành.

```plantuml
@startuml
left to right direction

actor "Admin" as Admin

rectangle "Báo cáo & phân tích" {
  usecase "Chọn khoảng thời gian" as AR1
  usecase "Tải dữ liệu đơn/doanh thu" as AR2
  usecase "Hiển thị biểu đồ" as AR3
  usecase "Top nhà hàng/shipper" as AR4
  usecase "Xuất báo cáo" as AR5
}

Admin --> AR1
AR1 --> AR2
AR2 --> AR3
AR2 --> AR4
AR3 --> AR5

@enduml
```

---

## 7. Cấu hình hệ thống

- **Mô tả**: Chỉnh các tham số hệ thống (phí ship mặc định, ngưỡng khuyến mãi, feature flags).
- **Tiền điều kiện**: Đã đăng nhập, có quyền cấu hình.
- **Luồng sự kiện**:
  1. Vào `Config`.
  2. Chỉnh các tham số vận hành.
  3. Lưu cấu hình; áp dụng cho dịch vụ liên quan.
- **Hậu điều kiện**: Hệ thống vận hành theo cấu hình mới.

```plantuml
@startuml
left to right direction

actor "Admin" as Admin

rectangle "Cấu hình hệ thống" {
  usecase "Xem tham số" as AC1
  usecase "Chỉnh giá trị" as AC2
  usecase "Lưu cấu hình" as AC3
  usecase "Áp dụng cấu hình" as AC4
}

Admin --> AC1
Admin --> AC2
AC2 --> AC3
AC3 --> AC4

@enduml
```

---

## 8. Tìm kiếm & duyệt dữ liệu (chung)

- **Mô tả**: Tất cả bảng dữ liệu có tìm kiếm, lọc, sắp xếp, phân trang.
- **Tiền điều kiện**: Đã đăng nhập.
- **Luồng sự kiện**:
  1. Nhập từ khóa (mã đơn, tên nhà hàng, email, SĐT).
  2. Chọn bộ lọc trạng thái, ngày, role; sắp xếp cột (thời gian, số tiền, trạng thái).
  3. Hệ thống hiển thị bảng với phân trang; mở chi tiết để thao tác.
- **Hậu điều kiện**: Admin thao tác nhanh trên dữ liệu cần quản trị.

```plantuml
@startuml
left to right direction

actor "Admin" as Admin

rectangle "Tìm kiếm & duyệt" {
  usecase "Nhập từ khoá" as ASR1
  usecase "Chọn bộ lọc/sắp xếp" as ASR2
  usecase "Phân trang" as ASR3
  usecase "Mở chi tiết" as ASR4
}

Admin --> ASR1
Admin --> ASR2
Admin --> ASR3
ASR1 --> ASR4
ASR2 --> ASR4
ASR3 --> ASR4

@enduml
```

---

### Sơ đồ use case tổng quan (khớp file `So_Do_Use_Case_Admin.puml`)

```plantuml
@startuml
title Use Case Diagram - Quản trị viên (Admin)

left to right direction
skinparam actorStyle awesome

actor "Quản trị viên" as Admin

rectangle "Admin Portal" {
  usecase "Đăng nhập" as A_Login
  usecase "Quản lý người dùng" as A_Users
  usecase "Quản lý danh mục & đơn" as A_Orders
  usecase "Quản lý khuyến mãi" as A_Promo
  usecase "Báo cáo & phân tích" as A_Report
  usecase "Quản lý ticket hỗ trợ" as A_Support
  usecase "Cấu hình hệ thống" as A_Config
}

Admin --> A_Login
Admin --> A_Users
Admin --> A_Orders
Admin --> A_Promo
Admin --> A_Report
Admin --> A_Support
Admin --> A_Config

A_Orders ..> A_Users : <<include>>
A_Promo ..> A_Users : <<include>>
A_Report ..> A_Orders : <<include>>
A_Support ..> A_Users : <<include>>
A_Config ..> A_Report : <<extend>>

@enduml
```

