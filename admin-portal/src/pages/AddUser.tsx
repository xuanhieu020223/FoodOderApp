import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { UserRole } from '../types';

const AddUser = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'customer' as UserRole,
    city: '',
  });

  const { mutateAsync: createUser } = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Tạo tài khoản authentication
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const userId = userCredential.user.uid;

      // Tạo document trong Firestore
      await setDoc(doc(db, 'users', userId), {
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        status: 'active',
        city: data.city || '',
        createdAt: new Date(),
      });

      return userId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
      navigate('/users');
    },
    onError: (err: Error) => {
      setError(err.message || 'Không thể tạo tài khoản. Vui lòng thử lại.');
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!formData.name || !formData.email || !formData.password) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc.');
      setIsSubmitting(false);
      return;
    }

    try {
      await createUser(formData);
    } catch (err) {
      // Error đã được xử lý trong onError
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>Thêm tài khoản mới</h1>
          <p className="page__subtitle">Tạo tài khoản người dùng mới cho hệ thống.</p>
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
            />
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
            <label htmlFor="password">Mật khẩu *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              placeholder="Tối thiểu 6 ký tự"
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

          {error && <div className="panel__empty error">{error}</div>}

          <div className="form-actions">
            <button type="button" className="btn btn--ghost" onClick={() => navigate('/users')}>
              Hủy
            </button>
            <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
              {isSubmitting ? 'Đang tạo...' : 'Tạo tài khoản'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUser;

