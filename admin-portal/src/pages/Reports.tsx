import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { OrderDoc } from '../services/orderService';
import { fetchAllOrders } from '../services/orderService';

const pieColors = ['#ee4d2d', '#ff9f68', '#ffd4c4', '#94a3b8'];

const detectCity = (address?: string) => {
  if (!address) return 'Khác';
  const normalized = address.toLowerCase();
  if (normalized.includes('hồ chí minh') || normalized.includes('tp.hcm')) return 'TP.HCM';
  if (normalized.includes('hà nội')) return 'Hà Nội';
  if (normalized.includes('đà nẵng')) return 'Đà Nẵng';
  return 'Khác';
};

const Reports = () => {
  const {
    data: orders = [],
    isLoading,
    error,
  } = useQuery<OrderDoc[]>({
    queryKey: ['orders', 'all'],
    queryFn: fetchAllOrders,
    staleTime: 1000 * 60,
  });

  const revenueByCity = useMemo(() => {
    const cityMap = new Map<string, { revenue: number; orders: number }>();
    orders.forEach((order) => {
      const city = detectCity(order.address);
      const entry = cityMap.get(city) ?? { revenue: 0, orders: 0 };
      entry.revenue += order.totalAmount ?? 0;
      entry.orders += 1;
      cityMap.set(city, entry);
    });
    return Array.from(cityMap.entries()).map(([name, value]) => ({
      name,
      revenue: Number((value.revenue / 1_000_000).toFixed(2)),
      orders: value.orders,
    }));
  }, [orders]);

  const statusDistribution = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((order) => {
      const status = (order.status ?? 'pending').toLowerCase();
      map.set(status, (map.get(status) ?? 0) + 1);
    });
    const total = orders.length || 1;
    return Array.from(map.entries()).map(([label, count]) => ({
      label,
      value: Number(((count / total) * 100).toFixed(1)),
    }));
  }, [orders]);

  const insights = useMemo(() => {
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount ?? 0), 0);
    return [
      {
        label: 'GMV 7 ngày',
        value: totalRevenue.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }),
        description: 'Tổng doanh thu ghi nhận trên hệ thống',
      },
      {
        label: 'Tỉ lệ hoàn tất',
        value: `${statusDistribution.find((s) => s.label === 'delivered')?.value ?? 0}%`,
        description: 'Đơn hàng đã giao thành công',
      },
      {
        label: 'Đơn chờ xử lý',
        value: `${statusDistribution.find((s) => s.label === 'pending')?.value ?? 0}%`,
        description: 'Cần ưu tiên tài xế & nhà hàng',
      },
    ];
  }, [orders, statusDistribution]);

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>Báo cáo & phân tích</h1>
          <p className="page__subtitle">Theo dõi doanh thu, hiệu suất giao hàng và chỉ số SLA.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--ghost">Lịch gửi email</button>
          <button className="btn btn--primary">Xuất PDF</button>
        </div>
      </div>

      <div className="grid grid--2">
        <div className="panel panel--chart">
          <div className="panel__header">
            <div>
              <h3>Doanh thu theo khu vực</h3>
              <p>Tổng hợp theo địa chỉ giao hàng</p>
            </div>
            <select>
              <option>Tất cả thời gian</option>
            </select>
          </div>
          {isLoading ? (
            <div className="panel__empty">Đang tải dữ liệu...</div>
          ) : error ? (
            <div className="panel__empty error">Không thể tải dữ liệu báo cáo.</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByCity} barSize={32}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => [`${value} triệu`, 'Doanh thu']} />
                <Bar dataKey="revenue" fill="#ee4d2d" name="Doanh thu (triệu)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="panel panel--chart">
          <div className="panel__header">
            <div>
              <h3>Phân bổ trạng thái đơn</h3>
              <p>Tỉ lệ phần trăm theo trạng thái</p>
            </div>
            <span className="status-pill status-pill--active">
              Tổng đơn: {orders.length.toLocaleString('vi-VN')}
            </span>
          </div>
          {isLoading ? (
            <div className="panel__empty">Đang tải dữ liệu...</div>
          ) : error ? (
            <div className="panel__empty error">Không thể tải dữ liệu báo cáo.</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={statusDistribution} dataKey="value" nameKey="label" innerRadius={70} outerRadius={110} paddingAngle={4}>
                    {statusDistribution.map((entry, index) => (
                      <Cell key={entry.label} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value}%`, 'Tỉ lệ']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="legend">
                {statusDistribution.map((item, index) => (
                  <div key={item.label} className="legend__item">
                    <span className="legend__dot" style={{ backgroundColor: pieColors[index % pieColors.length] }} />
                    <span>
                      {item.label} • {item.value}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel__header">
          <div>
            <h3>Insight nổi bật</h3>
            <p>Tự động phát hiện bất thường</p>
          </div>
        </div>
        <div className="insight-grid">
          {insights.map((insight) => (
            <div key={insight.label} className="insight-card">
              <p className="insight-card__label">{insight.label}</p>
              <h4>{insight.value}</h4>
              <p>{insight.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Reports;

