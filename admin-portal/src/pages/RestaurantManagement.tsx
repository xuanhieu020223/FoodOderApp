import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FiCheck, FiEye, FiFilter, FiRefreshCw, FiSearch, FiX } from 'react-icons/fi';
import StatusBadge from '../components/StatusBadge';
import type { Restaurant } from '../types';
import {
  approveRestaurant,
  fetchRestaurants,
  rejectRestaurant,
  updateRestaurantStatus,
} from '../services/restaurantService';

const statusFilters: { label: string; value: 'all' | Restaurant['status'] }[] = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Chờ duyệt', value: 'pending' },
  { label: 'Đã duyệt', value: 'approved' },
  { label: 'Đang hoạt động', value: 'active' },
  { label: 'Bị từ chối', value: 'rejected' },
  { label: 'Tạm khóa', value: 'suspended' },
];

const RestaurantManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | Restaurant['status']>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const {
    data: restaurants = [],
    isLoading,
    isFetching,
    refetch,
    error: queryError,
  } = useQuery({
    queryKey: ['restaurants', 'list'],
    queryFn: fetchRestaurants,
    staleTime: 1000 * 60,
  });

  const { mutateAsync: handleApprove, isPending: isApproving } = useMutation({
    mutationFn: approveRestaurant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants', 'list'] });
      setError(null);
      setApprovingId(null);
    },
    onError: () => {
      setError('Không thể duyệt nhà hàng.');
      setApprovingId(null);
    },
  });

  const { mutateAsync: handleReject, isPending: isRejecting } = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectRestaurant(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants', 'list'] });
      setError(null);
      setRejectingId(null);
      setRejectReason('');
    },
    onError: () => {
      setError('Không thể từ chối nhà hàng.');
      setRejectingId(null);
    },
  });

  const { mutateAsync: handleUpdateStatus, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Restaurant['status'] }) =>
      updateRestaurantStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants', 'list'] });
      setError(null);
    },
    onError: () => {
      setError('Không thể cập nhật trạng thái.');
    },
  });

  const filteredRestaurants = useMemo(() => {
    let result = restaurants;

    if (filter !== 'all') {
      result = result.filter((r) => r.status === filter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.name?.toLowerCase().includes(query) ||
          r.email?.toLowerCase().includes(query) ||
          r.phone?.includes(query) ||
          r.ownerName?.toLowerCase().includes(query),
      );
    }

    return result;
  }, [restaurants, filter, searchQuery]);

  const pendingRestaurants = restaurants.filter(
    (r) => r.registrationStatus === 'pending' || (r.status === 'pending' && !r.registrationStatus),
  );

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

  const displayError = error ?? (queryError ? 'Không thể tải danh sách nhà hàng.' : null);

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>Quản lý nhà hàng</h1>
          <p className="page__subtitle">
            Duyệt yêu cầu đăng ký, kiểm tra giấy tờ và quản lý trạng thái hoạt động.
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

      {pendingRestaurants.length > 0 && (
        <div className="panel" style={{ marginBottom: '24px', borderColor: 'var(--warning)' }}>
          <div className="panel__header">
            <div>
              <h3 style={{ color: 'var(--warning)' }}>⚠️ {pendingRestaurants.length} nhà hàng chờ duyệt</h3>
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
                  placeholder="Tìm theo tên, email, số điện thoại, chủ sở hữu..."
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
            <h3>Danh sách nhà hàng</h3>
            <p>{filteredRestaurants.length} bản ghi</p>
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
                <span>Tên nhà hàng</span>
                <span>Chủ sở hữu</span>
                <span>Liên hệ</span>
                <span>Trạng thái</span>
                <span>Giấy tờ</span>
                <span>Hiệu suất</span>
                <span>Hành động</span>
              </div>
              {filteredRestaurants.map((restaurant) => (
                <div key={restaurant.id} className="table__row">
                  <span className="table__cell">
                    <p className="table__title">{restaurant.name}</p>
                    <p className="table__subtitle">{restaurant.city || 'Chưa có'}</p>
                  </span>
                  <span className="table__cell">
                    <p className="table__title">{restaurant.ownerName}</p>
                    <p className="table__subtitle">{restaurant.email}</p>
                  </span>
                  <span className="table__cell">
                    <p>{restaurant.phone}</p>
                    <p className="table__subtitle">{restaurant.address || 'Chưa có địa chỉ'}</p>
                  </span>
                  <span className="table__cell">
                    <StatusBadge status={restaurant.status} />
                    {restaurant.registrationStatus === 'pending' && (
                      <span className="status-pill status-pill--pending" style={{ marginTop: '4px', display: 'block' }}>
                        Chờ duyệt
                      </span>
                    )}
                  </span>
                  <span className="table__cell">
                    <span className={`status-pill ${restaurant.documentsVerified ? 'status-pill--resolved' : 'status-pill--pending'}`}>
                      {restaurant.documentsVerified ? 'Đã xác minh' : 'Chưa xác minh'}
                    </span>
                    {restaurant.menuVerified && (
                      <span className="status-pill status-pill--resolved" style={{ marginTop: '4px', display: 'block' }}>
                        Menu đã kiểm tra
                      </span>
                    )}
                  </span>
                  <span className="table__cell">
                    <p>{restaurant.totalOrders || 0} đơn</p>
                    <p className="table__subtitle">₫{(restaurant.totalRevenue || 0).toLocaleString('vi-VN')}</p>
                    {restaurant.rating && <p className="table__subtitle">⭐ {restaurant.rating}/5</p>}
                  </span>
                  <span className="table__cell table__actions">
                    <button
                      className="btn btn--icon"
                      onClick={() => navigate(`/restaurants/${restaurant.id}`)}
                      title="Xem chi tiết"
                    >
                      <FiEye />
                    </button>
                    {(restaurant.registrationStatus === 'pending' ||
                      (restaurant.status === 'pending' && restaurant.registrationStatus !== 'approved')) && (
                      <>
                        <button
                          className="btn btn--icon"
                          onClick={() => handleApproveClick(restaurant.id)}
                          disabled={isApproving || approvingId === restaurant.id}
                          title="Duyệt"
                          style={{ color: 'var(--success)' }}
                        >
                          <FiCheck />
                        </button>
                        <button
                          className="btn btn--icon"
                          onClick={() => handleRejectClick(restaurant.id)}
                          disabled={isRejecting}
                          title="Từ chối"
                          style={{ color: 'var(--danger)' }}
                        >
                          <FiX />
                        </button>
                      </>
                    )}
                    {restaurant.status === 'active' && (
                      <button
                        className="btn btn--ghost btn--small"
                        onClick={() => handleUpdateStatus({ id: restaurant.id, status: 'suspended' })}
                        disabled={isUpdating}
                        title="Tạm khóa"
                      >
                        Khóa
                      </button>
                    )}
                    {restaurant.status === 'suspended' && (
                      <button
                        className="btn btn--ghost btn--small"
                        onClick={() => handleUpdateStatus({ id: restaurant.id, status: 'active' })}
                        disabled={isUpdating}
                        title="Mở khóa"
                      >
                        Mở khóa
                      </button>
                    )}
                  </span>
                </div>
              ))}
              {!filteredRestaurants.length && <div className="panel__empty">Không có nhà hàng phù hợp.</div>}
            </div>
          </div>
        )}
      </div>

      {rejectingId && (
        <div className="modal-overlay" onClick={() => setRejectingId(null)}>
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

export default RestaurantManagement;

