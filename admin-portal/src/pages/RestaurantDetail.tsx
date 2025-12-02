import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FiArrowLeft, FiCheck, FiEdit, FiX } from 'react-icons/fi';
import StatusBadge from '../components/StatusBadge';
import {
  approveRestaurant,
  getRestaurantById,
  rejectRestaurant,
  updateRestaurant,
  verifyRestaurantDocuments,
  verifyRestaurantMenu,
} from '../services/restaurantService';

const RestaurantDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const {
    data: restaurant,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ['restaurant', id],
    queryFn: () => getRestaurantById(id!),
    enabled: !!id,
  });

  const { mutateAsync: handleApprove, isPending: isApproving } = useMutation({
    mutationFn: () => approveRestaurant(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant', id] });
      setError(null);
    },
    onError: () => {
      setError('Không thể duyệt nhà hàng.');
    },
  });

  const { mutateAsync: handleReject, isPending: isRejecting } = useMutation({
    mutationFn: (reason: string) => rejectRestaurant(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant', id] });
      setError(null);
      setShowRejectModal(false);
      setRejectReason('');
    },
    onError: () => {
      setError('Không thể từ chối nhà hàng.');
    },
  });

  const { mutateAsync: handleVerifyDocuments, isPending: isVerifyingDocs } = useMutation({
    mutationFn: (verified: boolean) => verifyRestaurantDocuments(id!, verified),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant', id] });
      setError(null);
    },
    onError: () => {
      setError('Không thể cập nhật trạng thái xác minh.');
    },
  });

  const { mutateAsync: handleVerifyMenu, isPending: isVerifyingMenu } = useMutation({
    mutationFn: (verified: boolean) => verifyRestaurantMenu(id!, verified),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant', id] });
      setError(null);
    },
    onError: () => {
      setError('Không thể cập nhật trạng thái menu.');
    },
  });

  if (isLoading) {
    return (
      <div className="page">
        <div className="panel__empty">Đang tải dữ liệu...</div>
      </div>
    );
  }

  if (queryError || !restaurant) {
    return (
      <div className="page">
        <div className="panel__empty error">Không tìm thấy nhà hàng hoặc có lỗi xảy ra.</div>
        <button className="btn btn--ghost" onClick={() => navigate('/restaurants')}>
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <button className="btn btn--ghost" onClick={() => navigate('/restaurants')} style={{ marginBottom: '12px' }}>
            <FiArrowLeft />
            Quay lại
          </button>
          <h1>Chi tiết nhà hàng</h1>
          <p className="page__subtitle">Thông tin chi tiết và quản lý nhà hàng.</p>
        </div>
        <div className="page__actions">
          {restaurant.registrationStatus === 'pending' && (
            <>
              <button
                className="btn btn--primary"
                onClick={() => handleApprove()}
                disabled={isApproving}
              >
                <FiCheck />
                Duyệt nhà hàng
              </button>
              <button
                className="btn btn--ghost"
                onClick={() => setShowRejectModal(true)}
                disabled={isRejecting}
                style={{ color: 'var(--danger)' }}
              >
                <FiX />
                Từ chối
              </button>
            </>
          )}
        </div>
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
              <span className="detail-label">Tên nhà hàng</span>
              <span className="detail-value">{restaurant.name}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Chủ sở hữu</span>
              <span className="detail-value">{restaurant.ownerName}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Email</span>
              <span className="detail-value">{restaurant.email}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Số điện thoại</span>
              <span className="detail-value">{restaurant.phone}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Địa chỉ</span>
              <span className="detail-value">{restaurant.address || 'Chưa có'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Thành phố</span>
              <span className="detail-value">{restaurant.city || 'Chưa có'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Trạng thái</span>
              <span className="detail-value">
                <StatusBadge status={restaurant.status} />
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Ngày đăng ký</span>
              <span className="detail-value">
                {restaurant.createdAt ? new Date(restaurant.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel__header">
            <div>
              <h3>Giấy tờ pháp lý</h3>
            </div>
          </div>
          <div className="detail-list">
            <div className="detail-item">
              <span className="detail-label">Giấy phép kinh doanh</span>
              <span className="detail-value">{restaurant.businessLicense || 'Chưa cung cấp'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Trạng thái xác minh</span>
              <span className="detail-value">
                <span className={`status-pill ${restaurant.documentsVerified ? 'status-pill--resolved' : 'status-pill--pending'}`}>
                  {restaurant.documentsVerified ? 'Đã xác minh' : 'Chưa xác minh'}
                </span>
              </span>
            </div>
            {restaurant.businessLicenseImage && (
              <div className="detail-item">
                <span className="detail-label">Ảnh giấy phép</span>
                <span className="detail-value">
                  <a href={restaurant.businessLicenseImage} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>
                    Xem ảnh
                  </a>
                </span>
              </div>
            )}
            <div className="detail-item">
              <span className="detail-label">Menu đã kiểm tra</span>
              <span className="detail-value">
                <span className={`status-pill ${restaurant.menuVerified ? 'status-pill--resolved' : 'status-pill--pending'}`}>
                  {restaurant.menuVerified ? 'Đã kiểm tra' : 'Chưa kiểm tra'}
                </span>
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Hợp đồng</span>
              <span className="detail-value">
                <span className={`status-pill status-pill--${restaurant.contractStatus || 'pending'}`}>
                  {restaurant.contractStatus || 'pending'}
                </span>
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Hoa hồng</span>
              <span className="detail-value detail-value--large">
                {restaurant.commissionRate ? `${restaurant.commissionRate}%` : 'Chưa thiết lập'}
              </span>
            </div>
            <div className="form-actions" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <button
                className="btn btn--ghost btn--small"
                onClick={() => handleVerifyDocuments(!restaurant.documentsVerified)}
                disabled={isVerifyingDocs}
              >
                {restaurant.documentsVerified ? 'Hủy xác minh' : 'Xác minh giấy tờ'}
              </button>
              <button
                className="btn btn--ghost btn--small"
                onClick={() => handleVerifyMenu(!restaurant.menuVerified)}
                disabled={isVerifyingMenu}
              >
                {restaurant.menuVerified ? 'Hủy kiểm tra menu' : 'Xác nhận menu'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel__header">
          <div>
            <h3>Thống kê hiệu suất</h3>
          </div>
        </div>
        <div className="grid grid--stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div className="stat-card">
            <p className="stat-card__label">Tổng đơn hàng</p>
            <div className="stat-card__value-row">
              <p className="stat-card__value">{restaurant.totalOrders?.toLocaleString('vi-VN') || '0'}</p>
            </div>
          </div>
          <div className="stat-card">
            <p className="stat-card__label">Tổng doanh thu</p>
            <div className="stat-card__value-row">
              <p className="stat-card__value">₫{(restaurant.totalRevenue || 0).toLocaleString('vi-VN')}</p>
            </div>
          </div>
          <div className="stat-card">
            <p className="stat-card__label">Đánh giá</p>
            <div className="stat-card__value-row">
              <p className="stat-card__value">{restaurant.rating ? `⭐ ${restaurant.rating}/5` : 'Chưa có'}</p>
            </div>
          </div>
        </div>
      </div>

      {restaurant.rejectedReason && (
        <div className="panel" style={{ borderColor: 'var(--danger)' }}>
          <div className="panel__header">
            <div>
              <h3 style={{ color: 'var(--danger)' }}>Lý do từ chối</h3>
            </div>
          </div>
          <p>{restaurant.rejectedReason}</p>
        </div>
      )}

      {error && <div className="panel__empty error">{error}</div>}

      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Từ chối nhà hàng</h3>
            <div className="form-group">
              <label>Lý do từ chối *</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  fontFamily: 'inherit',
                }}
              />
            </div>
            <div className="form-actions">
              <button className="btn btn--ghost" onClick={() => setShowRejectModal(false)}>
                Hủy
              </button>
              <button
                className="btn btn--primary"
                onClick={() => handleReject(rejectReason)}
                disabled={!rejectReason.trim() || isRejecting}
              >
                {isRejecting ? 'Đang xử lý...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantDetail;

