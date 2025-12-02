import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import type { NotificationTarget, NotificationType } from '../services/notificationService';
import { createNotification } from '../services/notificationService';

const CreateNotification = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const { mutateAsync: createNotificationMutation } = useMutation({
    mutationFn: createNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] });
      navigate('/notifications');
    },
    onError: (err: Error) => {
      setError(err.message || 'Không thể tạo thông báo. Vui lòng thử lại.');
      setIsSubmitting(false);
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
      const notificationData = {
        title: formData.title,
        message: formData.message,
        type: formData.type,
        target: formData.target,
        targetIds: formData.targetIds
          ? formData.targetIds.split(',').map((id) => id.trim()).filter(Boolean)
          : undefined,
        scheduledAt: formData.scheduledAt || undefined,
        imageUrl: formData.imageUrl || undefined,
        actionUrl: formData.actionUrl || undefined,
        status: formData.scheduledAt ? ('scheduled' as const) : ('draft' as const),
        createdBy: profile?.name || profile?.email || 'Admin',
      };

      await createNotificationMutation(notificationData);
    } catch (err) {
      // Error đã được xử lý trong onError
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>Tạo thông báo mới</h1>
          <p className="page__subtitle">Gửi thông báo tới người dùng hoặc lên lịch gửi sau.</p>
        </div>
        <button className="btn btn--ghost" onClick={() => navigate('/notifications')}>
          Quay lại
        </button>
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
            <small style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Để trống nếu gửi cho tất cả. Nhập ID cụ thể nếu muốn gửi cho một số người nhất định.
            </small>
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
            <small style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Để trống nếu muốn lưu bản nháp. Chọn thời gian để lên lịch gửi tự động.
            </small>
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
            <small style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Link khi người dùng nhấn vào thông báo
            </small>
          </div>

          {error && <div className="panel__empty error">{error}</div>}

          <div className="form-actions">
            <button type="button" className="btn btn--ghost" onClick={() => navigate('/notifications')}>
              Hủy
            </button>
            <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
              {isSubmitting ? 'Đang tạo...' : formData.scheduledAt ? 'Lên lịch gửi' : 'Lưu bản nháp'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateNotification;

