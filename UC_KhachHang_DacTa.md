# ĐẶC TẢ USE CASE – KHÁCH HÀNG (CUSTOMER)

Tài liệu mô tả chi tiết các ca sử dụng dành cho khách hàng trong hệ thống Food Order App. Mỗi mục gồm phần mô tả và đoạn mã PlantUML để thuận tiện dựng sơ đồ.

---

## 1. Đăng ký tài khoản

- **Tác nhân**: Khách hàng.
- **Mô tả**: Người dùng tạo tài khoản mới để bắt đầu sử dụng ứng dụng đặt đồ ăn.
- **Tiền điều kiện**: Người dùng chưa có tài khoản.
- **Luồng sự kiện**:
  1. Người dùng chọn chức năng `Đăng ký`.
  2. Nhập thông tin bắt buộc: họ tên, email, mật khẩu, số điện thoại (hoặc tài khoản mạng xã hội).
  3. Hệ thống kiểm tra tính hợp lệ (email không trùng, mật khẩu đạt yêu cầu, số điện thoại đúng định dạng).
  4. Hệ thống lưu thông tin vào cơ sở dữ liệu.
  5. (Tuỳ chọn) Hệ thống gửi email hoặc OTP xác minh, người dùng nhập mã xác nhận.
- **Hậu điều kiện**: Tài khoản mới được tạo và có thể dùng để đăng nhập.

```plantuml
@startuml
left to right direction

actor "Khách hàng" as Customer

rectangle "Chức năng Đăng ký" {
  usecase "Nhập tên đăng nhập" as UC1
  usecase "Nhập email" as UC2
  usecase "Nhập số điện thoại" as UC3
  usecase "Nhập mật khẩu" as UC4
  usecase "Xác nhận mật khẩu" as UC5
  usecase "Chọn đăng ký\nqua mạng xã hội" as UC6
  usecase "Gửi yêu cầu đăng ký" as UC7
  usecase "Kiểm tra thông tin hợp lệ" as UC8
  usecase "Tạo tài khoản" as UC9
  usecase "Lưu thông tin vào CSDL" as UC10
  usecase "Gửi email/OTP xác minh" as UC11
  usecase "Hiển thị thông báo kết quả" as UC12
}

Customer --> UC1
Customer --> UC2
Customer --> UC3
Customer --> UC4
Customer --> UC5
Customer --> UC6
Customer --> UC7

UC7 --> UC8
UC8 --> UC9 : hợp lệ
UC8 --> UC12 : lỗi
UC9 --> UC10
UC9 --> UC11
UC11 --> UC12
UC10 --> UC12

@enduml
```

---

## 2. Đăng nhập

- **Tác nhân**: Khách hàng.
- **Mô tả**: Người dùng truy cập ứng dụng bằng email/mật khẩu hoặc tài khoản liên kết (Google, Apple...).
- **Tiền điều kiện**: Đã có tài khoản và trạng thái tài khoản không bị khoá.
- **Luồng sự kiện**:
  1. Chọn `Đăng nhập`.
  2. Nhập email/mật khẩu (hoặc chọn đăng nhập bằng Google).
  3. Hệ thống xác thực thông tin.
  4. Nếu thành công, hệ thống tạo phiên và chuyển đến màn hình chính.
- **Hậu điều kiện**: Người dùng đăng nhập thành công, hệ thống lưu token phiên.

```plantuml
@startuml
left to right direction

actor "Khách hàng" as Customer

rectangle "Chức năng Đăng nhập" {
  usecase "Nhập email/username" as LG1
  usecase "Nhập mật khẩu" as LG2
  usecase "Chọn đăng nhập\nGoogle/Apple" as LG3
  usecase "Yêu cầu đăng nhập" as LG4
  usecase "Kiểm tra thông tin" as LG5
  usecase "Tạo phiên đăng nhập" as LG6
  usecase "Cập nhật trạng thái thiết bị" as LG7
  usecase "Chuyển đến màn hình chính" as LG8
  usecase "Hiển thị thông báo lỗi" as LG9
}

Customer --> LG1
Customer --> LG2
Customer --> LG3
Customer --> LG4

LG4 --> LG5
LG5 --> LG6 : hợp lệ
LG5 --> LG9 : sai thông tin
LG6 --> LG7
LG7 --> LG8

@enduml
```

---

## 3. Quản lý hồ sơ & cài đặt

- **Tác nhân**: Khách hàng.
- **Mô tả**: Xem/chỉnh sửa thông tin cá nhân, số điện thoại, avatar, thay đổi mật khẩu, thiết lập thông báo.
- **Tiền điều kiện**: Đã đăng nhập.
- **Luồng sự kiện**:
  1. Người dùng mở trang `Hồ sơ`.
  2. Thực hiện chỉnh sửa (tên, số điện thoại, ảnh đại diện, cài đặt thông báo, chế độ tối, bảo mật...).
  3. Hệ thống xác thực lại nếu thao tác nhạy cảm (đổi mật khẩu).
  4. Hệ thống lưu thay đổi.
- **Hậu điều kiện**: Thông tin mới được cập nhật, thống kê cá nhân được làm mới.

```plantuml
@startuml
left to right direction

actor "Khách hàng" as Customer

rectangle "Hồ sơ & Cài đặt" {
  usecase "Xem thông tin cá nhân" as PF1
  usecase "Chỉnh sửa tên/SDT" as PF2
  usecase "Thay ảnh đại diện" as PF3
  usecase "Thay đổi mật khẩu" as PF4
  usecase "Điều chỉnh thông báo" as PF5
  usecase "Bật/Tắt sinh trắc học" as PF6
  usecase "Lưu thay đổi" as PF7
  usecase "Xác thực thao tác nhạy cảm" as PF8
  usecase "Hiển thị kết quả" as PF9
}

Customer --> PF1
Customer --> PF2
Customer --> PF3
Customer --> PF4
Customer --> PF5
Customer --> PF6

PF2 --> PF7
PF3 --> PF7
PF4 --> PF8
PF5 --> PF7
PF6 --> PF7
PF8 --> PF7 : xác thực thành công
PF8 --> PF9 : thất bại
PF7 --> PF9

@enduml
```

---

## 4. Quản lý địa chỉ giao hàng

- **Tác nhân**: Khách hàng.
- **Mô tả**: Người dùng thêm/sửa/xoá địa chỉ, đặt địa chỉ mặc định.
- **Tiền điều kiện**: Đã đăng nhập.
- **Luồng sự kiện**:
  1. Chọn `Sổ địa chỉ`.
  2. Thêm địa chỉ mới (tên địa điểm, số nhà, ghi chú).
  3. Hệ thống xác thực thông tin, gợi ý vị trí từ bản đồ (nếu có).
  4. Người dùng có thể sửa hoặc đặt mặc định, hoặc xoá.
- **Hậu điều kiện**: Danh sách địa chỉ được cập nhật, địa chỉ mặc định dùng cho lần đặt kế tiếp.

```plantuml
@startuml
left to right direction

actor "Khách hàng" as Customer

rectangle "Sổ địa chỉ" {
  usecase "Xem danh sách địa chỉ" as AD1
  usecase "Thêm địa chỉ mới" as AD2
  usecase "Nhập thông tin địa chỉ" as AD3
  usecase "Chọn vị trí trên bản đồ" as AD4
  usecase "Đặt làm mặc định" as AD5
  usecase "Chỉnh sửa địa chỉ" as AD6
  usecase "Xoá địa chỉ" as AD7
  usecase "Lưu thay đổi" as AD8
  usecase "Xác nhận thao tác" as AD9
}

Customer --> AD1
Customer --> AD2
Customer --> AD6
Customer --> AD7
Customer --> AD5

AD2 --> AD3
AD3 --> AD4
AD4 --> AD8
AD6 --> AD3
AD6 --> AD8
AD7 --> AD9
AD8 --> AD9
AD5 --> AD9

@enduml
```

---

## 5. Quản lý phương thức thanh toán

- **Tác nhân**: Khách hàng.
- **Mô tả**: Lưu trữ/xoá thẻ ngân hàng, ví điện tử, thiết lập mặc định.
- **Tiền điều kiện**: Đã đăng nhập.
- **Luồng sự kiện**:
  1. Truy cập `Phương thức thanh toán`.
  2. Nhập thông tin thẻ/ví (số thẻ, tên chủ, ngày hết hạn...).
  3. Hệ thống kiểm tra định dạng, mã hoá và lưu.
  4. Người dùng đặt phương thức mặc định, có thể xoá khi không dùng.
- **Hậu điều kiện**: Phương thức thanh toán được cập nhật, sẵn sàng chọn trong bước checkout.

```plantuml
@startuml
left to right direction

actor "Khách hàng" as Customer

rectangle "Phương thức thanh toán" {
  usecase "Xem danh sách phương thức" as PM1
  usecase "Thêm thẻ/ ví mới" as PM2
  usecase "Nhập thông tin thẻ" as PM3
  usecase "Kiểm tra định dạng & mã hoá" as PM4
  usecase "Lưu vào kho bảo mật" as PM5
  usecase "Đặt làm mặc định" as PM6
  usecase "Xoá phương thức" as PM7
  usecase "Hiển thị kết quả" as PM8
}

Customer --> PM1
Customer --> PM2
Customer --> PM6
Customer --> PM7

PM2 --> PM3
PM3 --> PM4
PM4 --> PM5 : hợp lệ
PM4 --> PM8 : lỗi
PM5 --> PM8
PM6 --> PM8
PM7 --> PM8

@enduml
```

---

## 6. Tìm kiếm & duyệt nhà hàng/món

- **Tác nhân**: Khách hàng.
- **Mô tả**: Duyệt danh sách nhà hàng, món ăn, sử dụng bộ lọc, xem chi tiết.
- **Tiền điều kiện**: Đăng nhập (hoặc khách vãng lai nếu được phép).
- **Luồng sự kiện**:
  1. Người dùng vào trang `Trang chủ` hoặc `Nhà hàng`.
  2. Nhập từ khoá tìm kiếm hoặc chọn bộ lọc (khoảng cách, giá, đánh giá).
  3. Hệ thống hiển thị kết quả, người dùng xem chi tiết từng nhà hàng, menu, đánh giá.
  4. Từ chi tiết món, người dùng có thể thêm vào giỏ.
- **Hậu điều kiện**: Người dùng chọn được món/nhà hàng phù hợp để đặt.

```plantuml
@startuml
left to right direction

actor "Khách hàng" as Customer

rectangle "Tìm kiếm & duyệt" {
  usecase "Xem đề xuất" as BR1
  usecase "Nhập từ khoá tìm kiếm" as BR2
  usecase "Chọn bộ lọc" as BR3
  usecase "Sắp xếp kết quả" as BR4
  usecase "Xem chi tiết nhà hàng" as BR5
  usecase "Xem menu & đánh giá" as BR6
  usecase "Thêm món vào giỏ" as BR7
  usecase "Lưu nhà hàng yêu thích" as BR8
}

Customer --> BR1
Customer --> BR2
Customer --> BR3
Customer --> BR4
Customer --> BR5
Customer --> BR8

BR5 --> BR6
BR6 --> BR7

@enduml
```

---

## 7. Quản lý giỏ hàng & đặt món

- **Tác nhân**: Khách hàng.
- **Mô tả**: Thêm món vào giỏ, cập nhật số lượng, áp dụng voucher và thực hiện thanh toán.
- **Tiền điều kiện**: Đã chọn món và có địa chỉ hợp lệ.
- **Luồng sự kiện**:
  1. Thêm món từ trang chi tiết vào giỏ.
  2. Vào `Giỏ hàng` để xem danh sách, tăng/giảm/Xoá món.
  3. Chọn địa chỉ, phương thức thanh toán, áp mã giảm giá nếu có.
  4. Xác nhận đơn hàng, hệ thống tạo đơn và thông báo đến nhà hàng.
- **Hậu điều kiện**: Đơn hàng ở trạng thái `pending`, giỏ hàng được làm trống.

```plantuml
@startuml
left to right direction

actor "Khách hàng" as Customer

rectangle "Giỏ hàng & Đặt món" {
  usecase "Thêm món vào giỏ" as CR1
  usecase "Xem danh sách món" as CR2
  usecase "Điều chỉnh số lượng" as CR3
  usecase "Xoá món khỏi giỏ" as CR4
  usecase "Áp dụng voucher" as CR5
  usecase "Chọn địa chỉ giao" as CR6
  usecase "Chọn phương thức thanh toán" as CR7
  usecase "Thêm ghi chú đơn hàng" as CR8
  usecase "Xác nhận đặt món" as CR9
  usecase "Tạo đơn hàng" as CR10
  usecase "Hiển thị kết quả/ lỗi" as CR11
}

Customer --> CR1
Customer --> CR2
Customer --> CR3
Customer --> CR4
Customer --> CR5
Customer --> CR6
Customer --> CR7
Customer --> CR8
Customer --> CR9

CR9 --> CR10
CR10 --> CR11
' luồng liên quan giỏ hàng
CR1 --> CR2
CR2 --> CR3
CR3 --> CR4
CR5 --> CR10
CR6 --> CR10
CR7 --> CR10

@enduml
```

---

## 8. Theo dõi đơn hàng

- **Tác nhân**: Khách hàng.
- **Mô tả**: Kiểm tra trạng thái đơn theo thời gian thực, xem thông tin nhà hàng và tài xế.
- **Tiền điều kiện**: Đã có đơn hàng đang xử lý.
- **Luồng sự kiện**:
  1. Người dùng mở `Đơn hàng`.
  2. Chọn một đơn để xem chi tiết (trạng thái, thời gian dự kiến, thông tin shipper).
  3. Hệ thống cập nhật trạng thái real-time; người dùng có thể huỷ nếu đơn còn chờ xác nhận.
- **Hậu điều kiện**: Người dùng nắm rõ tiến trình, có thể đánh giá sau khi hoàn tất.

```plantuml
@startuml
left to right direction

actor "Khách hàng" as Customer

rectangle "Theo dõi đơn hàng" {
  usecase "Xem danh sách đơn" as TR1
  usecase "Chọn đơn cần xem" as TR2
  usecase "Hiển thị trạng thái hiện tại" as TR3
  usecase "Xem ETA & tuyến đường" as TR4
  usecase "Xem thông tin tài xế" as TR5
  usecase "Huỷ đơn (nếu cho phép)" as TR6
  usecase "Nhận thông báo cập nhật" as TR7
}

Customer --> TR1
Customer --> TR6

TR1 --> TR2
TR2 --> TR3
TR3 --> TR4
TR3 --> TR5
TR3 --> TR7
TR6 --> TR7

@enduml
```

---

## 9. Quản lý voucher

- **Tác nhân**: Khách hàng.
- **Mô tả**: Xem danh sách voucher cá nhân, điều kiện áp dụng, tình trạng sử dụng.
- **Tiền điều kiện**: Đã đăng nhập.
- **Luồng sự kiện**:
  1. Người dùng mở `Voucher của tôi`.
  2. Hệ thống hiển thị các voucher hợp lệ, sắp xếp theo hạn dùng/trạng thái.
  3. Người dùng chọn voucher khi checkout hoặc đánh dấu đã dùng.
- **Hậu điều kiện**: Voucher được gắn kết với đơn hàng hoặc cập nhật trạng thái đã sử dụng.

```plantuml
@startuml
left to right direction

actor "Khách hàng" as Customer

rectangle "Quản lý voucher" {
  usecase "Xem danh sách voucher" as VC1
  usecase "Lọc theo trạng thái" as VC2
  usecase "Xem điều kiện áp dụng" as VC3
  usecase "Chọn voucher sử dụng" as VC4
  usecase "Đánh dấu đã dùng/ hết hạn" as VC5
  usecase "Nhận thông báo voucher mới" as VC6
}

Customer --> VC1
Customer --> VC2
Customer --> VC3
Customer --> VC4
Customer --> VC5
Customer --> VC6

VC4 --> VC5

@enduml
```

---

## 10. Đánh giá & phản hồi

- **Tác nhân**: Khách hàng.
- **Mô tả**: Gửi đánh giá sau khi đơn hoàn thành cho nhà hàng, tài xế, từng món.
- **Tiền điều kiện**: Đơn hàng ở trạng thái `delivered`.
- **Luồng sự kiện**:
  1. Người dùng mở đơn đã hoàn thành.
  2. Nhập số sao, bình luận cho nhà hàng/tài xế/món.
  3. Hệ thống lưu đánh giá, tính điểm trung bình và hiện cảnh báo nếu nội dung vi phạm.
- **Hậu điều kiện**: Đánh giá được lưu, đóng góp vào xếp hạng hệ thống.

```plantuml
@startuml
left to right direction

actor "Khách hàng" as Customer

rectangle "Đánh giá & phản hồi" {
  usecase "Chọn đơn đã hoàn thành" as RV1
  usecase "Chọn đối tượng đánh giá" as RV2
  usecase "Nhập điểm số sao" as RV3
  usecase "Viết nhận xét chi tiết" as RV4
  usecase "Đính kèm hình ảnh" as RV5
  usecase "Gửi đánh giá" as RV6
  usecase "Kiểm duyệt nội dung" as RV7
  usecase "Hiển thị xác nhận" as RV8
}

Customer --> RV1
Customer --> RV2
Customer --> RV3
Customer --> RV4
Customer --> RV5
Customer --> RV6

RV6 --> RV7
RV7 --> RV8 : hợp lệ
RV7 --> RV4 : yêu cầu chỉnh sửa

@enduml
```

---

## 11. Thông báo & nhắc nhở

- **Tác nhân**: Khách hàng.
- **Mô tả**: Nhận thông báo về trạng thái đơn, khuyến mãi, nhắc nhở.
- **Tiền điều kiện**: Đã bật quyền thông báo.
- **Luồng sự kiện**:
  1. Hệ thống gửi thông báo khi có sự kiện (đơn đổi trạng thái, voucher mới).
  2. Người dùng vào `Thông báo` để đọc chi tiết, đánh dấu đã đọc hoặc xoá.
- **Hậu điều kiện**: Người dùng cập nhật thông tin kịp thời, hộp thông báo sạch sẽ.

```plantuml
@startuml
left to right direction

actor "Khách hàng" as Customer

rectangle "Thông báo & nhắc nhở" {
  usecase "Nhận thông báo push" as NF1
  usecase "Xem danh sách thông báo" as NF2
  usecase "Đánh dấu đã đọc" as NF3
  usecase "Xoá thông báo" as NF4
  usecase "Truy cập chi tiết sự kiện" as NF5
  usecase "Quản lý tuỳ chọn thông báo" as NF6
}

Customer --> NF1
Customer --> NF2
Customer --> NF3
Customer --> NF4
Customer --> NF5
Customer --> NF6

NF2 --> NF5
NF3 --> NF2
NF4 --> NF2

@enduml
```

---

## 12. Trung tâm trợ giúp

- **Tác nhân**: Khách hàng.
- **Mô tả**: Tra cứu FAQ, gửi yêu cầu hỗ trợ hoặc khiếu nại.
- **Tiền điều kiện**: Đăng nhập (đối với gửi ticket).
- **Luồng sự kiện**:
  1. Người dùng mở `Trợ giúp`.
  2. Tìm kiếm câu hỏi hoặc tạo ticket mới với nội dung chi tiết.
  3. Hệ thống ghi nhận và phản hồi qua email/thông báo khi có kết quả.
- **Hậu điều kiện**: Ticket được tạo và gán mức độ ưu tiên; người dùng nhận được cập nhật.

```plantuml
@startuml
left to right direction

actor "Khách hàng" as Customer

rectangle "Trung tâm trợ giúp" {
  usecase "Xem FAQ" as SP1
  usecase "Tìm kiếm câu hỏi" as SP2
  usecase "Tạo ticket mới" as SP3
  usecase "Mô tả vấn đề & đính kèm" as SP4
  usecase "Gửi ticket" as SP5
  usecase "Theo dõi trạng thái ticket" as SP6
  usecase "Nhận phản hồi" as SP7
}

Customer --> SP1
Customer --> SP2
Customer --> SP3
Customer --> SP6

SP3 --> SP4
SP4 --> SP5
SP5 --> SP6
SP6 --> SP7

@enduml
```

---

## 13. Trợ lý AI/Chatbot

- **Tác nhân**: Khách hàng.
- **Mô tả**: Tương tác với chatbot để hỏi thông tin món ăn, hỗ trợ đặt đơn, xử lý sự cố.
- **Tiền điều kiện**: Đăng nhập.
- **Luồng sự kiện**:
  1. Người dùng mở `Chatbot AI`.
  2. Nhập câu hỏi/nhu cầu (gợi ý món, hỏi trạng thái đơn, báo sự cố).
  3. Chatbot phản hồi thời gian thực; nếu cần, chuyển sang hỗ trợ viên.
- **Hậu điều kiện**: Người dùng nhận được tư vấn nhanh, vấn đề có thể được giải quyết hoặc escalated.

```plantuml
@startuml
left to right direction

actor "Khách hàng" as Customer

rectangle "Trợ lý AI/Chatbot" {
  usecase "Khởi động phiên chat" as CB1
  usecase "Nhập câu hỏi/ yêu cầu" as CB2
  usecase "Gợi ý món ăn" as CB3
  usecase "Tra cứu trạng thái đơn" as CB4
  usecase "Báo sự cố đơn hàng" as CB5
  usecase "Nhận phản hồi AI" as CB6
  usecase "Chuyển tới hỗ trợ viên" as CB7
  usecase "Đánh giá trải nghiệm chat" as CB8
}

Customer --> CB1
Customer --> CB2
Customer --> CB8

CB2 --> CB3
CB2 --> CB4
CB2 --> CB5
CB3 --> CB6
CB4 --> CB6
CB5 --> CB6
CB6 --> CB7 : cần hỗ trợ người
CB6 --> CB8

@enduml
```


