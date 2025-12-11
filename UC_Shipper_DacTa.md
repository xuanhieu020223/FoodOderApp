## ĐẶC TẢ USE CASE – SHIPPER

Tài liệu mô tả chi tiết các ca sử dụng dành cho Shipper trong hệ thống Food Order App. Mỗi mục gồm mô tả và PlantUML tương tự định dạng của tài liệu Khách hàng.

---

## 1. Đăng nhập & hồ sơ

- **Tác nhân**: Shipper.
- **Mô tả**: Đăng nhập app shipper, xác thực role `shipper`, cập nhật thông tin cá nhân.
- **Tiền điều kiện**: Có tài khoản shipper đã được duyệt.
- **Luồng sự kiện**:
  1. Mở app → `Login` → nhập email/mật khẩu.
  2. Hệ thống xác thực, kiểm tra role `shipper`.
  3. Vào `Hồ sơ` để cập nhật ảnh đại diện, số điện thoại, biển số xe.
- **Hậu điều kiện**: Phiên đăng nhập hợp lệ; hồ sơ sẵn sàng nhận đơn.

```plantuml
@startuml
left to right direction

actor "Shipper" as Shipper

rectangle "Đăng nhập & hồ sơ" {
  usecase "Nhập email/mật khẩu" as SL1
  usecase "Gửi yêu cầu đăng nhập" as SL2
  usecase "Xác thực & kiểm tra role" as SL3
  usecase "Tạo phiên" as SL4
  usecase "Chỉnh sửa hồ sơ" as SL5
  usecase "Lưu hồ sơ" as SL6
  usecase "Thông báo lỗi" as SL7
}

Shipper --> SL1
Shipper --> SL2

SL2 --> SL3
SL3 --> SL4 : hợp lệ
SL3 --> SL7 : sai role/thông tin
SL4 --> SL5
SL5 --> SL6

@enduml
```

---

## 2. Nhận đơn

- **Mô tả**: Nhận/gán đơn; xem danh sách đơn khả dụng hoặc được gán.
- **Tiền điều kiện**: Đã đăng nhập; có đơn khả dụng.
- **Luồng sự kiện**:
  1. Vào `Đơn hàng` → tab đơn khả dụng/được gán.
  2. Chọn đơn → xem tóm tắt lấy/giao.
  3. Nhận đơn (hoặc xác nhận đơn được gán).
- **Hậu điều kiện**: Đơn được shipper tiếp nhận.

```plantuml
@startuml
left to right direction

actor "Shipper" as Shipper

rectangle "Nhận đơn" {
  usecase "Xem đơn khả dụng" as OA1
  usecase "Xem chi tiết tóm tắt" as OA2
  usecase "Nhận/Giữ đơn" as OA3
  usecase "Xác nhận nhận đơn" as OA4
}

Shipper --> OA1
OA1 --> OA2
OA2 --> OA3
OA3 --> OA4

@enduml
```

---

## 3. Điều hướng giao hàng

- **Mô tả**: Xem lộ trình trên bản đồ, dẫn đường đến điểm lấy/giao.
- **Tiền điều kiện**: Đã nhận đơn.
- **Luồng sự kiện**:
  1. Mở chi tiết đơn.
  2. Xem vị trí lấy/giao, mở điều hướng (Google Maps/MapView).
  3. Di chuyển theo lộ trình.
- **Hậu điều kiện**: Sẵn sàng cập nhật trạng thái.

```plantuml
@startuml
left to right direction

actor "Shipper" as Shipper

rectangle "Điều hướng" {
  usecase "Xem vị trí lấy/giao" as NV1
  usecase "Mở dẫn đường" as NV2
  usecase "Theo lộ trình" as NV3
}

Shipper --> NV1
NV1 --> NV2
NV2 --> NV3

@enduml
```

---

## 4. Cập nhật trạng thái giao hàng

- **Mô tả**: Thay đổi trạng thái đơn trong suốt quá trình giao.
- **Tiền điều kiện**: Đơn đã nhận.
- **Luồng sự kiện**:
  1. Từ chi tiết đơn, cập nhật: `picked_up` → `delivering` → `delivered` hoặc `failed`.
  2. Hệ thống lưu Firestore `orders`, gửi thông báo cho khách/nhà hàng.
- **Hậu điều kiện**: Trạng thái đơn nhất quán; các bên được thông báo.

```plantuml
@startuml
left to right direction

actor "Shipper" as Shipper

rectangle "Cập nhật trạng thái" {
  usecase "Đánh dấu đã lấy hàng" as ST1
  usecase "Đang giao" as ST2
  usecase "Giao thành công" as ST3
  usecase "Giao thất bại" as ST4
  usecase "Lưu Firestore & thông báo" as ST5
}

Shipper --> ST1
Shipper --> ST4
ST1 --> ST2
ST2 --> ST3
ST3 --> ST5
ST4 --> ST5

@enduml
```

---

## 5. Quản lý thu nhập & rút tiền

- **Mô tả**: Xem số dư, công nợ, lịch sử giao dịch; yêu cầu rút tiền.
- **Tiền điều kiện**: Đã đăng nhập, có ví.
- **Luồng sự kiện**:
  1. Vào `Tài chính`.
  2. Hệ thống tính số dư từ đơn đã giao, hiển thị công nợ/chiết khấu.
  3. Nhập số tiền rút → tạo `withdrawRequests`, cập nhật ví shipper.
- **Hậu điều kiện**: Yêu cầu rút được ghi nhận; số dư/pending được cập nhật.

```plantuml
@startuml
left to right direction

actor "Shipper" as Shipper

rectangle "Thu nhập & rút tiền" {
  usecase "Xem số dư & công nợ" as FI1
  usecase "Xem lịch sử đơn đã giao" as FI2
  usecase "Nhập số tiền rút" as FI3
  usecase "Tạo yêu cầu rút" as FI4
  usecase "Cập nhật ví & pending" as FI5
  usecase "Thông báo kết quả" as FI6
}

Shipper --> FI1
Shipper --> FI2
Shipper --> FI3

FI3 --> FI4
FI4 --> FI5
FI5 --> FI6

@enduml
```

---

## 6. Thông báo

- **Mô tả**: Nhận thông báo hệ thống (đơn mới, trạng thái, thanh toán).
- **Tiền điều kiện**: Đã đăng nhập.
- **Luồng sự kiện**:
  1. Hệ thống đẩy `notifications` đến app; hiển thị danh sách.
  2. Shipper mở thông báo, đánh dấu đã đọc.
- **Hậu điều kiện**: Shipper nắm thông tin kịp thời.

```plantuml
@startuml
left to right direction

actor "Shipper" as Shipper

rectangle "Thông báo" {
  usecase "Nhận push notification" as NO1
  usecase "Xem danh sách" as NO2
  usecase "Đánh dấu đã đọc" as NO3
}

Shipper --> NO1
Shipper --> NO2
NO2 --> NO3

@enduml
```

---

## 7. Hỗ trợ & ticket

- **Mô tả**: Gửi ticket hỗ trợ và nhận phản hồi.
- **Tiền điều kiện**: Đã đăng nhập.
- **Luồng sự kiện**:
  1. Vào `Trợ giúp` → nhập nội dung → tạo ticket `support`.
  2. Theo dõi trạng thái, nhận phản hồi qua thông báo.
- **Hậu điều kiện**: Vấn đề được ghi nhận; shipper nhận phản hồi.

```plantuml
@startuml
left to right direction

actor "Shipper" as Shipper

rectangle "Hỗ trợ" {
  usecase "Tạo ticket hỗ trợ" as HP1
  usecase "Theo dõi trạng thái" as HP2
  usecase "Nhận phản hồi" as HP3
}

Shipper --> HP1
HP1 --> HP2
HP2 --> HP3

@enduml
```

---

### Sơ đồ use case tổng quan (khớp file `So_Do_Use_Case_Shipper.puml`)

```plantuml
@startuml
title Use Case Diagram - Tài xế/Shipper

left to right direction
skinparam actorStyle awesome

actor "Tài xế/Shipper" as Shipper

rectangle "Shipper App" {
  usecase "Đăng nhập" as S_Login
  usecase "Quản lý hồ sơ" as S_Profile
  usecase "Nhận đơn giao" as S_Assign
  usecase "Điều hướng giao hàng" as S_Navigate
  usecase "Cập nhật trạng thái" as S_Update
  usecase "Quản lý thu nhập" as S_Finance
  usecase "Nhận thông báo" as S_Notify
  usecase "Trợ giúp & hỗ trợ" as S_Support
}

Shipper --> S_Login
Shipper --> S_Profile
Shipper --> S_Assign
Shipper --> S_Navigate
Shipper --> S_Update
Shipper --> S_Finance
Shipper --> S_Notify
Shipper --> S_Support

S_Assign ..> S_Navigate : <<include>>
S_Assign ..> S_Update : <<include>>
S_Update ..> S_Notify : <<extend>>
S_Finance ..> S_Assign : <<include>>
S_Support ..> S_Notify : <<include>>

@enduml
```

