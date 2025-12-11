import { GOOGLE_MAPS_API_KEY } from '../config/GoogleMaps';

/**
 * Tính khoảng cách giữa hai địa chỉ sử dụng Google Maps Distance Matrix API
 * @param origin Địa chỉ xuất phát
 * @param destination Địa chỉ đích
 * @returns Khoảng cách tính bằng km, hoặc null nếu có lỗi
 */
export const calculateDistance = async (
  origin: string,
  destination: string
): Promise<number | null> => {
  try {
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY') {
      console.warn('Google Maps API key not configured, using default distance');
      return null;
    }

    const originEncoded = encodeURIComponent(origin);
    const destinationEncoded = encodeURIComponent(destination);
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originEncoded}&destinations=${destinationEncoded}&key=${GOOGLE_MAPS_API_KEY}&language=vi&units=metric`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.rows[0]?.elements[0]?.distance) {
      const distance = data.rows[0].elements[0].distance;
      const distanceKm = distance.value / 1000; // Chuyển từ mét sang km
      return distanceKm;
    }

    // Không log lỗi ra console để tránh hiển thị cho người dùng
    // Chỉ log trong development mode nếu cần debug
    if (__DEV__ && data.error_message) {
      console.warn('Distance API error (silent):', data.status);
    }
    return null;
  } catch (error) {
    // Không log lỗi ra console để tránh hiển thị cho người dùng
    // Chỉ log trong development mode nếu cần debug
    if (__DEV__) {
      console.warn('Distance calculation error (silent)');
    }
    return null;
  }
};

/**
 * Tính khoảng cách giữa hai tọa độ (Haversine formula)
 * @param lat1 Latitude của điểm 1
 * @param lng1 Longitude của điểm 1
 * @param lat2 Latitude của điểm 2
 * @param lng2 Longitude của điểm 2
 * @returns Khoảng cách tính bằng km
 */
export const calculateDistanceFromCoordinates = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Bán kính Trái Đất tính bằng km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
};

const toRad = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Cấu hình phí vận chuyển theo khoảng cách
 */
interface DeliveryFeeConfig {
  baseFee: number; // Phí cơ bản (VND)
  perKmFee: number; // Phí mỗi km (VND)
  freeDeliveryThreshold: number; // Ngưỡng miễn phí vận chuyển (VND)
  maxDistance: number; // Khoảng cách tối đa có thể giao (km)
  distanceTiers?: Array<{
    maxDistance: number; // Khoảng cách tối đa của bậc (km)
    fee: number; // Phí cố định cho bậc này (VND)
  }>;
  timeMultiplier?: {
    rushHour: {
      start: number; // Giờ bắt đầu (0-23)
      end: number; // Giờ kết thúc (0-23)
      multiplier: number; // Hệ số nhân phí
    };
  };
  weatherMultiplier?: {
    enabled: boolean;
    multiplier: number; // Hệ số nhân khi thời tiết xấu
  };
}

const DEFAULT_DELIVERY_FEE_CONFIG: DeliveryFeeConfig = {
  baseFee: 10000, // 10,000 VND phí cơ bản
  perKmFee: 3000, // 3,000 VND mỗi km
  freeDeliveryThreshold: 150000, // Miễn phí nếu đơn >= 150,000 VND
  maxDistance: 20, // Tối đa 20km
  distanceTiers: [
    { maxDistance: 3, fee: 15000 }, // Dưới 3km: 15,000 VND
    { maxDistance: 5, fee: 20000 }, // 3-5km: 20,000 VND
    { maxDistance: 10, fee: 30000 }, // 5-10km: 30,000 VND
    { maxDistance: 15, fee: 40000 }, // 10-15km: 40,000 VND
    { maxDistance: 20, fee: 50000 }, // 15-20km: 50,000 VND
  ],
  timeMultiplier: {
    rushHour: {
      start: 17, // 5 PM
      end: 20, // 8 PM
      multiplier: 1.2, // Tăng 20% vào giờ cao điểm
    },
  },
};

/**
 * Tính phí vận chuyển dựa trên khoảng cách và các yếu tố khác
 * @param distance Khoảng cách tính bằng km (null nếu không tính được)
 * @param orderSubtotal Tổng giá trị đơn hàng (VND)
 * @param config Cấu hình phí vận chuyển (tùy chọn)
 * @returns Phí vận chuyển tính bằng VND
 */
export const calculateDeliveryFee = (
  distance: number | null,
  orderSubtotal: number = 0,
  config: Partial<DeliveryFeeConfig> = {}
): number => {
  const finalConfig = { ...DEFAULT_DELIVERY_FEE_CONFIG, ...config };

  // Kiểm tra miễn phí vận chuyển nếu đơn hàng đủ lớn
  if (orderSubtotal >= finalConfig.freeDeliveryThreshold) {
    return 0;
  }

  // Nếu không có khoảng cách, sử dụng phí mặc định
  if (distance === null || distance === undefined) {
    return finalConfig.baseFee;
  }

  // Kiểm tra khoảng cách tối đa
  if (distance > finalConfig.maxDistance) {
    // Phí cao hơn cho khoảng cách vượt quá
    const excessDistance = distance - finalConfig.maxDistance;
    const baseFee = finalConfig.distanceTiers?.[finalConfig.distanceTiers.length - 1]?.fee || finalConfig.baseFee;
    return baseFee + (excessDistance * finalConfig.perKmFee * 2); // Phí gấp đôi cho km vượt quá
  }

  // Tính phí theo bậc thang khoảng cách
  if (finalConfig.distanceTiers && finalConfig.distanceTiers.length > 0) {
    for (const tier of finalConfig.distanceTiers) {
      if (distance <= tier.maxDistance) {
        let fee = tier.fee;

        // Áp dụng hệ số giờ cao điểm
        if (finalConfig.timeMultiplier) {
          const now = new Date();
          const currentHour = now.getHours();
          const { start, end, multiplier } = finalConfig.timeMultiplier.rushHour;
          
          if (currentHour >= start && currentHour < end) {
            fee = fee * multiplier;
          }
        }

        return Math.round(fee);
      }
    }
  }

  // Nếu không khớp bậc nào, tính theo công thức: baseFee + (distance * perKmFee)
  let fee = finalConfig.baseFee + (distance * finalConfig.perKmFee);

  // Áp dụng hệ số giờ cao điểm
  if (finalConfig.timeMultiplier) {
    const now = new Date();
    const currentHour = now.getHours();
    const { start, end, multiplier } = finalConfig.timeMultiplier.rushHour;
    
    if (currentHour >= start && currentHour < end) {
      fee = fee * multiplier;
    }
  }

  return Math.round(fee);
};

/**
 * Tính phí vận chuyển từ địa chỉ nhà hàng đến địa chỉ giao hàng
 * @param restaurantAddress Địa chỉ nhà hàng
 * @param restaurantLocation Tọa độ nhà hàng (nếu có)
 * @param deliveryAddress Địa chỉ giao hàng
 * @param deliveryLocation Tọa độ địa chỉ giao hàng (nếu có)
 * @param orderSubtotal Tổng giá trị đơn hàng
 * @param config Cấu hình phí vận chuyển
 * @returns Phí vận chuyển tính bằng VND
 */
export const calculateDeliveryFeeFromAddresses = async (
  restaurantAddress: string,
  restaurantLocation: { latitude: number; longitude: number } | null,
  deliveryAddress: string,
  deliveryLocation: { latitude: number; longitude: number } | null,
  orderSubtotal: number = 0,
  config: Partial<DeliveryFeeConfig> = {}
): Promise<number> => {
  let distance: number | null = null;

  // Ưu tiên tính từ tọa độ (nhanh hơn và chính xác hơn)
  if (restaurantLocation && deliveryLocation) {
    distance = calculateDistanceFromCoordinates(
      restaurantLocation.latitude,
      restaurantLocation.longitude,
      deliveryLocation.latitude,
      deliveryLocation.longitude
    );
  } else if (restaurantAddress && deliveryAddress) {
    // Nếu không có tọa độ, tính từ địa chỉ (chậm hơn, cần API call)
    distance = await calculateDistance(restaurantAddress, deliveryAddress);
  }

  return calculateDeliveryFee(distance, orderSubtotal, config);
};

