import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { updateUser, getUserById } from '../services/userService';
import type { UserRole } from '../types';

const EditUser = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: user,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ['user', id],
    queryFn: () => getUserById(id!),
    enabled: !!id,
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'customer' as UserRole,
    city: '',
    status: 'active' as const,
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role,
        city: user.city || '',
        status: user.status,
      });
    }
  }, [user]);

  const { mutateAsync: updateUserMutation } = useMutation({
    mutationFn: (data: typeof formData) => updateUser(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      navigate('/users');
    },
    onError: (err: Error) => {
      setError(err.message || 'Không thể cập nhật tài khoản. Vui lòng thử lại.');
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!formData.name || !formData.email) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc.');
      setIsSubmitting(false);
      return;
    }

    try {
      await updateUserMutation(formData);
    } catch (err) {
      // Error đã được xử lý trong onError
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

  if (queryError || !user) {
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
          <h1>Chỉnh sửa tài khoản</h1>
          <p className="page__subtitle">Cập nhật thông tin người dùng.</p>
        </div>
        <button className="btn btn--ghost" onClick={() => navigate('/users')}>
          Quay lại
        </button>
      </div>

      <div className="panel">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Tên hiển thị *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Nhập tên hiển thị"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="example@email.com"
              disabled
            />
            <small style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Email không thể thay đổi</small>
          </div>

          <div className="form-group">
            <label htmlFor="phone">Số điện thoại</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="0123456789"
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Vai trò *</label>
            <select id="role" name="role" value={formData.role} onChange={handleChange} required>
              <option value="customer">Khách hàng</option>
              <option value="restaurant">Nhà hàng</option>
              <option value="driver">Tài xế</option>
              <option value="admin">Quản trị viên</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="city">Thành phố</label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Hà Nội, TP.HCM, ..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="status">Trạng thái *</label>
            <select id="status" name="status" value={formData.status} onChange={handleChange} required>
              <option value="active">Active</option>
              <option value="locked">Locked</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {error && <div className="panel__empty error">{error}</div>}

          <div className="form-actions">
            <button type="button" className="btn btn--ghost" onClick={() => navigate('/users')}>
              Hủy
            </button>
            <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
              {isSubmitting ? 'Đang cập nhật...' : 'Cập nhật tài khoản'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUser;

