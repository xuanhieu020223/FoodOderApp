import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FiBell, FiCalendar, FiEdit, FiFilter, FiPlus, FiRefreshCw, FiSearch, FiSend, FiTrash2, FiX } from 'react-icons/fi';
import type { Notification, NotificationTarget, NotificationType } from '../services/notificationService';
import {
  cancelScheduledNotification,
  deleteNotification,
  fetchNotifications,
  sendNotification,
} from '../services/notificationService';

const typeFilters: { label: string; value: 'all' | NotificationType }[] = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Đơn hàng', value: 'order' },
  { label: 'Khuyến mãi', value: 'promotion' },
  { label: 'Sự cố', value: 'incident' },
  { label: 'Hệ thống', value: 'system' },
  { label: 'Chung', value: 'general' },
];

const targetFilters: { label: string; value: 'all' | NotificationTarget }[] = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Khách hàng', value: 'customer' },
  { label: 'Nhà hàng', value: 'restaurant' },
  { label: 'Tài xế', value: 'driver' },
];

const NotificationManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | NotificationType>('all');
  const [targetFilter, setTargetFilter] = useState<'all' | NotificationTarget>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | Notification['status']>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    data: notifications = [],
    isLoading,
    isFetching,
    refetch,
    error: queryError,
  } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: fetchNotifications,
    staleTime: 1000 * 60,
  });

  const { mutateAsync: handleSend, isPending: isSending } = useMutation({
    mutationFn: sendNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] });
      setError(null);
    },
    onError: () => {
      setError('Không thể gửi thông báo.');
    },
  });

  const { mutateAsync: handleDelete, isPending: isDeleting } = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] });
      setError(null);
    },
    onError: () => {
      setError('Không thể xóa thông báo.');
    },
  });

  const { mutateAsync: handleCancel, isPending: isCancelling } = useMutation({
    mutationFn: cancelScheduledNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] });
      setError(null);
    },
    onError: () => {
      setError('Không thể hủy thông báo.');
    },
  });

  const filteredNotifications = useMemo(() => {
    let result = notifications;

    if (filter !== 'all') {
      result = result.filter((n) => n.type === filter);
    }

    if (targetFilter !== 'all') {
      result = result.filter((n) => n.target === targetFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter((n) => n.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.title?.toLowerCase().includes(query) ||
          n.message?.toLowerCase().includes(query),
      );
    }

    return result;
  }, [notifications, filter, targetFilter, statusFilter, searchQuery]);

  const scheduledNotifications = notifications.filter((n) => n.status === 'scheduled');
  const draftNotifications = notifications.filter((n) => n.status === 'draft');

  const displayError = error ?? (queryError ? 'Không thể tải danh sách thông báo.' : null);

  const getStatusBadge = (status: Notification['status']) => {
    const badges = {
      draft: 'status-pill--pending',
      scheduled: 'status-pill--active',
      sent: 'status-pill--resolved',
      cancelled: 'status-pill--low',
    };
    return badges[status] || 'status-pill--low';
  };

  const getTypeLabel = (type: NotificationType) => {
    const labels = {
      order: 'Đơn hàng',
      promotion: 'Khuyến mãi',
      incident: 'Sự cố',
      system: 'Hệ thống',
      general: 'Chung',
    };
    return labels[type] || type;
  };

  const getTargetLabel = (target: NotificationTarget) => {
    const labels = {
      customer: 'Khách hàng',
      restaurant: 'Nhà hàng',
      driver: 'Tài xế',
      all: 'Tất cả',
    };
    return labels[target] || target;
  };

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>Quản lý thông báo</h1>
          <p className="page__subtitle">
            Gửi thông báo tới khách hàng, nhà hàng và tài xế. Lên lịch gửi theo thời điểm.
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
          <button className="btn btn--primary" onClick={() => navigate('/notifications/create')}>
            <FiPlus />
            Tạo thông báo
          </button>
        </div>
      </div>

      <div className="grid grid--stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '24px' }}>
        <div className="stat-card">
          <p className="stat-card__label">Tổng thông báo</p>
          <div className="stat-card__value-row">
            <p className="stat-card__value">{notifications.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <p className="stat-card__label">Đã gửi</p>
          <div className="stat-card__value-row">
            <p className="stat-card__value">
              {notifications.filter((n) => n.status === 'sent').length}
            </p>
          </div>
        </div>
        <div className="stat-card">
          <p className="stat-card__label">Đã lên lịch</p>
          <div className="stat-card__value-row">
            <p className="stat-card__value">{scheduledNotifications.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <p className="stat-card__label">Bản nháp</p>
          <div className="stat-card__value-row">
            <p className="stat-card__value">{draftNotifications.length}</p>
          </div>
        </div>
      </div>

      {scheduledNotifications.length > 0 && (
        <div className="panel" style={{ marginBottom: '24px', borderColor: 'var(--warning)' }}>
          <div className="panel__header">
            <div>
              <h3 style={{ color: 'var(--warning)' }}>
                <FiCalendar /> {scheduledNotifications.length} thông báo đã lên lịch
              </h3>
              <p>Sẽ được gửi tự động theo lịch</p>
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
                  placeholder="Tìm theo tiêu đề, nội dung..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Lọc theo trạng thái</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
                <option value="all">Tất cả</option>
                <option value="draft">Bản nháp</option>
                <option value="scheduled">Đã lên lịch</option>
                <option value="sent">Đã gửi</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="tabs">
        {typeFilters.map((option) => (
          <button
            key={option.value}
            className={`tabs__item ${filter === option.value ? 'tabs__item--active' : ''}`}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="tabs" style={{ marginTop: '12px' }}>
        {targetFilters.map((option) => (
          <button
            key={option.value}
            className={`tabs__item ${targetFilter === option.value ? 'tabs__item--active' : ''}`}
            onClick={() => setTargetFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="panel panel--table">
        <div className="panel__header">
          <div>
            <h3>Danh sách thông báo</h3>
            <p>{filteredNotifications.length} bản ghi</p>
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
                <span>Tiêu đề</span>
                <span>Loại</span>
                <span>Đối tượng</span>
                <span>Thời gian</span>
                <span>Trạng thái</span>
                <span>Hành động</span>
              </div>
              {filteredNotifications.map((notification) => (
                <div key={notification.id} className="table__row">
                  <span className="table__cell">
                    <p className="table__title">{notification.title}</p>
                    <p className="table__subtitle">{notification.message?.substring(0, 60)}...</p>
                  </span>
                  <span className="table__cell">
                    <span className={`tag tag--${notification.type}`}>
                      {getTypeLabel(notification.type)}
                    </span>
                  </span>
                  <span className="table__cell">
                    <span className="status-pill status-pill--active">
                      {getTargetLabel(notification.target)}
                    </span>
                    {notification.targetIds && notification.targetIds.length > 0 && (
                      <p className="table__subtitle">{notification.targetIds.length} người cụ thể</p>
                    )}
                  </span>
                  <span className="table__cell">
                    {notification.scheduledAt ? (
                      <>
                        <p>Lên lịch: {new Date(notification.scheduledAt).toLocaleString('vi-VN')}</p>
                        {notification.sentAt && (
                          <p className="table__subtitle">
                            Đã gửi: {new Date(notification.sentAt).toLocaleString('vi-VN')}
                          </p>
                        )}
                      </>
                    ) : (
                      <p>{notification.sentAt ? new Date(notification.sentAt).toLocaleString('vi-VN') : 'Chưa gửi'}</p>
                    )}
                  </span>
                  <span className="table__cell">
                    <span className={`status-pill ${getStatusBadge(notification.status)}`}>
                      {notification.status === 'draft' && 'Bản nháp'}
                      {notification.status === 'scheduled' && 'Đã lên lịch'}
                      {notification.status === 'sent' && 'Đã gửi'}
                      {notification.status === 'cancelled' && 'Đã hủy'}
                    </span>
                  </span>
                  <span className="table__cell table__actions">
                    {notification.status === 'draft' && (
                      <button
                        className="btn btn--icon"
                        onClick={() => navigate(`/notifications/${notification.id}/edit`)}
                        title="Chỉnh sửa"
                      >
                        <FiEdit />
                      </button>
                    )}
                    {notification.status === 'draft' && (
                      <button
                        className="btn btn--icon"
                        onClick={() => handleSend(notification.id)}
                        disabled={isSending}
                        title="Gửi ngay"
                        style={{ color: 'var(--success)' }}
                      >
                        <FiSend />
                      </button>
                    )}
                    {notification.status === 'scheduled' && (
                      <button
                        className="btn btn--ghost btn--small"
                        onClick={() => handleCancel(notification.id)}
                        disabled={isCancelling}
                        title="Hủy lịch"
                      >
                        Hủy
                      </button>
                    )}
                    <button
                      className="btn btn--icon btn--danger"
                      onClick={() => {
                        if (window.confirm('Bạn có chắc chắn muốn xóa thông báo này?')) {
                          handleDelete(notification.id);
                        }
                      }}
                      disabled={isDeleting}
                      title="Xóa"
                    >
                      <FiTrash2 />
                    </button>
                  </span>
                </div>
              ))}
              {!filteredNotifications.length && <div className="panel__empty">Không có thông báo phù hợp.</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationManagement;

