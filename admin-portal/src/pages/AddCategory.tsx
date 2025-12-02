import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCategory } from '../services/categoryService';

const AddCategory = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    icon: '🍽️',
    priority: 0,
  });

  const { mutateAsync: createCategoryMutation } = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', 'list'] });
      navigate('/catalog-orders');
    },
    onError: (err: Error) => {
      setError(err.message || 'Không thể tạo danh mục. Vui lòng thử lại.');
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!formData.name) {
      setError('Vui lòng điền tên danh mục.');
      setIsSubmitting(false);
      return;
    }

    try {
      await createCategoryMutation(formData);
    } catch (err) {
      // Error đã được xử lý trong onError
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name === 'priority' ? Number(value) : value }));
  };

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>Thêm danh mục mới</h1>
          <p className="page__subtitle">Tạo danh mục món ăn mới cho hệ thống.</p>
        </div>
        <button className="btn btn--ghost" onClick={() => navigate('/catalog-orders')}>
          Quay lại
        </button>
      </div>

      <div className="panel">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Tên danh mục *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Ví dụ: Đồ ăn nhanh, Đồ uống..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="icon">Icon (emoji)</label>
            <input
              type="text"
              id="icon"
              name="icon"
              value={formData.icon}
              onChange={handleChange}
              placeholder="🍽️"
              maxLength={2}
            />
          </div>

          <div className="form-group">
            <label htmlFor="priority">Độ ưu tiên</label>
            <input
              type="number"
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              min="0"
              placeholder="0"
            />
            <small style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Số càng nhỏ, hiển thị càng trước
            </small>
          </div>

          {error && <div className="panel__empty error">{error}</div>}

          <div className="form-actions">
            <button type="button" className="btn btn--ghost" onClick={() => navigate('/catalog-orders')}>
              Hủy
            </button>
            <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
              {isSubmitting ? 'Đang tạo...' : 'Tạo danh mục'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCategory;

