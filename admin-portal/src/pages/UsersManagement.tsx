import { useEffect, useMemo, useState } from 'react';
import { FiFilter, FiLock, FiRefreshCw, FiUnlock } from 'react-icons/fi';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import StatusBadge from '../components/StatusBadge';
import type { UserAccount, UserRole } from '../types';
import { db } from '../firebase';

const roleFilters: { label: string; value: 'all' | UserRole }[] = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Khách hàng', value: 'customer' },
  { label: 'Nhà hàng', value: 'restaurant' },
  { label: 'Tài xế', value: 'driver' },
];

type OrderDoc = { id: string; userId?: string; totalAmount?: number; status?: string };

const UsersManagement = () => {
  const [records, setRecords] = useState<UserAccount[]>([]);
  const [filter, setFilter] = useState<'all' | UserRole>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersSnap, ordersSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'orders')),
      ]);
      const orders: OrderDoc[] = ordersSnap.docs.map((docSnap) => ({
        ...(docSnap.data() as OrderDoc),
        id: docSnap.id,
      }));

      const mappedUsers: UserAccount[] = usersSnap.docs.map((docSnap) => {
        const data = docSnap.data() as any;
        const userOrders = orders.filter((order) => order.userId === docSnap.id);
        const rawRole = (data.role ?? 'customer').toLowerCase();
        const normalizedRole: UserRole =
          rawRole === 'user'
            ? 'customer'
            : rawRole === 'shipper'
            ? 'driver'
            : (['customer', 'restaurant', 'driver', 'admin'] as const).includes(rawRole as UserRole)
            ? (rawRole as UserRole)
            : 'customer';
        const rawStatus = (data.status ?? 'active').toLowerCase();
        const allowedStatuses: UserAccount['status'][] = ['active', 'locked', 'pending', 'blocked'];
        const normalizedStatus: UserAccount['status'] =
          rawStatus === 'blocked'
            ? 'locked'
            : allowedStatuses.includes(rawStatus as UserAccount['status'])
            ? (rawStatus as UserAccount['status'])
            : 'active';
        return {
          id: docSnap.id,
          name: data.name || data.username || 'Chưa cập nhật',
          role: normalizedRole,
          email: data.email || '',
          phone: data.phone || '',
          status: normalizedStatus,
          createdAt: data.createdAt?.toDate?.().toLocaleDateString('vi-VN') ?? '',
          orders: userOrders.length,
          rating: data.rating,
          city: data.city,
        };
      });
      setRecords(mappedUsers);
    } catch (err) {
      console.error('Error fetching users', err);
      setError('Không thể tải danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredUsers = useMemo(() => {
    if (filter === 'all') return records;
    return records.filter((user) => user.role === filter);
  }, [records, filter]);

  const toggleLock = async (id: string, currentStatus: UserAccount['status']) => {
    const nextStatus = currentStatus === 'locked' ? 'active' : 'locked';
    try {
      await updateDoc(doc(db, 'users', id), { status: nextStatus });
      setRecords((prev) => prev.map((record) => (record.id === id ? { ...record, status: nextStatus } : record)));
    } catch (err) {
      console.error('Error updating status', err);
      setError('Không thể cập nhật trạng thái tài khoản.');
    }
  };

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>Quản lý người dùng</h1>
          <p className="page__subtitle">
            Kiểm soát khách hàng, nhà hàng và tài xế trên toàn hệ sinh thái.
          </p>
        </div>
        <div className="page__actions">
          <button className="btn btn--ghost" onClick={fetchData} disabled={loading}>
            <FiRefreshCw />
            Làm mới
          </button>
          <button className="btn btn--ghost">
            <FiFilter />
            Bộ lọc nâng cao
          </button>
          <button className="btn btn--primary">Thêm tài khoản</button>
        </div>
      </div>

      <div className="tabs">
        {roleFilters.map((option) => (
          <button
            key={option.value}
            className={`tabs__item ${filter === option.value ? 'tabs__item--active' : ''}`}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="panel panel--table">
        <div className="panel__header">
          <div>
            <h3>Danh sách tài khoản</h3>
            <p>{filteredUsers.length} bản ghi</p>
          </div>
          <div className="panel__filters">
            <select>
              <option>Tất cả thành phố</option>
              <option>Hà Nội</option>
              <option>TP.HCM</option>
            </select>
            <select>
              <option>Trạng thái</option>
              <option>Active</option>
              <option>Locked</option>
              <option>Pending</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="panel__empty">Đang tải dữ liệu...</div>
        ) : error ? (
          <div className="panel__empty error">{error}</div>
        ) : (
          <div className="table">
            <div className="table__head">
              <span>Mã</span>
              <span>Tên hiển thị</span>
              <span>Vai trò</span>
              <span>Hoạt động</span>
              <span>Trạng thái</span>
              <span>Hành động</span>
            </div>
            {filteredUsers.map((user) => (
              <div key={user.id} className="table__row">
                <span>{user.id}</span>
                <span>
                  <p className="table__title">{user.name}</p>
                  <p className="table__subtitle">{user.email}</p>
                </span>
                <span className={`tag tag--${user.role}`}>{user.role}</span>
                <span>
                  <p>{user.orders?.toLocaleString('vi-VN') || '-'}</p>
                  <p className="table__subtitle">Đơn</p>
                </span>
                <span>
                  <StatusBadge status={user.status} />
                </span>
                <span>
                  <button className="btn btn--ghost" onClick={() => toggleLock(user.id, user.status)}>
                    {user.status === 'locked' ? (
                      <>
                        <FiUnlock /> Mở khóa
                      </>
                    ) : (
                      <>
                        <FiLock /> Khóa
                      </>
                    )}
                  </button>
                </span>
              </div>
            ))}
            {!filteredUsers.length && <div className="panel__empty">Không có tài khoản phù hợp.</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersManagement;

