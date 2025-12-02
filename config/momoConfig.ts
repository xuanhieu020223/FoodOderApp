/**
 * MoMo Payment Configuration
 * 
 * CÁCH LẤY KEY TỪ MOMO:
 * 1. Đăng ký tài khoản tại: https://developers.momo.vn/
 * 2. Đăng nhập vào MoMo Partner Portal
 * 3. Vào mục "Thông tin đối tác" hoặc "API Integration"
 * 4. Copy các thông tin sau:
 *    - Partner Code: Mã đối tác (ví dụ: "MOMO")
 *    - Access Key: Khóa truy cập API
 *    - Secret Key: Khóa bí mật (QUAN TRỌNG - không chia sẻ)
 * 
 * LƯU Ý BẢO MẬT:
 * - Secret Key KHÔNG BAO GIỜ được commit lên Git
 * - Nên sử dụng biến môi trường (.env) hoặc file config riêng
 * - Trong production, nên gọi API từ backend server để bảo mật secretKey
 */

// Cấu hình MoMo - TEST/SANDBOX
// Thay thế bằng thông tin thực từ MoMo Partner Portal của bạn
export const MOMO_CONFIG = {
  // Partner Code từ MoMo Partner Portal
  partnerCode: process.env.EXPO_PUBLIC_MOMO_PARTNER_CODE || 'MOMO',
  
  // Access Key từ MoMo Partner Portal
  accessKey: process.env.EXPO_PUBLIC_MOMO_ACCESS_KEY || 'F8BBA842ECF85',
  
  // Secret Key từ MoMo Partner Portal (QUAN TRỌNG - không chia sẻ)
  secretKey: process.env.EXPO_PUBLIC_MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz',
  
  // Endpoint API MoMo
  // Test/Sandbox: https://test-payment.momo.vn/v2/gateway/api/create
  // Production: https://payment.momo.vn/v2/gateway/api/create
  endpoint: process.env.EXPO_PUBLIC_MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create',
  
  // URL callback sau khi thanh toán thành công
  returnUrl: process.env.EXPO_PUBLIC_MOMO_RETURN_URL || 'foodorderapp://payment/momo/return',
  
  // URL nhận thông báo từ MoMo (IPN - Instant Payment Notification)
  notifyUrl: process.env.EXPO_PUBLIC_MOMO_NOTIFY_URL || 'https://callback.url/notify',
  
  // Request Type
  requestType: 'captureWallet', // captureWallet hoặc payWithATM
};

// Cấu hình môi trường
export const MOMO_ENV = {
  // 'sandbox' cho test, 'production' cho thực tế
  environment: process.env.EXPO_PUBLIC_MOMO_ENV || 'sandbox',
  
  // Sandbox endpoint
  sandboxEndpoint: 'https://test-payment.momo.vn/v2/gateway/api/create',
  
  // Production endpoint
  productionEndpoint: 'https://payment.momo.vn/v2/gateway/api/create',
};

