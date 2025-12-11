# MÔ TẢ GIAO DIỆN NGƯỜI DÙNG - FOOD ORDER APP

## MỤC LỤC
1. [Màn hình chung](#màn-hình-chung)
2. [Màn hình khách hàng](#màn-hình-khách-hàng)
3. [Màn hình nhà hàng/Admin](#màn-hình-nhà-hàngadmin)
4. [Màn hình Shipper](#màn-hình-shipper)

---

## MÀN HÌNH CHUNG

### 1. WelcomeScreen (Màn hình chào mừng)
**Mục đích:** Màn hình đầu tiên khi người dùng mở ứng dụng, giới thiệu ứng dụng và hướng dẫn đăng nhập/đăng ký.

**Thành phần chính:**
- Logo ứng dụng (120x120px)
- Tên ứng dụng: "Food Order"
- Slogan: "Đặt đồ ăn ngon, giao hàng nhanh"
- Nút "Đăng nhập" (màu đỏ #ee4d2d)
- Nút "Đăng ký" (nền trắng, viền đỏ)
- Footer với liên kết "Điều khoản dịch vụ" và "Chính sách bảo mật"

**Chức năng:**
- Điều hướng đến màn hình đăng nhập
- Điều hướng đến màn hình đăng ký

---

### 2. LoginScreen (Màn hình đăng nhập)
**Mục đích:** Xác thực người dùng và phân quyền theo vai trò (khách hàng, nhà hàng, shipper, admin).

**Thành phần chính:**
- Hero card với icon và thông điệp chào mừng theo vai trò
- Form card chứa:
  - Logo và tên ứng dụng
  - Bộ chuyển đổi vai trò (Khách hàng, Nhà hàng, Shipper)
  - Trường nhập Email
  - Trường nhập Mật khẩu (có nút hiện/ẩn)
  - Liên kết "Quên mật khẩu?"
  - Nút "Đăng nhập" với gradient
  - Liên kết "Đăng ký ngay"

**Chức năng:**
- Chọn vai trò đăng nhập (customer, restaurant, shipper)
- Nhập email và mật khẩu
- Xác thực thông tin đăng nhập với Firebase
- Kiểm tra và điều hướng theo vai trò người dùng
- Xử lý các lỗi đăng nhập (sai thông tin, tài khoản không tồn tại, v.v.)
- Điều hướng đến màn hình đặt lại mật khẩu

**Luồng tương tác:**
1. Người dùng chọn vai trò
2. Nhập email và mật khẩu
3. Nhấn "Đăng nhập"
4. Hệ thống xác thực và điều hướng đến ứng dụng tương ứng

---

### 3. RegisterScreen (Màn hình đăng ký)
**Mục đích:** Tạo tài khoản mới cho người dùng.

**Thành phần chính:**
- Form đăng ký với các trường:
  - Họ tên
  - Email
  - Số điện thoại
  - Mật khẩu
  - Xác nhận mật khẩu
- Nút "Đăng ký"
- Liên kết "Đã có tài khoản? Đăng nhập"

**Chức năng:**
- Tạo tài khoản mới
- Xác thực thông tin nhập
- Lưu thông tin người dùng vào Firebase

---

### 4. ResetPasswordScreen (Màn hình đặt lại mật khẩu)
**Mục đích:** Cho phép người dùng đặt lại mật khẩu khi quên.

**Thành phần chính:**
- Trường nhập Email
- Nút "Gửi email đặt lại mật khẩu"
- Hướng dẫn sử dụng

**Chức năng:**
- Gửi email đặt lại mật khẩu qua Firebase Auth

---

## MÀN HÌNH KHÁCH HÀNG

### 5. HomeScreen (Màn hình chính)
**Mục đích:** Màn hình chính của khách hàng, hiển thị danh sách món ăn, nhà hàng, khuyến mãi và cho phép tìm kiếm.

**Thành phần chính:**
- **Header:**
  - **Thanh tìm kiếm:** Tìm kiếm món ăn và nhà hàng (nằm bên trái)
  - **Nút giỏ hàng:** Icon giỏ hàng nằm bên phải thanh tìm kiếm, hiển thị badge số lượng món trong giỏ (khi có món)
- **Danh mục:** Danh sách ngang các danh mục món ăn (Pizza, Burger, Phở, v.v.)
- **Khuyến mãi:** Carousel các chương trình khuyến mãi đang diễn ra
- **Nhà hàng nổi bật:** Danh sách ngang các nhà hàng được đề xuất
- **Món bạn hay mua:** Gợi ý dựa trên lịch sử mua hàng
- **Gợi ý dựa trên sở thích:** Gợi ý cá nhân hóa
- **Tất cả món ăn:** Lưới 2 cột hiển thị tất cả món ăn với:
  - Hình ảnh món ăn
  - Tên món
  - Tên nhà hàng
  - Đánh giá (sao)
  - Số lượng đã bán
  - Giá
  - Nút thêm vào giỏ hàng
  - Nút yêu thích
- **Nút chat AI:** Nút chat nổi ở góc dưới bên phải màn hình

**Chức năng:**
- Tìm kiếm món ăn và nhà hàng theo từ khóa
- Nhấn vào nút giỏ hàng để xem giỏ hàng (điều hướng đến CartScreen)
- Lọc món ăn theo danh mục
- Sắp xếp món ăn (mặc định, giá tăng/giảm, bán chạy, đánh giá cao)
- Lọc theo khoảng giá (dưới 50K, 50K-150K, trên 150K)
- Xem chi tiết món ăn
- Thêm món vào yêu thích
- Thêm món vào giỏ hàng
- Xem chi tiết nhà hàng
- Xem danh sách voucher
- Pull-to-refresh để làm mới dữ liệu

**Luồng tương tác:**
1. Người dùng có thể tìm kiếm hoặc duyệt danh mục
2. Chọn danh mục để lọc món ăn
3. Nhấn vào món ăn để xem chi tiết
4. Thêm vào giỏ hàng hoặc yêu thích
5. Nhấn vào nhà hàng để xem thông tin chi tiết

---

### 6. FoodDetailScreen (Màn hình chi tiết món ăn)
**Mục đích:** Hiển thị thông tin chi tiết về món ăn và cho phép thêm vào giỏ hàng.

**Thành phần chính:**
- Hình ảnh món ăn (full-width)
- Tên món ăn
- Tên nhà hàng (có thể nhấn để xem chi tiết)
- Đánh giá và số lượng đánh giá
- Giá
- Mô tả món ăn
- Điều chỉnh số lượng
- Nút "Thêm vào giỏ hàng"
- Nút yêu thích

**Chức năng:**
- Xem thông tin chi tiết món ăn
- Điều chỉnh số lượng
- Thêm vào giỏ hàng
- Thêm/bỏ yêu thích
- Xem nhà hàng cung cấp món

---

### 7. RestaurantDetailScreen (Màn hình chi tiết nhà hàng)
**Mục đích:** Hiển thị thông tin chi tiết về nhà hàng và menu của nhà hàng.

**Thành phần chính:**
- Hình ảnh/logo nhà hàng
- Tên nhà hàng
- Đánh giá và số lượng đánh giá
- Địa chỉ
- Thời gian giao hàng
- Thông tin mở cửa
- Danh sách món ăn của nhà hàng
- Nút yêu thích nhà hàng

**Chức năng:**
- Xem thông tin nhà hàng
- Xem menu nhà hàng
- Thêm/bỏ yêu thích nhà hàng
- Xem chi tiết món ăn từ menu

---

### 8. RestaurantListScreen (Màn hình danh sách nhà hàng)
**Mục đích:** Hiển thị danh sách tất cả nhà hàng trong hệ thống.

**Thành phần chính:**
- Thanh tìm kiếm
- Danh sách nhà hàng dạng card với:
  - Logo/hình ảnh
  - Tên nhà hàng
  - Đánh giá
  - Địa chỉ
  - Thời gian giao hàng
  - Tags (nếu có)

**Chức năng:**
- Tìm kiếm nhà hàng
- Lọc nhà hàng
- Xem chi tiết nhà hàng

---

### 9. CartScreen (Màn hình giỏ hàng)
**Mục đích:** Quản lý các món ăn đã thêm vào giỏ hàng trước khi thanh toán.

**Thành phần chính:**
- Header với:
  - Icon giỏ hàng và số lượng món
  - Nút "Chọn tất cả"
- Danh sách món trong giỏ với mỗi món hiển thị:
  - Checkbox để chọn
  - Hình ảnh món ăn
  - Tên món
  - Tên nhà hàng
  - Giá đơn vị
  - Điều chỉnh số lượng (+/-)
  - Tổng tiền của món
  - Nút xóa
- Footer với:
  - Banner miễn phí vận chuyển (nếu đủ điều kiện)
  - Tạm tính
  - Phí vận chuyển
  - Tổng cộng
  - Nút "Thanh toán"

**Chức năng:**
- Chọn/bỏ chọn từng món
- Chọn tất cả/bỏ chọn tất cả
- Điều chỉnh số lượng món
- Xóa món khỏi giỏ hàng
- Tính toán tự động:
  - Tạm tính
  - Phí vận chuyển (miễn phí nếu đơn >= 100,000đ)
  - Tổng cộng
- Điều hướng đến màn hình thanh toán
- Hiển thị thông báo miễn phí vận chuyển

**Luồng tương tác:**
1. Người dùng chọn các món muốn thanh toán
2. Xem tổng tiền
3. Nhấn "Thanh toán" để chuyển đến CheckoutScreen

---

### 10. CheckoutScreen (Màn hình thanh toán)
**Mục đích:** Nhập thông tin giao hàng và hoàn tất đặt hàng.

**Thành phần chính:**
- **Địa chỉ nhận hàng:**
  - Họ tên người nhận
  - Số điện thoại
  - Địa chỉ (có thể lấy vị trí hiện tại)
  - Nút "Vị trí hiện tại"
  - Nút "Xem bản đồ" (nếu có vị trí)
- **Món đã chọn:** Danh sách món với hình ảnh, tên, số lượng, giá
- **Voucher & khuyến mãi:**
  - Nút chọn voucher
  - Hiển thị voucher đã chọn (nếu có)
- **Phương thức thanh toán:**
  - Thanh toán khi nhận hàng (COD)
  - Chuyển khoản ngân hàng
  - Ví MoMo (quét QR)
- **Ghi chú:** Textarea cho ghi chú đơn hàng
- **Bottom sheet:**
  - Tổng giá trị đơn hàng
  - Phí giao hàng
  - Giảm giá voucher (nếu có)
  - Tổng cộng
  - Nút "Đặt đơn"

**Chức năng:**
- Nhập thông tin giao hàng
- Lấy vị trí hiện tại tự động
- Chọn voucher (nếu có)
- Chọn phương thức thanh toán
- Tính toán tổng tiền (bao gồm voucher)
- Đặt đơn hàng
- Xử lý thanh toán MoMo (hiển thị QR code)
- Tạo đơn hàng trong Firebase
- Xóa món đã đặt khỏi giỏ hàng
- Tạo thông báo cho khách hàng

**Luồng tương tác:**
1. Nhập thông tin giao hàng
2. Chọn voucher (tùy chọn)
3. Chọn phương thức thanh toán
4. Xem tổng tiền
5. Nhấn "Đặt đơn"
6. Nếu MoMo: quét QR và xác nhận thanh toán
7. Đơn hàng được tạo và điều hướng đến màn hình đơn hàng

---

### 11. OrdersScreen (Màn hình đơn hàng)
**Mục đích:** Hiển thị lịch sử và trạng thái các đơn hàng của khách hàng.

**Thành phần chính:**
- **Header:** Tiêu đề "Đơn hàng của tôi"
- **Tabs:** 
  - Tất cả
  - Chờ xác nhận
  - Đang chuẩn bị
  - Đang giao
  - Đã giao
  - Đã hủy
- **Danh sách đơn hàng:** Mỗi đơn hiển thị:
  - Logo nhà hàng
  - Tên nhà hàng
  - Ngày đặt
  - Trạng thái với icon và màu sắc
  - Progress tracking (Đã đặt → Đang chuẩn bị → Đang giao → Đã giao)
  - Danh sách món (tối đa 2 món, +X món khác)
  - Ghi chú (nếu có)
  - Tổng cộng
  - Các nút hành động:
    - Hủy đơn (nếu đang chờ)
    - Theo dõi (nếu đang giao)
    - Đánh giá (nếu đã giao)
    - Chi tiết

**Chức năng:**
- Lọc đơn hàng theo trạng thái
- Xem chi tiết đơn hàng (modal)
- Hủy đơn hàng (nếu đang chờ)
- Theo dõi đơn hàng trên bản đồ
- Đánh giá đơn hàng (tổng thể, nhà hàng, shipper, món ăn)
- Xem lịch sử đơn hàng

**Modal chi tiết đơn hàng:**
- Thông tin đơn hàng (mã, ngày, trạng thái)
- Địa chỉ giao hàng
- Danh sách món đã đặt
- Ghi chú
- Tổng thanh toán (tạm tính, phí vận chuyển, giảm giá, tổng cộng)
- Nút theo dõi (nếu đang giao)

**Modal đánh giá:**
- Tabs: Tổng thể, Nhà hàng, Shipper, Món ăn
- Chọn sao (1-5)
- Nhập đánh giá (text)
- Gửi đánh giá

---

### 12. OrderTrackingScreen (Màn hình theo dõi đơn hàng)
**Mục đích:** Hiển thị vị trí đơn hàng trên bản đồ và trạng thái giao hàng.

**Thành phần chính:**
- Bản đồ Google Maps
- Marker vị trí nhà hàng
- Marker vị trí khách hàng
- Marker vị trí shipper (nếu đang giao)
- Thông tin đơn hàng
- Trạng thái giao hàng
- Thông tin shipper (nếu có)

**Chức năng:**
- Xem vị trí trên bản đồ
- Theo dõi vị trí shipper real-time
- Xem thông tin liên hệ shipper

---

### 13. ProfileScreen (Màn hình hồ sơ)
**Mục đích:** Quản lý thông tin cá nhân và truy cập các tính năng khác.

**Thành phần chính:**
- **Header:**
  - Avatar (có thể thay đổi)
  - Tên người dùng
  - Email
  - Nút "Chỉnh sửa thông tin"
- **Thống kê:**
  - Xu (coins)
  - Voucher
  - Yêu thích
  - Tổng đơn hàng
  - Tổng chi tiêu
  - Đơn đã hoàn thành
  - Nhà hàng yêu thích
- **Thành tích:** Carousel các achievement với:
  - Icon
  - Tên thành tích
  - Mô tả
  - Progress bar
  - Trạng thái mở khóa
- **Menu:**
  - Thông tin tài khoản
  - Sổ địa chỉ
  - Phương thức thanh toán
  - Voucher của tôi
  - Món ăn yêu thích
  - Cài đặt
  - Trung tâm trợ giúp
  - Trợ lý AI
- **Nút đăng xuất**

**Chức năng:**
- Xem và chỉnh sửa thông tin cá nhân
- Thay đổi avatar
- Xem thống kê
- Xem thành tích
- Điều hướng đến các màn hình khác
- Đăng xuất

**Modal chỉnh sửa:**
- Nhập họ tên
- Nhập số điện thoại
- Lưu thay đổi

---

### 14. AccountInfoScreen (Màn hình thông tin tài khoản)
**Mục đích:** Xem và chỉnh sửa thông tin tài khoản chi tiết.

**Thành phần chính:**
- Form với các trường:
  - Họ tên
  - Email (read-only)
  - Số điện thoại
  - Ngày sinh
  - Giới tính
- Nút "Lưu thay đổi"
- Nút "Đổi mật khẩu"

**Chức năng:**
- Cập nhật thông tin cá nhân
- Đổi mật khẩu

---

### 15. AddressScreen (Màn hình sổ địa chỉ)
**Mục đích:** Quản lý danh sách địa chỉ giao hàng.

**Thành phần chính:**
- Danh sách địa chỉ đã lưu
- Nút "Thêm địa chỉ mới"
- Mỗi địa chỉ hiển thị:
  - Tên người nhận
  - Số điện thoại
  - Địa chỉ chi tiết
  - Nút chỉnh sửa
  - Nút xóa
  - Checkbox "Địa chỉ mặc định"

**Chức năng:**
- Xem danh sách địa chỉ
- Thêm địa chỉ mới
- Chỉnh sửa địa chỉ
- Xóa địa chỉ
- Đặt địa chỉ mặc định

---

### 16. AddAddressScreen (Màn hình thêm địa chỉ)
**Mục đích:** Thêm hoặc chỉnh sửa địa chỉ giao hàng.

**Thành phần chính:**
- Form với các trường:
  - Tên người nhận
  - Số điện thoại
  - Địa chỉ
  - Phường/Xã
  - Quận/Huyện
  - Tỉnh/Thành phố
- Nút "Lấy vị trí hiện tại"
- Checkbox "Đặt làm địa chỉ mặc định"
- Nút "Lưu"

**Chức năng:**
- Nhập thông tin địa chỉ
- Lấy vị trí tự động
- Lưu địa chỉ

---

### 17. PaymentScreen (Màn hình phương thức thanh toán)
**Mục đích:** Quản lý các phương thức thanh toán đã lưu.

**Thành phần chính:**
- Danh sách phương thức thanh toán:
  - Thẻ ngân hàng
  - Ví MoMo
  - Tài khoản ngân hàng
- Nút "Thêm phương thức thanh toán"
- Mỗi phương thức hiển thị:
  - Icon
  - Tên
  - Thông tin (số thẻ, số tài khoản)
  - Nút xóa

**Chức năng:**
- Xem danh sách phương thức thanh toán
- Thêm phương thức mới
- Xóa phương thức

---

### 18. VouchersScreen (Màn hình voucher)
**Mục đích:** Xem và quản lý các voucher khả dụng.

**Thành phần chính:**
- Tabs: "Khả dụng" và "Đã sử dụng"
- Danh sách voucher với mỗi voucher hiển thị:
  - Mã voucher
  - Mô tả
  - Giá trị giảm giá
  - Điều kiện sử dụng
  - Ngày hết hạn
  - Trạng thái (khả dụng/đã sử dụng/hết hạn)

**Chức năng:**
- Xem voucher khả dụng
- Xem lịch sử voucher đã dùng
- Copy mã voucher
- Xem chi tiết voucher

---

### 19. FavoritesScreen (Màn hình yêu thích)
**Mục đích:** Xem danh sách món ăn và nhà hàng đã yêu thích.

**Thành phần chính:**
- Tabs: "Món ăn" và "Nhà hàng"
- Danh sách món ăn yêu thích (grid 2 cột)
- Danh sách nhà hàng yêu thích (list)

**Chức năng:**
- Xem món ăn yêu thích
- Xem nhà hàng yêu thích
- Bỏ yêu thích
- Xem chi tiết món/nhà hàng

---

### 20. NotificationsScreen (Màn hình thông báo)
**Mục đích:** Hiển thị các thông báo từ hệ thống.

**Thành phần chính:**
- Danh sách thông báo với mỗi thông báo hiển thị:
  - Icon loại thông báo
  - Tiêu đề
  - Nội dung
  - Thời gian
  - Trạng thái đã đọc/chưa đọc
- Nút "Đánh dấu tất cả đã đọc"
- Nút "Xóa tất cả"

**Chức năng:**
- Xem danh sách thông báo
- Đánh dấu đã đọc
- Xóa thông báo
- Điều hướng đến chi tiết (nếu có)

---

### 21. ChatbotScreen (Màn hình trợ lý AI)
**Mục đích:** Tương tác với trợ lý AI để được hỗ trợ.

**Thành phần chính:**
- Header với tên "Trợ lý AI"
- Danh sách tin nhắn (chat interface)
- Input để nhập tin nhắn
- Nút gửi

**Chức năng:**
- Chat với AI
- Nhận gợi ý món ăn
- Hỏi về đơn hàng
- Hỗ trợ khách hàng

---

### 22. SettingsScreen (Màn hình cài đặt)
**Mục đích:** Cài đặt ứng dụng và tài khoản.

**Thành phần chính:**
- Các tùy chọn:
  - Thông báo
  - Ngôn ngữ
  - Đơn vị tiền tệ
  - Chế độ tối (nếu có)
  - Xóa dữ liệu
  - Xóa tài khoản
- Thông tin ứng dụng:
  - Phiên bản
  - Điều khoản
  - Chính sách bảo mật

**Chức năng:**
- Bật/tắt thông báo
- Thay đổi ngôn ngữ
- Xóa dữ liệu
- Xóa tài khoản

---

### 23. HelpScreen (Màn hình trợ giúp)
**Mục đích:** Cung cấp thông tin hỗ trợ và FAQ.

**Thành phần chính:**
- Danh sách câu hỏi thường gặp
- Liên kết liên hệ hỗ trợ
- Hướng dẫn sử dụng

**Chức năng:**
- Xem FAQ
- Liên hệ hỗ trợ
- Xem hướng dẫn

---

## MÀN HÌNH NHÀ HÀNG/ADMIN

### 24. AdminDashboardScreen (Màn hình dashboard)
**Mục đích:** Tổng quan hoạt động của nhà hàng và hệ thống (cho admin).

**Thành phần chính:**
- **Header:**
  - Logo/ảnh nhà hàng
  - Tên nhà hàng
  - Nút đăng xuất
- **Thống kê hôm nay (cards ngang):**
  - Đơn hàng mới
  - Doanh thu hôm nay
  - Khách hàng mới
  - Sản phẩm hết hàng
- **Tổng quan hệ thống (chỉ admin):**
  - Tổng người dùng
  - Tổng nhà hàng
  - Tổng đơn hàng
  - Tổng doanh thu
- **Menu quản lý:**
  - Quản lý đơn hàng
  - Quản lý món ăn
  - Danh mục món
  - Khuyến mãi
  - Người dùng (chỉ admin)
  - Quản lý nhà hàng (chỉ admin)
  - Báo cáo & phân tích
  - Hỗ trợ & khiếu nại
- **Cài đặt:**
  - Đổi mật khẩu

**Chức năng:**
- Xem thống kê real-time
- Điều hướng đến các màn hình quản lý
- Xem tổng quan hệ thống (admin)
- Đổi mật khẩu
- Đăng xuất

---

### 25. ManageOrdersScreen (Màn hình quản lý đơn hàng)
**Mục đích:** Quản lý và xử lý các đơn hàng của nhà hàng.

**Thành phần chính:**
- **Header:**
  - Tìm kiếm đơn hàng
  - Filter theo trạng thái
- **Danh sách đơn hàng:** Mỗi đơn hiển thị:
  - Mã đơn hàng
  - Thông tin khách hàng
  - Danh sách món
  - Tổng tiền
  - Trạng thái
  - Thời gian đặt
  - Các nút hành động:
    - Xác nhận đơn
    - Đang chuẩn bị
    - Sẵn sàng giao
    - Hủy đơn

**Chức năng:**
- Xem danh sách đơn hàng
- Tìm kiếm đơn hàng
- Lọc theo trạng thái
- Cập nhật trạng thái đơn hàng
- Xem chi tiết đơn hàng
- Hủy đơn hàng

---

### 26. ManageFoodsScreen (Màn hình quản lý món ăn)
**Mục đích:** Quản lý menu món ăn của nhà hàng.

**Thành phần chính:**
- **Header:**
  - Nút "Thêm món mới"
  - Tìm kiếm
- **Danh sách món ăn:** Mỗi món hiển thị:
  - Hình ảnh
  - Tên món
  - Danh mục
  - Giá
  - Trạng thái (còn hàng/hết hàng)
  - Nút chỉnh sửa
  - Nút xóa

**Chức năng:**
- Xem danh sách món ăn
- Thêm món mới
- Chỉnh sửa món ăn
- Xóa món ăn
- Thay đổi trạng thái (còn/hết hàng)
- Upload hình ảnh

---

### 27. ManageCategoriesScreen (Màn hình quản lý danh mục)
**Mục đích:** Quản lý các danh mục món ăn.

**Thành phần chính:**
- Danh sách danh mục
- Nút "Thêm danh mục"
- Mỗi danh mục hiển thị:
  - Icon
  - Tên danh mục
  - Mô tả
  - Thứ tự ưu tiên
  - Nút chỉnh sửa
  - Nút xóa

**Chức năng:**
- Xem danh sách danh mục
- Thêm danh mục mới
- Chỉnh sửa danh mục
- Xóa danh mục
- Sắp xếp thứ tự

---

### 28. PromotionManagementScreen (Màn hình quản lý khuyến mãi)
**Mục đích:** Tạo và quản lý các chương trình khuyến mãi.

**Thành phần chính:**
- Danh sách khuyến mãi
- Nút "Tạo khuyến mãi mới"
- Mỗi khuyến mãi hiển thị:
  - Hình ảnh
  - Tiêu đề
  - Mô tả
  - Mã voucher
  - Giá trị giảm giá
  - Điều kiện
  - Ngày hết hạn
  - Trạng thái (active/inactive)
  - Nút chỉnh sửa
  - Nút xóa

**Chức năng:**
- Xem danh sách khuyến mãi
- Tạo khuyến mãi mới
- Chỉnh sửa khuyến mãi
- Xóa khuyến mãi
- Bật/tắt khuyến mãi

---

### 29. StatisticsScreen (Màn hình thống kê)
**Mục đích:** Xem báo cáo và phân tích doanh thu, đơn hàng.

**Thành phần chính:**
- **Biểu đồ:**
  - Doanh thu theo ngày/tuần/tháng
  - Số đơn hàng theo thời gian
  - Top món bán chạy
  - Phân tích khách hàng
- **Bảng số liệu:**
  - Tổng doanh thu
  - Tổng đơn hàng
  - Đơn hàng trung bình
  - Tỷ lệ hủy đơn

**Chức năng:**
- Xem thống kê doanh thu
- Xem thống kê đơn hàng
- Phân tích xu hướng
- Export báo cáo (nếu có)

---

### 30. ManageUsersScreen (Màn hình quản lý người dùng - Admin)
**Mục đích:** Quản lý tất cả người dùng trong hệ thống.

**Thành phần chính:**
- Tabs: Khách hàng, Nhà hàng, Shipper
- Danh sách người dùng với mỗi người dùng hiển thị:
  - Avatar
  - Tên
  - Email
  - Số điện thoại
  - Vai trò
  - Trạng thái (active/blocked)
  - Nút chỉnh sửa
  - Nút khóa/mở khóa

**Chức năng:**
- Xem danh sách người dùng
- Lọc theo vai trò
- Chỉnh sửa thông tin người dùng
- Khóa/mở khóa tài khoản
- Xóa người dùng

---

### 31. ManageRestaurantsScreen (Màn hình quản lý nhà hàng - Admin)
**Mục đích:** Quản lý tất cả nhà hàng trong hệ thống.

**Thành phần chính:**
- Danh sách nhà hàng với mỗi nhà hàng hiển thị:
  - Logo
  - Tên nhà hàng
  - Địa chỉ
  - Số điện thoại
  - Trạng thái (active/inactive)
  - Đánh giá
  - Nút chỉnh sửa
  - Nút xóa
  - Nút duyệt (nếu chưa duyệt)

**Chức năng:**
- Xem danh sách nhà hàng
- Duyệt nhà hàng mới
- Chỉnh sửa thông tin nhà hàng
- Khóa/mở khóa nhà hàng
- Xóa nhà hàng

---

### 32. RestaurantAccountScreen (Màn hình tài khoản nhà hàng)
**Mục đích:** Quản lý thông tin tài khoản nhà hàng.

**Thành phần chính:**
- Form với các trường:
  - Tên nhà hàng
  - Email
  - Số điện thoại
  - Địa chỉ
  - Mô tả
  - Giờ mở cửa
  - Logo nhà hàng
- Nút "Lưu thay đổi"
- Nút "Đổi mật khẩu"

**Chức năng:**
- Cập nhật thông tin nhà hàng
- Upload logo
- Đổi mật khẩu

---

### 33. RestaurantNotificationsScreen (Màn hình thông báo nhà hàng)
**Mục đích:** Xem thông báo cho nhà hàng.

**Thành phần chính:**
- Danh sách thông báo:
  - Đơn hàng mới
  - Đánh giá mới
  - Hệ thống
- Nút "Đánh dấu tất cả đã đọc"

**Chức năng:**
- Xem thông báo
- Đánh dấu đã đọc
- Điều hướng đến chi tiết

---

### 34. SupportCenterScreen (Màn hình hỗ trợ)
**Mục đích:** Xử lý các yêu cầu hỗ trợ và khiếu nại.

**Thành phần chính:**
- Danh sách ticket hỗ trợ
- Nút "Tạo ticket mới"
- Mỗi ticket hiển thị:
  - Mã ticket
  - Tiêu đề
  - Nội dung
  - Trạng thái (mới/đang xử lý/đã giải quyết)
  - Thời gian
  - Nút xem chi tiết

**Chức năng:**
- Xem danh sách ticket
- Tạo ticket mới
- Xem chi tiết ticket
- Phản hồi ticket
- Đóng ticket

---

## MÀN HÌNH SHIPPER

### 35. ShipperOrdersScreen (Màn hình đơn hàng shipper)
**Mục đích:** Quản lý đơn hàng cần giao và đơn hàng đang giao.

**Thành phần chính:**
- **Header:**
  - Icon và tiêu đề
  - Gợi ý đơn hàng (carousel ngang)
  - Thanh tìm kiếm
  - Filter tabs: Tất cả, Chờ nhận, Của tôi
- **Danh sách đơn hàng:** Mỗi đơn hiển thị:
  - Mã đơn hàng
  - Thông tin nhà hàng (tên, địa chỉ, SĐT)
  - Thông tin khách hàng (tên, địa chỉ, SĐT)
  - Phí giao hàng
  - Trạng thái
  - Các nút:
    - Gọi nhà hàng
    - Gọi khách hàng
    - Xem bản đồ (nếu đã nhận)
    - Nhận đơn
    - Cập nhật trạng thái (Đến lấy hàng → Đã lấy hàng → Giao thành công)
    - Giao thất bại

**Chức năng:**
- Xem đơn hàng chờ nhận
- Xem đơn hàng đã nhận
- Tìm kiếm đơn hàng
- Nhận đơn hàng
- Cập nhật trạng thái giao hàng
- Gọi điện liên hệ
- Xem bản đồ
- Ghi nhận giao hàng thất bại

**Modal chi tiết đơn hàng:**
- Thông tin đơn hàng
- Thông tin nhà hàng
- Thông tin khách hàng
- Danh sách món
- Ghi chú

**Modal giao thất bại:**
- Nhập lý do giao hàng thất bại
- Xác nhận

**Luồng tương tác:**
1. Shipper xem danh sách đơn chờ nhận
2. Chọn đơn muốn nhận
3. Nhấn "Nhận đơn"
4. Cập nhật trạng thái: Đến lấy hàng → Đã lấy hàng → Giao thành công
5. Hoặc ghi nhận giao thất bại nếu có vấn đề

---

### 36. ShipperMapScreen (Màn hình bản đồ shipper)
**Mục đích:** Hiển thị bản đồ với vị trí shipper và các đơn hàng cần giao.

**Thành phần chính:**
- Bản đồ Google Maps
- Marker vị trí shipper (real-time)
- Marker vị trí nhà hàng
- Marker vị trí khách hàng
- Danh sách đơn hàng (bottom sheet)
- Thông tin đơn hàng đang giao

**Chức năng:**
- Xem vị trí trên bản đồ
- Xem đơn hàng cần giao
- Chọn đơn hàng để xem chi tiết
- Điều hướng đến địa chỉ

---

### 37. ShipperFinanceScreen (Màn hình tài chính shipper)
**Mục đích:** Xem thống kê thu nhập và lịch sử giao hàng.

**Thành phần chính:**
- **Thống kê:**
  - Tổng thu nhập hôm nay
  - Tổng thu nhập tuần này
  - Tổng thu nhập tháng này
  - Số đơn đã giao
- **Lịch sử giao hàng:**
  - Danh sách đơn đã giao với:
    - Mã đơn
    - Ngày giao
    - Phí giao hàng
    - Trạng thái (thành công/thất bại)

**Chức năng:**
- Xem thống kê thu nhập
- Xem lịch sử giao hàng
- Lọc theo thời gian
- Export báo cáo (nếu có)

---

### 38. ShipperProfileScreen (Màn hình hồ sơ shipper)
**Mục đích:** Quản lý thông tin cá nhân shipper.

**Thành phần chính:**
- Avatar
- Tên
- Email
- Số điện thoại
- Đánh giá trung bình
- Số đơn đã giao
- Nút "Chỉnh sửa thông tin"
- Nút "Đổi mật khẩu"
- Nút "Đăng xuất"

**Chức năng:**
- Xem thông tin cá nhân
- Chỉnh sửa thông tin
- Đổi mật khẩu
- Đăng xuất

---

### 39. ShipperNotificationsScreen (Màn hình thông báo shipper)
**Mục đích:** Xem thông báo cho shipper.

**Thành phần chính:**
- Danh sách thông báo:
  - Đơn hàng mới
  - Đánh giá mới
  - Hệ thống

**Chức năng:**
- Xem thông báo
- Đánh dấu đã đọc
- Điều hướng đến chi tiết

---

### 40. ShipperChatbotScreen (Màn hình chatbot shipper)
**Mục đích:** Tương tác với trợ lý AI để được hỗ trợ.

**Thành phần chính:**
- Chat interface
- Input để nhập tin nhắn

**Chức năng:**
- Chat với AI
- Hỏi về đơn hàng
- Hỗ trợ shipper

---

## COMPONENTS CHUNG

### FloatingChatButton
**Mục đích:** Nút chat nổi ở góc dưới màn hình.

**Vị trí:** Góc dưới bên phải
**Chức năng:** Mở màn hình chatbot khi nhấn

---

### BottomNav
**Mục đích:** Thanh điều hướng dưới cùng cho khách hàng.

**Các tab:**
- Trang chủ
- Đơn hàng
- Yêu thích
- Hồ sơ

---

## LƯU Ý THIẾT KẾ

1. **Màu sắc chủ đạo:**
   - Màu chính: #ee4d2d (đỏ cam)
   - Màu phụ: #fff (trắng), #333 (đen), #666 (xám)

2. **Typography:**
   - Tiêu đề: Bold, 18-24px
   - Nội dung: Regular, 14-16px
   - Phụ đề: Regular, 12-14px

3. **Spacing:**
   - Padding mặc định: 16px
   - Margin giữa các section: 20px
   - Border radius: 8-16px

4. **Icons:**
   - Sử dụng Ionicons và MaterialIcons
   - Kích thước: 18-24px

5. **Loading States:**
   - Hiển thị spinner khi tải dữ liệu
   - Skeleton screens cho nội dung dài

6. **Empty States:**
   - Icon lớn
   - Thông báo rõ ràng
   - Nút hành động (nếu có)

7. **Error Handling:**
   - Hiển thị thông báo lỗi rõ ràng
   - Nút thử lại
   - Fallback UI

---

## KẾT LUẬN

Tài liệu này mô tả chi tiết tất cả các giao diện người dùng trong ứng dụng Food Order, bao gồm:
- 4 màn hình chung (Welcome, Login, Register, ResetPassword)
- 19 màn hình khách hàng
- 11 màn hình nhà hàng/admin
- 6 màn hình shipper

Mỗi màn hình được thiết kế với mục đích rõ ràng, thành phần UI cụ thể và các chức năng tương ứng để đảm bảo trải nghiệm người dùng tốt nhất.

