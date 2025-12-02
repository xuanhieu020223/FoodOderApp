/**
 * MoMo Payment Service
 * Tích hợp thanh toán qua MoMo bằng cách quét mã QR
 * 
 * HƯỚNG DẪN LẤY KEY:
 * 1. Đăng ký tại: https://developers.momo.vn/
 * 2. Vào MoMo Partner Portal
 * 3. Lấy Partner Code, Access Key, Secret Key
 * 4. Cập nhật vào file config/momoConfig.ts hoặc biến môi trường
 */

import { Timestamp } from 'firebase/firestore';
import { MOMO_CONFIG } from '../config/momoConfig';

export interface MomoPaymentRequest {
  orderId: string;
  amount: number;
  orderInfo: string;
  extraData?: string;
}

export interface MomoPaymentResponse {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  orderInfo: string;
  orderType: string;
  transId: number;
  resultCode: number;
  message: string;
  payType: string;
  responseTime: number;
  extraData?: string;
  signature: string;
}

/**
 * Tạo signature cho MoMo Payment
 * 
 * LƯU Ý: Hàm này tạo signature đơn giản cho test.
 * Trong production, nên gọi API từ backend để tạo signature an toàn.
 */
const createSignature = (
  partnerCode: string,
  accessKey: string,
  requestId: string,
  amount: number,
  orderId: string,
  orderInfo: string,
  returnUrl: string,
  notifyUrl: string,
  extraData: string,
  requestType: string
): string => {
  // Tạo raw signature string theo format MoMo
  const rawSignature = `partnerCode=${partnerCode}&accessKey=${accessKey}&requestId=${requestId}&amount=${amount}&orderId=${orderId}&orderInfo=${orderInfo}&returnUrl=${returnUrl}&notifyUrl=${notifyUrl}&extraData=${extraData}&requestType=${requestType}`;
  
  // Trong production, cần tạo HMAC SHA256 signature
  // Sử dụng thư viện crypto hoặc gọi API backend
  // const crypto = require('crypto');
  // const signature = crypto.createHmac('sha256', MOMO_CONFIG.secretKey)
  //   .update(rawSignature)
  //   .digest('hex');
  
  // Tạm thời return rawSignature + secretKey (chỉ cho test)
  // Trong production PHẢI dùng HMAC SHA256
  console.warn('⚠️ Using simple signature for test. In production, use HMAC SHA256!');
  return rawSignature + MOMO_CONFIG.secretKey;
};

/**
 * Tạo payment request với MoMo
 * 
 * LƯU Ý: Trong production, nên gọi API từ backend server để:
 * - Bảo mật secretKey (không expose ra frontend)
 * - Tạo signature an toàn
 * - Xử lý callback từ MoMo
 */
export const createMomoPayment = async (
  request: MomoPaymentRequest
): Promise<{ qrCodeUrl: string; paymentUrl: string }> => {
  try {
    // Tạo requestId và orderId theo format MoMo
    const requestId = `${MOMO_CONFIG.partnerCode}${Date.now()}`;
    const orderId = request.orderId || requestId;
    const amount = request.amount;
    const orderInfo = request.orderInfo || 'pay with MoMo';
    const extraData = request.extraData || '';
    
    // Tạo signature
    const signature = createSignature(
      MOMO_CONFIG.partnerCode,
      MOMO_CONFIG.accessKey,
      requestId,
      amount,
      orderId,
      orderInfo,
      MOMO_CONFIG.returnUrl,
      MOMO_CONFIG.notifyUrl,
      extraData,
      MOMO_CONFIG.requestType
    );
    
    // Tạo request body cho MoMo API
    const requestBody = {
      partnerCode: MOMO_CONFIG.partnerCode,
      accessKey: MOMO_CONFIG.accessKey,
      requestId: requestId,
      amount: amount,
      orderId: orderId,
      orderInfo: orderInfo,
      redirectUrl: MOMO_CONFIG.returnUrl,
      ipnUrl: MOMO_CONFIG.notifyUrl,
      extraData: extraData,
      requestType: MOMO_CONFIG.requestType,
      signature: signature,
    };
    
    // Gọi API MoMo để tạo payment URL
    const response = await fetch(MOMO_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('MoMo API Error:', errorText);
      throw new Error(`MoMo API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.resultCode !== 0) {
      throw new Error(data.message || 'Không thể tạo yêu cầu thanh toán');
    }
    
    // Lấy payment URL từ response
    const paymentUrl = data.payUrl;
    
    // Tạo QR code từ payment URL
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(paymentUrl)}`;
    
    return {
      qrCodeUrl,
      paymentUrl,
    };
  } catch (error) {
    console.error('Error creating MoMo payment:', error);
    throw new Error('Không thể tạo yêu cầu thanh toán MoMo');
  }
};

/**
 * Xác thực callback từ MoMo
 */
export const verifyMomoCallback = (response: MomoPaymentResponse): boolean => {
  try {
    // Trong production, cần verify signature từ MoMo
    // const rawSignature = `partnerCode=${response.partnerCode}&accessKey=${MOMO_CONFIG.accessKey}&requestId=${response.requestId}&amount=${response.amount}&orderId=${response.orderId}&orderInfo=${response.orderInfo}&orderType=${response.orderType}&transId=${response.transId}&message=${response.message}&localMessage=${response.localMessage || ''}&responseTime=${response.responseTime}&extraData=${response.extraData || ''}`;
    // const signature = crypto.createHmac('sha256', MOMO_CONFIG.secretKey).update(rawSignature).digest('hex');
    // return signature === response.signature;
    
    // Tạm thời chỉ kiểm tra resultCode
    return response.resultCode === 0;
  } catch (error) {
    console.error('Error verifying MoMo callback:', error);
    return false;
  }
};

/**
 * Kiểm tra trạng thái thanh toán
 */
export const checkPaymentStatus = async (orderId: string): Promise<'pending' | 'success' | 'failed'> => {
  try {
    // Trong production, cần gọi API từ backend để kiểm tra trạng thái
    // Tạm thời return pending
    return 'pending';
  } catch (error) {
    console.error('Error checking payment status:', error);
    return 'failed';
  }
};

/**
 * Tạo QR code data cho MoMo
 * Format: momo://transfer?phone=0987654321&amount=100000&note=ORDER_123
 */
export const generateMomoQRData = (phone: string, amount: number, orderId: string): string => {
  const note = `Thanh toan don hang ${orderId}`;
  return `momo://transfer?phone=${phone}&amount=${amount}&note=${encodeURIComponent(note)}`;
};

