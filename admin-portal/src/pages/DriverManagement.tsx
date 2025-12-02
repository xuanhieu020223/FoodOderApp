import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FiCheck, FiEye, FiFilter, FiRefreshCw, FiSearch, FiX } from 'react-icons/fi';
import StatusBadge from '../components/StatusBadge';
import type { Driver } from '../types';
import { approveDriver, fetchDrivers, rejectDriver, updateDriverStatus } from '../services/driverService';

const statusFilters: { label: string; value: 'all' | Driver['status'] }[] = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Chờ duyệt', value: 'pending' },
  { label: 'Đã duyệt', value: 'approved' },
  { label: 'Đang hoạt động', value: 'active' },
  { label: 'Bị từ chối', value: 'rejected' },
  { label: 'Tạm khóa', value: 'suspended' },
];

const DriverManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | Driver['status']>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const {
    data: drivers = [],
    isLoading,
    isFetching,
    refetch,
    error: queryError,
  } = useQuery({
    queryKey: ['drivers', 'list'],
    queryFn: fetchDrivers,
    staleTime: 1000 * 60,
  });

  const { mutateAsync: handleApprove, isPending: isApproving } = useMutation({
    mutationFn: approveDriver,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers', 'list'] });
      setError(null);
      setApprovingId(null);
    },
    onError: () => {
      setError('Không thể duyệt tài xế.');
      setApprovingId(null);
    },
  });

  const { mutateAsync: handleReject, isPending: isRejecting } = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectDriver(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers', 'list'] });
      setError(null);
      setRejectingId(null);
      setRejectReason('');
    },
    onError: () => {
      setError('Không thể từ chối tài xế.');
      setRejectingId(null);
    },
  });

  const { mutateAsync: handleUpdateStatus, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Driver['status'] }) => updateDriverStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers', 'list'] });
      setError(null);
    },
    onError: () => {
      setError('Không thể cập nhật trạng thái.');
    },
  });

  const filteredDrivers = useMemo(() => {
    let result = drivers;

    if (filter !== 'all') {
      result = result.filter((d) => d.status === filter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.name?.toLowerCase().includes(query) ||
          d.email?.toLowerCase().includes(query) ||
          d.phone?.includes(query) ||
          d.licenseNumber?.includes(query),
      );
    }

    return result;
  }, [drivers, filter, searchQuery]);

  const pendingDrivers = drivers.filter((d) => d.registrationStatus === 'pending');
  const onlineDrivers = drivers.filter((d) => d.onlineStatus === 'online');

  const handleApproveClick = async (id: string) => {
    setApprovingId(id);
    await handleApprove(id);
  };

  const handleRejectClick = (id: string) => {
    setRejectingId(id);
  };

  const confirmReject = async () => {
    if (rejectingId && rejectReason.trim()) {
      await handleReject({ id: rejectingId, reason: rejectReason });
    }
  };

  const displayError = error ?? (queryError ? 'Không thể tải danh sách tài xế.' : null);

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>Quản lý tài xế</h1>
          <p className="page__subtitle">
            Duyệt yêu cầu đăng ký, xác minh giấy phép lái xe và quản lý hoạt động.
          </p>
        </div>
        <div className="page__actions">
          <button className="btn btn--ghost" onClick={() => refetch()} disabled={isFetching}>
            <FiRefreshCw />
            Làm mới
          </button>
          <button
            className={`btn btn--ghost ${showAdvancedFilters ? 'btn--active' : ''}`}
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            <FiFilter />
            Bộ lọc
          </button>
        </div>
      </div>

      <div className="grid grid--stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '24px' }}>
        <div className="stat-card">
          <p className="stat-card__label">Tổng tài xế</p>
          <div className="stat-card__value-row">
            <p className="stat-card__value">{drivers.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <p className="stat-card__label">Đang online</p>
          <div className="stat-card__value-row">
            <p className="stat-card__value">{onlineDrivers.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <p className="stat-card__label">Chờ duyệt</p>
          <div className="stat-card__value-row">
            <p className="stat-card__value">{pendingDrivers.length}</p>
          </div>
        </div>
      </div>

      {pendingDrivers.length > 0 && (
        <div className="panel" style={{ marginBottom: '24px', borderColor: 'var(--warning)' }}>
          <div className="panel__header">
            <div>
              <h3 style={{ color: 'var(--warning)' }}>⚠️ {pendingDrivers.length} tài xế chờ duyệt</h3>
              <p>Cần xem xét và phê duyệt</p>
            </div>
          </div>
        </div>
      )}

      {showAdvancedFilters && (
        <div className="panel panel--filters">
          <div className="filters-grid">
            <div className="form-group">
              <label>Tìm kiếm</label>
              <div className="search-input">
                <FiSearch />
                <input
                  type="text"
                  placeholder="Tìm theo tên, email, số điện thoại, số bằng lái..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="tabs">
        {statusFilters.map((option) => (
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
            <h3>Danh sách tài xế</h3>
            <p>{filteredDrivers.length} bản ghi</p>
          </div>
        </div>

        {isLoading ? (
          <div className="panel__empty">Đang tải dữ liệu...</div>
        ) : displayError ? (
          <div className="panel__empty error">{displayError}</div>
        ) : (
          <div className="table-wrapper">
            <div className="table">
              <div className="table__head">
                <span>Tên tài xế</span>
                <span>Liên hệ</span>
                <span>Giấy phép</span>
                <span>Trạng thái</span>
                <span>Hiệu suất</span>
                <span>Hành động</span>
              </div>
              {filteredDrivers.map((driver) => (
                <div key={driver.id} className="table__row">
                  <span className="table__cell">
                    <p className="table__title">{driver.name}</p>
                    <p className="table__subtitle">
                      <span className={`status-pill ${driver.onlineStatus === 'online' ? 'status-pill--active' : 'status-pill--low'}`}>
                        {driver.onlineStatus === 'online' ? '🟢 Online' : '⚫ Offline'}
                      </span>
                    </p>
                  </span>
                  <span className="table__cell">
                    <p>{driver.email}</p>
                    <p className="table__subtitle">{driver.phone}</p>
                  </span>
                  <span className="table__cell">
                    <p>{driver.licenseNumber || 'Chưa có'}</p>
                    <p className="table__subtitle">
                      <span className={`status-pill ${driver.licenseVerified ? 'status-pill--resolved' : 'status-pill--pending'}`}>
                        {driver.licenseVerified ? 'Đã xác minh' : 'Chưa xác minh'}
                      </span>
                    </p>
                    {driver.vehicleType && (
                      <p className="table__subtitle">{driver.vehicleType} - {driver.vehiclePlate}</p>
                    )}
                  </span>
                  <span className="table__cell">
                    <StatusBadge status={driver.status} />
                    {driver.registrationStatus === 'pending' && (
                      <span className="status-pill status-pill--pending" style={{ marginTop: '4px', display: 'block' }}>
                        Chờ duyệt
                      </span>
                    )}
                  </span>
                  <span className="table__cell">
                    <p>{driver.totalDeliveries || 0} đơn</p>
                    <p className="table__subtitle">₫{(driver.totalEarnings || 0).toLocaleString('vi-VN')}</p>
                    {driver.rating && <p className="table__subtitle">⭐ {driver.rating}/5</p>}
                  </span>
                  <span className="table__cell table__actions">
                    <button
                      className="btn btn--icon"
                      onClick={() => navigate(`/drivers/${driver.id}`)}
                      title="Xem chi tiết"
                    >
                      <FiEye />
                    </button>
                    {driver.registrationStatus === 'pending' && (
                      <>
                        <button
                          className="btn btn--icon"
                          onClick={() => handleApproveClick(driver.id)}
                          disabled={isApproving || approvingId === driver.id}
                          title="Duyệt"
                          style={{ color: 'var(--success)' }}
                        >
                          <FiCheck />
                        </button>
                        <button
                          className="btn btn--icon"
                          onClick={() => handleRejectClick(driver.id)}
                          disabled={isRejecting}
                          title="Từ chối"
                          style={{ color: 'var(--danger)' }}
                        >
                          <FiX />
                        </button>
                      </>
                    )}
                    {driver.status === 'active' && (
                      <button
                        className="btn btn--ghost btn--small"
                        onClick={() => handleUpdateStatus({ id: driver.id, status: 'suspended' })}
                        disabled={isUpdating}
                        title="Tạm khóa"
                      >
                        Khóa
                      </button>
                    )}
                    {driver.status === 'suspended' && (
                      <button
                        className="btn btn--ghost btn--small"
                        onClick={() => handleUpdateStatus({ id: driver.id, status: 'active' })}
                        disabled={isUpdating}
                        title="Mở khóa"
                      >
                        Mở khóa
                      </button>
                    )}
                  </span>
                </div>
              ))}
              {!filteredDrivers.length && <div className="panel__empty">Không có tài xế phù hợp.</div>}
            </div>
          </div>
        )}
      </div>

      {rejectingId && (
        <div className="modal-overlay" onClick={() => setRejectingId(null)}>
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
              <button className="btn btn--ghost" onClick={() => setRejectingId(null)}>
                Hủy
              </button>
              <button
                className="btn btn--primary"
                onClick={confirmReject}
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

export default DriverManagement;

