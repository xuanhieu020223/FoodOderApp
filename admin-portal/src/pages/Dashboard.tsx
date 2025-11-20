import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { db } from '../firebase';

type OrderDoc = {
  id: string;
  status?: string;
  totalAmount?: number;
  createdAt?: any;
  customerName?: string;
  restaurant?: string;
  restaurantName?: string;
};

type PromotionDoc = {
  id: string;
  name?: string;
  owner?: string;
  usage?: number;
  budget?: number;
  start?: string;
  end?: string;
  status?: string;
};

const toDate = (value: any) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  return new Date(value);
};

const Dashboard = () => {
  const [orders, setOrders] = useState<OrderDoc[]>([]);
  const [promotions, setPromotions] = useState<PromotionDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersSnap, promotionsSnap] = await Promise.all([
          getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(500))),
          getDocs(collection(db, 'promotions')),
        ]);

        setOrders(
          ordersSnap.docs.map((docSnap) => ({
            ...(docSnap.data() as OrderDoc),
            id: docSnap.id,
          })),
        );
        setPromotions(
          promotionsSnap.docs.map((docSnap) => ({
            ...(docSnap.data() as PromotionDoc),
            id: docSnap.id,
          })),
        );
      } catch (err) {
        console.error('Error loading dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ordersToday = orders.filter((order) => {
      const created = toDate(order.createdAt);
      return created && created >= today;
    });
    const totalRevenueToday = ordersToday.reduce((sum, order) => sum + (order.totalAmount ?? 0), 0);
    const delivered = orders.filter((order) => order.status === 'delivered').length;
    const pending = orders.filter((order) => order.status !== 'delivered').length;

    return [
      {
        label: 'Doanh thu hôm nay',
        value: totalRevenueToday.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }),
        trend: ordersToday.length,
        subLabel: `${ordersToday.length} đơn đã hoàn tất`,
      },
      {
        label: 'Đơn phát sinh',
        value: orders.length.toString(),
        trend: pending,
        subLabel: `${pending} đơn đang xử lý`,
      },
      {
        label: 'Đơn đã giao',
        value: delivered.toString(),
        trend: delivered ? Math.round((delivered / Math.max(orders.length, 1)) * 100) : 0,
        subLabel: 'Tỉ lệ hoàn thành',
      },
      {
        label: 'Chiến dịch đang chạy',
        value: promotions.filter((promo) => (promo.status ?? '').toLowerCase() === 'active').length.toString(),
        trend: promotions.length,
        subLabel: `${promotions.length} campaign đã tạo`,
      },
    ];
  }, [orders, promotions]);

  const orderVolumeSeries = useMemo(() => {
    const days = Array.from({ length: 7 }).map((_, idx) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - idx));
      date.setHours(0, 0, 0, 0);
      return date;
    });

    return days.map((day) => {
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);

      const dayOrders = orders.filter((order) => {
        const created = toDate(order.createdAt);
        return created && created >= day && created <= dayEnd;
      });

      const revenue = dayOrders.reduce((sum, order) => sum + (order.totalAmount ?? 0), 0);

      return {
        day: day.toLocaleDateString('vi-VN', { weekday: 'short' }),
        orders: dayOrders.length,
        revenue,
      };
    });
  }, [orders]);

  const liveOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => {
        const aDate = toDate(a.createdAt)?.getTime() ?? 0;
        const bDate = toDate(b.createdAt)?.getTime() ?? 0;
        return bDate - aDate;
      })
      .slice(0, 4);
  }, [orders]);

  const activePromotions = useMemo(() => {
    return promotions.filter((promo) => (promo.status ?? '').toLowerCase() !== 'ended');
  }, [promotions]);

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>Tổng quan vận hành</h1>
          <p className="page__subtitle">
            Giám sát real-time hiệu suất của nền tảng FoodOrder trên toàn quốc.
          </p>
        </div>
        <div className="page__actions">
          <button className="btn btn--ghost">Tải báo cáo</button>
          <button className="btn btn--primary">Tạo chiến dịch</button>
        </div>
      </div>

      <div className="grid grid--stats">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid grid--2">
        <div className="panel panel--chart">
          <div className="panel__header">
            <div>
              <h3>Đơn hàng & doanh thu 7 ngày</h3>
              <p>Theo dõi xu hướng tăng trưởng</p>
            </div>
            <select>
              <option>Toàn quốc</option>
            </select>
          </div>
          {loading ? (
            <div className="panel__empty">Đang tải dữ liệu...</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={orderVolumeSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="orders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ee4d2d" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ee4d2d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" />
                <YAxis yAxisId="left" orientation="left" />
                <YAxis yAxisId="right" orientation="right" hide />
                <Tooltip />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="orders"
                  stroke="#ee4d2d"
                  fillOpacity={1}
                  fill="url(#orders)"
                  name="Đơn hàng"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="panel">
          <div className="panel__header">
            <div>
              <h3>Đơn hàng cần can thiệp</h3>
              <p>Tự động phát hiện SLA rủi ro</p>
            </div>
            <button className="btn btn--ghost">Xem tất cả</button>
          </div>
          <div className="list">
            {liveOrders.map((order) => (
              <div key={order.id} className="list__item">
                <div>
                  <p className="list__title">{order.id}</p>
                  <p className="list__subtitle">
                    {order.restaurantName || order.restaurant || 'Nhà hàng'} • {order.customerName || 'Khách hàng'}
                  </p>
                </div>
                <div className="list__meta">
                  <p>{(order.totalAmount ?? 0).toLocaleString('vi-VN')}đ</p>
                  <StatusBadge status={order.status ?? 'pending'} />
                </div>
              </div>
            ))}
            {!liveOrders.length && <p className="panel__empty">Chưa có đơn hàng nào.</p>}
          </div>
        </div>
      </div>

      <div className="grid grid--2">
        <div className="panel">
          <div className="panel__header">
            <div>
              <h3>Chiến dịch đang chạy</h3>
              <p>Điều phối khuyến mãi đa kênh</p>
            </div>
            <button className="btn btn--ghost">Quản lý</button>
          </div>
          <div className="promo-grid">
            {activePromotions.map((promo) => (
              <div key={promo.id} className="promo-card">
                <div className={`promo-card__status promo-card__status--${(promo.status ?? '').toLowerCase()}`}>
                  {promo.status || 'scheduled'}
                </div>
                <h4>{promo.name}</h4>
                <p>{promo.owner || 'Marketing team'}</p>
                <div className="promo-card__meta">
                  <span>Lượt dùng: {(promo.usage ?? 0).toLocaleString('vi-VN')}</span>
                  <span>Ngân sách: ₫{(promo.budget ?? 0).toLocaleString('vi-VN')}</span>
                </div>
                <p className="promo-card__time">
                  {promo.start || 'N/A'} → {promo.end || 'N/A'}
                </p>
              </div>
            ))}
            {!activePromotions.length && <p className="panel__empty">Chưa có chiến dịch nào.</p>}
          </div>
        </div>

        <div className="panel">
          <div className="panel__header">
            <div>
              <h3>Checklist vận hành</h3>
              <p>Cập nhật realtime từ đội ngũ</p>
            </div>
          </div>
          <ul className="checklist">
            <li>
              <input type="checkbox" checked readOnly />
              <div>
                <p>Đồng bộ menu Global Merchant</p>
                <span>Hoàn tất lúc 09:15</span>
              </div>
            </li>
            <li>
              <input type="checkbox" />
              <div>
                <p>Khảo sát tài xế với rating &lt; 4.3</p>
                <span>Deadline 15:00</span>
              </div>
            </li>
            <li>
              <input type="checkbox" />
              <div>
                <p>Chuẩn bị chiến dịch 12.12</p>
                <span>Marketing • 45%</span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
