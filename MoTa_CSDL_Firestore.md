# MÔ TẢ CSDL FIRESTORE - FOOD ORDER APP

Tài liệu mô tả các collection chính đang dùng (đã dựa trên code hiện tại: query/addDoc/updateDoc với Firestore). Mỗi collection gồm trường, kiểu dữ liệu, ràng buộc và mô tả ngắn.

## users
| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| id (uid) | STRING | PK, NOT NULL | Mã người dùng (Auth UID) |
| email | STRING | NOT NULL, UNIQUE | Email đăng nhập |
| name | STRING | NOT NULL | Tên hiển thị |
| phone | STRING | NULLABLE | Số điện thoại |
| role | STRING | DEFAULT 'customer' | customer \| restaurant \| shipper \| admin |
| avatarUrl | STRING | NULLABLE | Ảnh đại diện |
| wallet | OBJECT | NULLABLE | { balance, debt, pendingWithdraw, totalWithdrawn } |
| addresses | ARRAY\<Address\> | NULLABLE | Danh sách địa chỉ |
| createdAt | TIMESTAMP | NOT NULL | Thời gian tạo |

**Address (embedded)**: `{ label, fullText, lat, lng, isDefault }`  
**Wallet (embedded)**: `{ balance, debt, pendingWithdraw, totalWithdrawn }`

## restaurants
| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| id | STRING | PK | Trùng UID chủ nhà hàng |
| ownerId | STRING | FK users.id | Chủ sở hữu |
| name | STRING | NOT NULL | Tên nhà hàng |
| address | STRING | NOT NULL | Địa chỉ |
| phone | STRING | NULLABLE | SĐT |
| openingHours | STRING | NULLABLE | Giờ mở cửa |
| logoUrl | STRING | NULLABLE | Logo (Cloudinary) |
| image | STRING | NULLABLE | Ảnh cover |
| rating | NUMBER | DEFAULT 0 | Điểm đánh giá |
| isActive/status | BOOL/STRING | DEFAULT true | Trạng thái |
| createdAt | TIMESTAMP | NOT NULL | Thời gian tạo |

## categories
| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| id | STRING | PK | Mã danh mục |
| name | STRING | NOT NULL | Tên danh mục |
| description | STRING | NULLABLE | Mô tả |
| icon | STRING | NULLABLE | Icon |
| priority | NUMBER | DEFAULT 0 | Thứ tự |
| createdAt/updatedAt | TIMESTAMP | NULLABLE | Thời gian tạo/cập nhật |

## foods
| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| id | STRING | PK | Mã món |
| restaurantId | STRING | FK restaurants.id | Nhà hàng |
| category | STRING | FK categories.id | Danh mục |
| name | STRING | NOT NULL | Tên món |
| description | STRING | NULLABLE | Mô tả |
| price | NUMBER | NOT NULL | Giá |
| imageUrl | STRING | NULLABLE | Ảnh món (Cloudinary) |
| isAvailable | BOOL | DEFAULT true | Trạng thái bán |
| rating | NUMBER | DEFAULT 0 | Điểm trung bình |
| sold | NUMBER | DEFAULT 0 | Lượt bán |
| createdAt | TIMESTAMP | NULLABLE | Thời gian tạo |

## carts
| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| id | STRING | PK | Mã giỏ |
| userId | STRING | FK users.id | Chủ giỏ |
| items | ARRAY\<CartItem\> | NOT NULL | Danh sách món |
| createdAt | TIMESTAMP | NULLABLE | Thời gian tạo |

**CartItem (embedded)**: `{ foodId, quantity, price, restaurantId?, name?, imageUrl? }`

## favorites
| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| id | STRING | PK | Mã yêu thích |
| userId | STRING | FK users.id | Người dùng |
| foodId | STRING | FK foods.id | Món ăn |
| createdAt | TIMESTAMP | NULLABLE | Thời gian lưu |

## orders
| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| id | STRING | PK | Mã đơn |
| userId | STRING | FK users.id | Khách hàng |
| restaurantId | STRING | FK restaurants.id \| NULL | Nhà hàng |
| shipperId | STRING | FK users.id \| NULL | Shipper |
| items | ARRAY\<OrderItem\> | NOT NULL | Món đã đặt |
| address | STRING | NOT NULL | Địa chỉ giao |
| customerName | STRING | NOT NULL | Tên người nhận |
| customerPhone | STRING | NOT NULL | SĐT nhận |
| status | STRING | DEFAULT 'pending' | pending/confirmed/preparing/shipping/delivered/cancelled/failed |
| paymentMethod | STRING | NOT NULL | COD / ví / thẻ |
| voucherId | STRING | FK vouchers.id \| NULL | Mã voucher |
| voucherCode | STRING | NULLABLE | Mã nhập |
| voucherDiscount | NUMBER | DEFAULT 0 | Giá trị giảm |
| subtotal | NUMBER | NOT NULL | Tiền hàng |
| deliveryFee | NUMBER | NOT NULL | Phí giao |
| totalAmount | NUMBER | NOT NULL | Tổng thanh toán |
| note | STRING | NULLABLE | Ghi chú |
| createdAt | TIMESTAMP | NOT NULL | Thời gian tạo |
| updatedAt | TIMESTAMP | NULLABLE | Cập nhật gần nhất |
| deliveredAt/failedAt/... | TIMESTAMP | NULLABLE | Mốc trạng thái |

**OrderItem (embedded)**: `{ foodId, name, price, quantity, imageUrl?, restaurantId? }`

## notifications
| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| id | STRING | PK | Mã thông báo |
| to | STRING | FK users.id | Người nhận |
| target | STRING | ENUM customer/restaurant/shipper | Nhóm nhận |
| type | STRING | NULLABLE | order/status/system... |
| title | STRING | NOT NULL | Tiêu đề |
| content/body | STRING | NOT NULL | Nội dung |
| orderId | STRING | FK orders.id \| NULL | Liên quan đơn |
| isRead/read | BOOL | DEFAULT false | Đã đọc |
| createdAt | TIMESTAMP | NOT NULL | Thời gian tạo |

## promotions
| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| id | STRING | PK | Mã chiến dịch |
| title/name | STRING | NOT NULL | Tên chương trình |
| code | STRING | NOT NULL, UPPER | Mã áp dụng |
| description | STRING | NULLABLE | Mô tả |
| discountType | STRING | ENUM percentage/amount | Kiểu giảm |
| discountValue | NUMBER | NOT NULL | Giá trị giảm |
| minOrderValue | NUMBER | NULLABLE | Đơn tối thiểu |
| usageLimit | NUMBER | NULLABLE | Giới hạn lượt |
| startDate | TIMESTAMP | NULLABLE | Bắt đầu |
| endDate/expiryDate | TIMESTAMP | NULLABLE | Kết thúc |
| status | STRING | scheduled/active/paused/expired | Trạng thái |
| usedCount | NUMBER | DEFAULT 0 | Số lượt dùng |
| owner | STRING | NULLABLE | Admin/Restaurant tạo |
| createdAt/updatedAt | TIMESTAMP | NULLABLE | Thời gian tạo/cập nhật |

## vouchers (nếu tách riêng)
| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| id | STRING | PK | Mã voucher |
| code | STRING | UNIQUE | Mã áp dụng |
| discount | NUMBER | NOT NULL | Giá trị giảm |
| minOrder | NUMBER | NULLABLE | Đơn tối thiểu |
| maxDiscount | NUMBER | NULLABLE | Giảm tối đa |
| expiryDate | TIMESTAMP | NULLABLE | Hết hạn |
| isActive | BOOL | DEFAULT true | Trạng thái |
| restaurantId | STRING | FK restaurants.id \| NULL | Áp dụng riêng nhà hàng |

## ratings
| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| id | STRING | PK | Mã đánh giá |
| orderId | STRING | FK orders.id | Đơn liên quan |
| userId | STRING | FK users.id | Người đánh giá |
| restaurantId | STRING | FK restaurants.id \| NULL | Nhà hàng |
| shipperId | STRING | FK users.id \| NULL | Shipper |
| foodId | STRING | FK foods.id \| NULL | Món |
| score | NUMBER | NOT NULL | Điểm (1-5) |
| comment | STRING | NULLABLE | Nội dung |
| createdAt | TIMESTAMP | NOT NULL | Thời gian đánh giá |

## supportTickets
| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| id | STRING | PK | Mã ticket |
| creatorId | STRING | FK users.id | Người tạo |
| assignedTo | STRING | FK users.id \| NULL | Người xử lý |
| subject | STRING | NOT NULL | Tiêu đề |
| content | STRING | NOT NULL | Nội dung |
| priority | STRING | ENUM low/medium/high | Độ ưu tiên |
| status | STRING | ENUM open/pending/resolved | Trạng thái |
| createdAt | TIMESTAMP | NOT NULL | Thời gian tạo |
| updatedAt | TIMESTAMP | NULLABLE | Cập nhật |

## withdrawRequests
| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| id | STRING | PK | Mã yêu cầu rút |
| userId | STRING | FK users.id | Shipper yêu cầu |
| amount | NUMBER | NOT NULL | Số tiền rút |
| bankInfo | OBJECT | NOT NULL | { accountNumber, bankName, accountName } |
| status | STRING | ENUM pending/approved/rejected | Trạng thái |
| createdAt | TIMESTAMP | NOT NULL | Thời gian tạo |
| processedAt | TIMESTAMP | NULLABLE | Thời gian xử lý |

