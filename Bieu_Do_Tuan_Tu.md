# BIỂU ĐỒ TUẦN TỰ CHÍNH - FOOD ORDER APP

Tài liệu này tổng hợp các luồng tuần tự (Sequence Diagram) quan trọng của hệ thống Food Order App. Mỗi mục gồm mô tả ngắn, các thành phần tham gia và mã PlantUML để vẽ sơ đồ.

---

## 1. Đăng ký tài khoản (Customer / Restaurant / Shipper)

- **Thành phần**: User → App → Firebase Auth → Firestore (`users`, `restaurants`)
- **Mô tả**: Người dùng nhập thông tin, hệ thống kiểm tra trùng lặp, tạo tài khoản Auth và lưu hồ sơ Firestore. Nếu role là `restaurant` thì tạo thêm hồ sơ nhà hàng.

```plantuml
@startuml
actor User
participant "Mobile App" as App
participant "Firebase Auth" as Auth
database "Firestore" as FS

User -> App: Mở màn hình Đăng ký\nnhập email/password/role
App -> FS: query users by username\n(kiểm tra trùng)
FS --> App: Kết quả trùng / không trùng
alt Trùng username
  App -> User: Báo lỗi "Tên đăng nhập đã tồn tại"
  stop
end

App -> Auth: createUserWithEmailAndPassword(email, password)
Auth --> App: uid / lỗi
alt Lỗi Auth
  App -> User: Thông báo lỗi đăng ký
  stop
end

App -> FS: setDoc(users/{uid}, profile)
alt role == restaurant
  App -> FS: setDoc(restaurants/{uid}, restaurantProfile)
end

App -> User: Thông báo thành công\nChuyển đến Login
@enduml
```

---

## 2. Đăng nhập & điều hướng theo role

- **Thành phần**: User → App → Firebase Auth → Firestore (`users`)
- **Mô tả**: Xác thực email/password, lấy profile, kiểm tra role và điều hướng đến app tương ứng (Customer/Restaurant/Shipper/Admin).

```plantuml
@startuml
actor User
participant "Mobile App" as App
participant "Firebase Auth" as Auth
database "Firestore" as FS

User -> App: Nhập email/password\nChọn mode đăng nhập
App -> Auth: signInWithEmailAndPassword
Auth --> App: uid / lỗi
alt Lỗi xác thực
  App -> User: Thông báo lỗi\n(email/mật khẩu không đúng...)
  stop
end

App -> FS: getDoc(users/{uid})
FS --> App: userData / not found
alt Không tìm thấy
  App -> User: Thông báo "Không tìm thấy người dùng"
  stop
end

App -> App: role = userData.role
alt Role khớp mode
  App -> User: Điều hướng:\n- customer -> UserApp\n- restaurant -> RestaurantApp\n- shipper -> ShipperApp\n- admin -> AdminApp
else Sai mode
  App -> User: Thông báo "Sai chế độ đăng nhập"
end
@enduml
```

---

## 3. Tìm kiếm món ăn & xem chi tiết

- **Thành phần**: User → App → Firestore (`foods`, `restaurants`, `ratings`)
- **Mô tả**: Người dùng nhập từ khóa, hệ thống tìm foods/restaurants, hiển thị kết quả; khi chọn món, tải chi tiết, nhà hàng, đánh giá, gợi ý món liên quan.

```plantuml
@startuml
actor User
participant "Mobile App" as App
database "Firestore" as FS

User -> App: Nhập từ khóa tìm kiếm
App -> FS: query foods by name/desc\nquery restaurants by name
FS --> App: Kết quả foods, restaurants
App -> User: Hiển thị danh sách kết quả

User -> App: Chọn món (foodId)
App -> FS: getDoc(foods/{foodId})
FS --> App: foodData
App -> FS: getDoc(restaurants/{restaurantId})
FS --> App: restaurantData
App -> FS: query ratings where foodId
FS --> App: ratings
App -> FS: query foods same category\nlimit 5 (gợi ý)
FS --> App: suggestions
App -> User: Hiển thị chi tiết món + nhà hàng + đánh giá + gợi ý
@enduml
```

---

## 4. Đặt món & theo dõi đơn hàng

- **Thành phần**: User → App → Firestore (`carts`, `orders`, `notifications`, `vouchers`) → Shipper → Restaurant
- **Mô tả**: Người dùng thanh toán giỏ hàng, hệ thống tạo đơn theo nhà hàng, gửi thông báo; sau đó theo dõi trạng thái real-time và hiển thị tracking.

```plantuml
@startuml
actor User
participant "Mobile App" as App
database "Firestore" as FS
participant "Restaurant" as R
participant "Shipper" as S

User -> App: Mở Giỏ hàng\nChọn địa chỉ & thanh toán\nChọn/áp dụng voucher
App -> FS: Load carts, vouchers
App -> App: Tính tổng tiền, phí ship, giảm giá

loop Mỗi nhà hàng
  App -> FS: addDoc(orders, orderPayload{restaurantId,...})
  FS --> App: orderId
  App -> FS: addDoc(notifications, to=user, orderId)
end

App -> FS: Xóa carts của user
App -> User: Hiển thị "Đặt hàng thành công"\nĐi tới màn Đơn hàng

== Theo dõi ==
App -> FS: onSnapshot(orders/{orderId})
FS --> App: Cập nhật status (pending/confirmed/preparing/shipping/delivered/cancelled)
App -> User: Cập nhật UI + tracking shipper (nếu shipping)
R -> FS: updateDoc status (confirm/preparing/shipper assigned)
S -> FS: updateDoc status (accepted/picking/delivering/delivered)
FS -> App: Notifications tới User/R/S
@enduml
```

---

## 5. Quản lý đơn hàng (Restaurant/Admin)

- **Thành phần**: Restaurant/Admin → App → Firestore (`orders`, `notifications`, `users`)
- **Mô tả**: Lọc/tìm đơn, xem chi tiết, cập nhật trạng thái, gán shipper, gửi thông báo.

```plantuml
@startuml
actor "Restaurant/Admin" as RA
participant "App (Portal/Mobile)" as App
database "Firestore" as FS

RA -> App: Mở Quản lý đơn hàng\nChọn filter (status/date/search)
App -> FS: query orders (scope theo role)
FS --> App: Danh sách đơn
RA -> App: Chọn đơn -> xem chi tiết

alt pending
  RA -> App: Xác nhận / Từ chối
  App -> FS: updateDoc(status = confirmed/cancelled)
  App -> FS: add notification to customer
end

alt confirmed/preparing
  RA -> App: Gán shipper (chọn từ users role=shipper)
  App -> FS: updateDoc(status = shipping, shipperId)
  App -> FS: add notification to shipper & customer
end

alt shipping
  App -> FS: Theo dõi trạng thái từ shipper\n(onSnapshot orders/{id})
end

alt delivered/cancelled
  App -> User: Hiển thị kết quả cuối
end
@enduml
```

---

## 6. Quản lý danh mục & món (Restaurant/Admin)

- **Thành phần**: Restaurant/Admin → App → Firestore (`categories`, `foods`) → Cloudinary
- **Mô tả**: CRUD danh mục, CRUD món (kèm upload ảnh Cloudinary).

```plantuml
@startuml
actor "Restaurant/Admin" as RA
participant "App" as App
database "Firestore" as FS
participant "Cloudinary" as CDN

== Danh mục ==
RA -> App: Mở Danh mục\nThêm/Sửa/Xóa
App -> FS: query categories orderBy priority
RA -> App: Nhập thông tin danh mục
App -> FS: addDoc/updateDoc/deleteDoc(categories)
FS --> App: Cập nhật danh sách

== Món ăn ==
RA -> App: Mở Món ăn\nThêm/Sửa/Xóa
App -> FS: query foods (theo restaurant nếu cần)
RA -> App: Nhập thông tin món + chọn ảnh
App -> CDN: Upload ảnh
CDN --> App: imageUrl
App -> FS: addDoc/updateDoc(foods, {imageUrl,...})
FS --> App: Cập nhật danh sách
@enduml
```

---

## 7. Báo cáo thống kê (Restaurant/Admin)

- **Thành phần**: Restaurant/Admin → App → Firestore (`orders`, `users`, `foods`)
- **Mô tả**: Chọn khoảng thời gian, truy vấn orders, tính KPI (doanh thu, số đơn, AOV, tỉ lệ thành công, top món, top khách), hiển thị biểu đồ.

```plantuml
@startuml
actor "Restaurant/Admin" as RA
participant "App" as App
database "Firestore" as FS

RA -> App: Chọn khoảng thời gian (today/week/month/year)
App -> FS: query orders (filter by restaurantId nếu role=restaurant)
FS --> App: Orders trong khoảng thời gian

App -> App: Tính KPI\n- totalRevenue (delivered)\n- totalOrders\n- averageOrderValue\n- successRate\n- status breakdown\n- top foods, top users

App -> RA: Hiển thị dashboard + charts\n(doanh thu theo thời gian, phân bổ trạng thái,\n top món, top khách)

RA -> App: Đổi khoảng thời gian
App -> FS: Refresh truy vấn
@enduml
```

---

## 8. Shipper nhận & giao đơn

- **Thành phần**: Shipper → App → Firestore (`orders`, `notifications`) → Customer/Restaurant
- **Mô tả**: Xem đơn khả dụng, nhận đơn, cập nhật trạng thái, thông báo cho khách và nhà hàng.

```plantuml
@startuml
actor Shipper
participant "Shipper App" as App
database "Firestore" as FS
participant Customer
participant Restaurant

Shipper -> App: Mở Đơn hàng\nXem tab Khả dụng/Của tôi
App -> FS: query orders (available / mine)
FS --> App: Danh sách đơn

Shipper -> App: Nhấn "Nhận đơn"
App -> FS: getDoc(order) kiểm tra shipperId
alt Chưa có shipper
  App -> FS: updateDoc(order, {shipperId=uid, status='accepted'})
  App -> FS: add notification to Customer & Restaurant
else Đã có shipper
  App -> Shipper: Báo "Đã có shipper khác nhận"
end

== Trạng thái ==
Shipper -> App: Cập nhật 'picking'
App -> FS: updateDoc(status='picking')
App -> FS: notify Customer

Shipper -> App: Cập nhật 'delivering'
App -> FS: updateDoc(status='delivering')
App -> FS: notify Customer

Shipper -> App: Cập nhật 'delivered' hoặc 'failed'
App -> FS: updateDoc(status, timestamps, failureReason?)
App -> FS: notify Customer & Restaurant
@enduml
```

---

## 9. Thu nhập & rút tiền (Shipper)

- **Thành phần**: Shipper → App → Firestore (`orders`, `users.wallet`, `withdrawRequests`)
- **Mô tả**: Xem số dư, lịch sử giao đã giao, thống kê, tạo yêu cầu rút tiền và cập nhật ví.

```plantuml
@startuml
actor Shipper
participant "Shipper App" as App
database "Firestore" as FS

Shipper -> App: Mở Tài chính
App -> FS: getDoc(users/{uid}) đọc wallet
FS --> App: wallet (balance, debt, pendingWithdraw, totalWithdrawn)
App -> FS: query orders where shipperId=uid AND status='delivered'
FS --> App: Lịch sử đơn đã giao
App -> App: Tính thống kê thu nhập (today/week/month/all)

Shipper -> App: Nhấn "Rút tiền"\nNhập amount + bankInfo
alt amount <= 0 or > balance
  App -> Shipper: Báo lỗi
else Hợp lệ
  App -> FS: addDoc(withdrawRequests, {shipperId, amount, bankInfo, status:'pending'})
  App -> FS: updateDoc(users/{uid},\n  wallet.balance -= amount,\n  wallet.pendingWithdraw += amount,\n  bankInfo)
  App -> Shipper: Báo "Yêu cầu rút đã gửi"
end
@enduml
```

---

## 10. Quản lý người dùng (Admin)

- **Thành phần**: Admin → Admin Portal → Firestore (`users`, `orders`)
- **Mô tả**: Tìm kiếm/lọc user, xem chi tiết, khóa/mở khóa, xóa, tạo mới; tính metadata (số đơn, tổng chi tiêu).

```plantuml
@startuml
actor Admin
participant "Admin Portal" as Portal
participant "Firebase Auth" as Auth
database "Firestore" as FS

Admin -> Portal: Mở Users page\nChọn bộ lọc (role/status/city/search)
Portal -> FS: query users
FS --> Portal: Danh sách users

loop Với từng user
  Portal -> FS: query orders where userId\n(tính orderCount, totalSpent)
end

Admin -> Portal: Chọn user -> xem chi tiết

alt Khóa/Mở khóa
  Admin -> Portal: Toggle status
  Portal -> FS: updateDoc(users/{id}, status)
end

alt Xóa user
  Admin -> Portal: Confirm delete
  Portal -> FS: deleteDoc(users/{id})
end

alt Tạo user mới
  Admin -> Portal: Nhập name/email/phone/password/role
  Portal -> Auth: createUserWithEmailAndPassword
  Portal -> FS: setDoc(users/{uid}, profile)
end

Portal -> Admin: Hiển thị thống kê (total, new 7d, active/locked, by role)
@enduml
```

---

## 11. Quản lý khuyến mãi (Admin)

- **Thành phần**: Admin → Admin Portal → Firestore (`promotions`, `orders`)
- **Mô tả**: CRUD promotion, tạm dừng/kích hoạt, thống kê lượt dùng và giá trị giảm giá áp dụng.

```plantuml
@startuml
actor Admin
participant "Admin Portal" as Portal
database "Firestore" as FS

Admin -> Portal: Mở Promotions page\nChọn filter (status/search)
Portal -> FS: query promotions orderBy createdAt desc
FS --> Portal: Danh sách promotions

alt Tạo mới
  Admin -> Portal: Nhập title/code/discount/dates
  Portal -> Portal: Tính status (scheduled/active/expired)
  Portal -> FS: addDoc(promotions, payload)
end

alt Sửa
  Admin -> Portal: Chọn promotion -> cập nhật
  Portal -> FS: updateDoc(promotions/{id}, updates)
end

alt Xóa
  Admin -> Portal: Confirm delete
  Portal -> FS: deleteDoc(promotions/{id})
end

alt Tạm dừng/Kích hoạt
  Admin -> Portal: Toggle status
  Portal -> FS: updateDoc(promotions/{id}, status)
end

== Thống kê ==
Portal -> FS: Đếm promotions (total, active)
Portal -> FS: Query orders có voucherId\n(tính tổng voucherDiscount)
Portal -> Admin: Hiển thị KPIs (total promos, active, usedCount, total discount)
@enduml
```

---

## 12. Tổng quan tracking giao hàng (Customer - Shipper - Restaurant)

- **Thành phần**: Customer → App, Shipper → App, Restaurant → App, Firestore (`orders`), Maps
- **Mô tả**: Minh họa tương tác 3 bên trong giai đoạn giao hàng và cập nhật vị trí.

```plantuml
@startuml
actor Customer as C
actor Shipper as S
actor Restaurant as R
participant "Orders Collection" as Orders
participant "Mobile App" as App

R -> Orders: update status = confirmed/preparing
Orders --> App: onSnapshot -> update UI customer

R -> Orders: update status = shipping\n(assign shipperId)
Orders --> App: notify C & S

S -> Orders: update status = picking\n(update shipperLocation)
Orders --> App: onSnapshot -> C thấy trạng thái

S -> Orders: update status = delivering\n(update shipperLocation)
Orders --> App: Render map + tiến trình

S -> Orders: update status = delivered\n(deliveredAt)
Orders --> App: notify C & R

C -> App: Hiển thị đánh giá đơn hàng\n(đánh giá shipper/nhà hàng/món)
@enduml
```

---

### Ghi chú
- Các diagram dùng PlantUML, có thể copy vào bất kỳ renderer PlantUML nào để xem hình.
- Các thành phần Firestore và Auth bám sát cấu trúc hiện tại: collections `users`, `restaurants`, `foods`, `categories`, `orders`, `notifications`, `promotions`, `withdrawRequests`, `vouchers`.


