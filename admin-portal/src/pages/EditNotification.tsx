import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import type { NotificationTarget, NotificationType } from '../services/notificationService';
import { getNotificationById, updateNotification, sendNotification } from '../services/notificationService';

const EditNotification = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: notification,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ['notification', id],
    queryFn: () => getNotificationById(id!),
    enabled: !!id,
  });

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'general' as NotificationType,
    target: 'all' as NotificationTarget,
    targetIds: '',
    scheduledAt: '',
    imageUrl: '',
    actionUrl: '',
  });

  useEffect(() => {
    if (notification) {
      setFormData({
        title: notification.title || '',
        message: notification.message || '',
        type: notification.type,
        target: notification.target,
        targetIds: notification.targetIds?.join(', ') || '',
        scheduledAt: notification.scheduledAt
          ? new Date(notification.scheduledAt).toISOString().slice(0, 16)
          : '',
        imageUrl: notification.imageUrl || '',
        actionUrl: notification.actionUrl || '',
      });
    }
  }, [notification]);

  const { mutateAsync: updateNotificationMutation } = useMutation({
    mutationFn: (data: typeof formData) => {
      const updateData: any = {
        title: data.title,
        message: data.message,
        type: data.type,
        target: data.target,
        targetIds: data.targetIds
          ? data.targetIds.split(',').map((id) => id.trim()).filter(Boolean)
          : undefined,
        scheduledAt: data.scheduledAt || undefined,
        imageUrl: data.imageUrl || undefined,
        actionUrl: data.actionUrl || undefined,
      };
      if (data.scheduledAt && notification?.status === 'draft') {
        updateData.status = 'scheduled';
      }
      return updateNotification(id!, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['notification', id] });
      navigate('/notifications');
    },
    onError: (err: Error) => {
      setError(err.message || 'Không thể cập nhật thông báo. Vui lòng thử lại.');
      setIsSubmitting(false);
    },
  });

  const { mutateAsync: handleSend, isPending: isSending } = useMutation({
    mutationFn: () => sendNotification(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['notification', id] });
      navigate('/notifications');
    },
    onError: () => {
      setError('Không thể gửi thông báo.');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!formData.title || !formData.message) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc.');
      setIsSubmitting(false);
      return;
    }

    try {
      await updateNotificationMutation(formData);
    } catch (err) {
      // Error đã được xử lý trong onError
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (isLoading) {
    return (
      <div className="page">
        <div className="panel__empty">Đang tải dữ liệu...</div>
      </div>
    );
  }

  if (queryError || !notification) {
    return (
      <div className="page">
        <div className="panel__empty error">Không tìm thấy thông báo hoặc có lỗi xảy ra.</div>
        <button className="btn btn--ghost" onClick={() => navigate('/notifications')}>
          Quay lại
        </button>
      </div>
    );
  }

  if (notification.status !== 'draft') {
    return (
      <div className="page">
        <div className="panel__empty error">Chỉ có thể chỉnh sửa thông báo ở trạng thái bản nháp.</div>
        <button className="btn btn--ghost" onClick={() => navigate('/notifications')}>
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>Chỉnh sửa thông báo</h1>
          <p className="page__subtitle">Cập nhật thông tin thông báo.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--primary" onClick={() => handleSend()} disabled={isSending}>
            {isSending ? 'Đang gửi...' : 'Gửi ngay'}
          </button>
          <button className="btn btn--ghost" onClick={() => navigate('/notifications')}>
            Quay lại
          </button>
        </div>
      </div>

      <div className="panel">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Tiêu đề *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Nhập tiêu đề thông báo"
            />
          </div>

          <div className="form-group">
            <label htmlFor="message">Nội dung *</label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              rows={6}
              placeholder="Nhập nội dung thông báo"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="type">Loại thông báo *</label>
            <select id="type" name="type" value={formData.type} onChange={handleChange} required>
              <option value="general">Chung</option>
              <option value="order">Đơn hàng</option>
              <option value="promotion">Khuyến mãi</option>
              <option value="incident">Sự cố</option>
              <option value="system">Hệ thống</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="target">Đối tượng nhận *</label>
            <select id="target" name="target" value={formData.target} onChange={handleChange} required>
              <option value="all">Tất cả người dùng</option>
              <option value="customer">Chỉ khách hàng</option>
              <option value="restaurant">Chỉ nhà hàng</option>
              <option value="driver">Chỉ tài xế</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="targetIds">ID người dùng cụ thể (tùy chọn)</label>
            <input
              type="text"
              id="targetIds"
              name="targetIds"
              value={formData.targetIds}
              onChange={handleChange}
              placeholder="Nhập ID cách nhau bởi dấu phẩy: id1, id2, id3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="scheduledAt">Lên lịch gửi (tùy chọn)</label>
            <input
              type="datetime-local"
              id="scheduledAt"
              name="scheduledAt"
              value={formData.scheduledAt}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="imageUrl">URL hình ảnh (tùy chọn)</label>
            <input
              type="url"
              id="imageUrl"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="form-group">
            <label htmlFor="actionUrl">URL hành động (tùy chọn)</label>
            <input
              type="url"
              id="actionUrl"
              name="actionUrl"
              value={formData.actionUrl}
              onChange={handleChange}
              placeholder="https://example.com/action"
            />
          </div>

          {error && <div className="panel__empty error">{error}</div>}

          <div className="form-actions">
            <button type="button" className="btn btn--ghost" onClick={() => navigate('/notifications')}>
              Hủy
            </button>
            <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
              {isSubmitting ? 'Đang cập nhật...' : 'Cập nhật'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditNotification;

