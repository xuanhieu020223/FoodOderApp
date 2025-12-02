import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FiArrowLeft, FiCheck, FiX } from 'react-icons/fi';
import StatusBadge from '../components/StatusBadge';
import {
  approveDriver,
  getDriverById,
  rejectDriver,
  updateDriver,
  verifyDriverLicense,
} from '../services/driverService';

const DriverDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const {
    data: driver,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ['driver', id],
    queryFn: () => getDriverById(id!),
    enabled: !!id,
  });

  const { mutateAsync: handleApprove, isPending: isApproving } = useMutation({
    mutationFn: () => approveDriver(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['driver', id] });
      setError(null);
    },
    onError: () => {
      setError('Không thể duyệt tài xế.');
    },
  });

  const { mutateAsync: handleReject, isPending: isRejecting } = useMutation({
    mutationFn: (reason: string) => rejectDriver(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['driver', id] });
      setError(null);
      setShowRejectModal(false);
      setRejectReason('');
    },
    onError: () => {
      setError('Không thể từ chối tài xế.');
    },
  });

  const { mutateAsync: handleVerifyLicense, isPending: isVerifying } = useMutation({
    mutationFn: (verified: boolean) => verifyDriverLicense(id!, verified),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver', id] });
      setError(null);
    },
    onError: () => {
      setError('Không thể cập nhật trạng thái xác minh.');
    },
  });

  if (isLoading) {
    return (
      <div className="page">
        <div className="panel__empty">Đang tải dữ liệu...</div>
      </div>
    );
  }

  if (queryError || !driver) {
    return (
      <div className="page">
        <div className="panel__empty error">Không tìm thấy tài xế hoặc có lỗi xảy ra.</div>
        <button className="btn btn--ghost" onClick={() => navigate('/drivers')}>
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <button className="btn btn--ghost" onClick={() => navigate('/drivers')} style={{ marginBottom: '12px' }}>
            <FiArrowLeft />
            Quay lại
          </button>
          <h1>Chi tiết tài xế</h1>
          <p className="page__subtitle">Thông tin chi tiết và quản lý tài xế.</p>
        </div>
        <div className="page__actions">
          {driver.registrationStatus === 'pending' && (
            <>
              <button
                className="btn btn--primary"
                onClick={() => handleApprove()}
                disabled={isApproving}
              >
                <FiCheck />
                Duyệt tài xế
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
              <span className="detail-label">Tên tài xế</span>
              <span className="detail-value">{driver.name}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Email</span>
              <span className="detail-value">{driver.email}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Số điện thoại</span>
              <span className="detail-value">{driver.phone}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Trạng thái</span>
              <span className="detail-value">
                <StatusBadge status={driver.status} />
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Trạng thái online</span>
              <span className="detail-value">
                <span className={`status-pill ${driver.onlineStatus === 'online' ? 'status-pill--active' : 'status-pill--low'}`}>
                  {driver.onlineStatus === 'online' ? '🟢 Online' : '⚫ Offline'}
                </span>
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Ngày đăng ký</span>
              <span className="detail-value">
                {driver.createdAt ? new Date(driver.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel__header">
            <div>
              <h3>Giấy phép lái xe</h3>
            </div>
          </div>
          <div className="detail-list">
            <div className="detail-item">
              <span className="detail-label">Số bằng lái</span>
              <span className="detail-value">{driver.licenseNumber || 'Chưa cung cấp'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Trạng thái xác minh</span>
              <span className="detail-value">
                <span className={`status-pill ${driver.licenseVerified ? 'status-pill--resolved' : 'status-pill--pending'}`}>
                  {driver.licenseVerified ? 'Đã xác minh' : 'Chưa xác minh'}
                </span>
              </span>
            </div>
            {driver.licenseImage && (
              <div className="detail-item">
                <span className="detail-label">Ảnh bằng lái</span>
                <span className="detail-value">
                  <a href={driver.licenseImage} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>
                    Xem ảnh
                  </a>
                </span>
              </div>
            )}
            <div className="detail-item">
              <span className="detail-label">Loại xe</span>
              <span className="detail-value">{driver.vehicleType || 'Chưa cung cấp'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Biển số xe</span>
              <span className="detail-value">{driver.vehiclePlate || 'Chưa cung cấp'}</span>
            </div>
            <div className="form-actions" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <button
                className="btn btn--ghost btn--small"
                onClick={() => handleVerifyLicense(!driver.licenseVerified)}
                disabled={isVerifying}
              >
                {driver.licenseVerified ? 'Hủy xác minh' : 'Xác minh bằng lái'}
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
            <p className="stat-card__label">Tổng đơn giao</p>
            <div className="stat-card__value-row">
              <p className="stat-card__value">{driver.totalDeliveries?.toLocaleString('vi-VN') || '0'}</p>
            </div>
          </div>
          <div className="stat-card">
            <p className="stat-card__label">Tổng thu nhập</p>
            <div className="stat-card__value-row">
              <p className="stat-card__value">₫{(driver.totalEarnings || 0).toLocaleString('vi-VN')}</p>
            </div>
          </div>
          <div className="stat-card">
            <p className="stat-card__label">Đánh giá</p>
            <div className="stat-card__value-row">
              <p className="stat-card__value">{driver.rating ? `⭐ ${driver.rating}/5` : 'Chưa có'}</p>
            </div>
          </div>
        </div>
      </div>

      {driver.currentLocation && (
        <div className="panel">
          <div className="panel__header">
            <div>
              <h3>Vị trí hiện tại</h3>
            </div>
          </div>
          <p>
            Lat: {driver.currentLocation.lat}, Lng: {driver.currentLocation.lng}
          </p>
        </div>
      )}

      {driver.rejectedReason && (
        <div className="panel" style={{ borderColor: 'var(--danger)' }}>
          <div className="panel__header">
            <div>
              <h3 style={{ color: 'var(--danger)' }}>Lý do từ chối</h3>
            </div>
          </div>
          <p>{driver.rejectedReason}</p>
        </div>
      )}

      {error && <div className="panel__empty error">{error}</div>}

      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Từ chối tài xế</h3>
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

export default DriverDetail;

