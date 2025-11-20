import { useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import StatusBadge from '../components/StatusBadge';
import { db } from '../firebase';

interface CategoryDoc {
  id: string;
  name?: string;
  icon?: string;
  priority?: number;
}

interface OrderDoc {
  id: string;
  customerName?: string;
  restaurantName?: string;
  totalAmount?: number;
  status?: string;
  createdAt?: any;
}

const CatalogOrders = () => {
  const [categories, setCategories] = useState<CategoryDoc[]>([]);
  const [orders, setOrders] = useState<OrderDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catSnap, orderSnap] = await Promise.all([
          getDocs(query(collection(db, 'categories'), orderBy('priority', 'asc'))),
          getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(15))),
        ]);
        setCategories(
          catSnap.docs.map((docSnap) => ({
            ...(docSnap.data() as CategoryDoc),
            id: docSnap.id,
          })),
        );
        setOrders(
          orderSnap.docs.map((docSnap) => ({
            ...(docSnap.data() as OrderDoc),
            id: docSnap.id,
          })),
        );
      } catch (err) {
        console.error('Error loading catalog data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

