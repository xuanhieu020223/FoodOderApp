import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import StatusBadge from '../components/StatusBadge';
import { fetchCategories } from '../services/categoryService';
import { fetchLatestOrders, subscribeLatestOrders } from '../services/orderService';

const CatalogOrders = () => {
  const queryClient = useQueryClient();

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useQuery({
    queryKey: ['categories', 'list'],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: orders = [],
    isLoading: ordersLoading,
    error: ordersError,
  } = useQuery({
    queryKey: ['orders', 'latest'],
    queryFn: () => fetchLatestOrders(15),
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    const unsubscribe = subscribeLatestOrders(15, (next) => {
      queryClient.setQueryData(['orders', 'latest'], next);
    });
    return unsubscribe;
  }, [queryClient]);

  const loading = categoriesLoading || ordersLoading;
  const errorMessage = categoriesError || ordersError ? 'Không thể tải dữ liệu danh mục/đơn hàng.' : null;

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>Danh mục & Đơn hàng</h1>
          <p className="page__subtitle">
            Quản lý menu chuẩn hóa toàn hệ thống và can thiệp các đơn gặp sự cố.
          </p>
        </div>
        <div className="page__actions">
          <button className="btn btn--ghost">Đồng bộ POS</button>
          <button className="btn btn--primary">Thêm danh mục</button>
        </div>
      </div>

      <div className="grid grid--2">
        <div className="panel">
          <div className="panel__header">
            <div>
              <h3>Danh mục toàn hệ thống</h3>
              <p>{categories.length} danh mục</p>
            </div>
            <button className="btn btn--ghost">Xuất file</button>
          </div>
          {loading ? (
            <div className="panel__empty">Đang tải dữ liệu...</div>
          ) : errorMessage ? (
            <div className="panel__empty error">{errorMessage}</div>
          ) : (
            <div className="category-grid">
              {categories.map((cat) => (
                <div key={cat.id} className="category-card">
                  <span className="category-card__icon">{cat.icon || '🍽️'}</span>
                  <div>
                    <p className="category-card__title">{cat.name}</p>
                    <p className="category-card__subtitle">Priority #{cat.priority ?? '-'}</p>
                  </div>
                  <span className="category-card__updated">ID: {cat.id}</span>
                </div>
              ))}
              {!categories.length && <p className="panel__empty">Chưa có danh mục nào.</p>}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel__header">
            <div>
              <h3>Đơn hàng gặp vấn đề</h3>
              <p>Ưu tiên SLA có nguy cơ</p>
            </div>
            <button className="btn btn--ghost">Xem bản đồ</button>
          </div>
          {loading ? (
            <div className="panel__empty">Đang tải dữ liệu...</div>
          ) : errorMessage ? (
            <div className="panel__empty error">{errorMessage}</div>
          ) : (
            <div className="table table--compact">
              <div className="table__head">
                <span>Mã ĐH</span>
                <span>Nhà hàng</span>
                <span>Khách hàng</span>
                <span>Tổng</span>
                <span>Trạng thái</span>
                <span>SLA</span>
              </div>
              {orders.map((order) => (
                <div key={order.id} className="table__row">
                  <span className="table__title">{order.id}</span>
                  <span>{order.restaurantName || 'Nhà hàng'}</span>
                  <span>{order.customerName || 'Khách hàng'}</span>
                  <span>{(order.totalAmount ?? 0).toLocaleString('vi-VN')}đ</span>
                  <span>
                    <StatusBadge status={order.status ?? 'pending'} />
                  </span>
                  <span>On track</span>
                </div>
              ))}
              {!orders.length && <div className="panel__empty">Không có đơn hàng nào.</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CatalogOrders;

