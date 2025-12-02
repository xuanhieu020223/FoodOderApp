import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FiEdit, FiArrowLeft } from 'react-icons/fi';
import StatusBadge from '../components/StatusBadge';
import { getUserById } from '../services/userService';

const UserDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['user', id],
    queryFn: () => getUserById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="page">
        <div className="panel__empty">Đang tải dữ liệu...</div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="page">
        <div className="panel__empty error">Không tìm thấy người dùng hoặc có lỗi xảy ra.</div>
        <button className="btn btn--ghost" onClick={() => navigate('/users')}>
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <button className="btn btn--ghost" onClick={() => navigate('/users')} style={{ marginBottom: '12px' }}>
            <FiArrowLeft />
            Quay lại
          </button>
          <h1>Chi tiết tài khoản</h1>
          <p className="page__subtitle">Thông tin chi tiết về người dùng.</p>
        </div>
        <button className="btn btn--primary" onClick={() => navigate(`/users/${user.id}/edit`)}>
          <FiEdit />
          Chỉnh sửa
        </button>
      </div>

      <div className="grid grid--2">
        <div className="panel">
          <div className="panel__header">
            <div>
              <h3>Thông tin cơ bản</h3>
            </div>
          </div>
          <div className="detail-list">
            <div className="detail-item">
              <span className="detail-label">Mã người dùng</span>
              <span className="detail-value">{user.id}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Tên hiển thị</span>
              <span className="detail-value">{user.name}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Email</span>
              <span className="detail-value">{user.email}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Số điện thoại</span>
              <span className="detail-value">{user.phone || 'Chưa cập nhật'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Vai trò</span>
              <span className="detail-value">
                <span className={`tag tag--${user.role}`}>{user.role}</span>
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Trạng thái</span>
              <span className="detail-value">
                <StatusBadge status={user.status} />
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Thành phố</span>
              <span className="detail-value">{user.city || 'Chưa cập nhật'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Ngày tạo</span>
              <span className="detail-value">{user.createdAt || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel__header">
            <div>
              <h3>Thống kê hoạt động</h3>
            </div>
          </div>
          <div className="detail-list">
            <div className="detail-item">
              <span className="detail-label">Tổng đơn hàng</span>
              <span className="detail-value detail-value--large">{user.orders?.toLocaleString('vi-VN') || '0'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Đánh giá</span>
              <span className="detail-value detail-value--large">{user.rating ? `${user.rating}/5` : 'Chưa có'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetail;

