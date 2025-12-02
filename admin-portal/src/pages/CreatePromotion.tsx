import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { PromotionCampaign } from '../types';

const CreatePromotion = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'voucher' as PromotionCampaign['type'],
    budget: '',
    start: '',
    end: '',
    owner: '',
  });

  const { mutateAsync: createPromotion } = useMutation({
    mutationFn: async (data: typeof formData) => {
      const promotionData = {
        name: data.name,
        type: data.type,
        budget: Number(data.budget) || 0,
        start: data.start,
        end: data.end,
        owner: data.owner || 'Admin',
        status: 'scheduled' as const,
        usage: 0,
        createdAt: new Date(),
      };

      const docRef = await addDoc(collection(db, 'promotions'), promotionData);
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions', 'list'] });
      navigate('/promotions');
    },
    onError: (err: Error) => {
      setError(err.message || 'Không thể tạo chiến dịch. Vui lòng thử lại.');
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!formData.name || !formData.start || !formData.end) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc.');
      setIsSubmitting(false);
      return;
    }

    if (new Date(formData.start) >= new Date(formData.end)) {
      setError('Ngày kết thúc phải sau ngày bắt đầu.');
      setIsSubmitting(false);
      return;
    }

    try {
      await createPromotion(formData);
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
          <h1>Tạo chiến dịch khuyến mãi</h1>
          <p className="page__subtitle">Thiết kế chương trình khuyến mãi và voucher mới.</p>
        </div>
        <button className="btn btn--ghost" onClick={() => navigate('/promotions')}>
          Quay lại
        </button>
      </div>

      <div className="panel">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Tên chiến dịch *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Ví dụ: Black Friday 2024"
            />
          </div>

          <div className="form-group">
            <label htmlFor="type">Loại khuyến mãi *</label>
            <select id="type" name="type" value={formData.type} onChange={handleChange} required>
              <option value="voucher">Voucher giảm giá</option>
              <option value="free-ship">Miễn phí vận chuyển</option>
              <option value="combo">Combo ưu đãi</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="budget">Ngân sách (VNĐ)</label>
            <input
              type="number"
              id="budget"
              name="budget"
              value={formData.budget}
              onChange={handleChange}
              min="0"
              placeholder="1000000"
            />
          </div>

          <div className="form-group">
            <label htmlFor="start">Ngày bắt đầu *</label>
            <input
              type="datetime-local"
              id="start"
              name="start"
              value={formData.start}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="end">Ngày kết thúc *</label>
            <input
              type="datetime-local"
              id="end"
              name="end"
              value={formData.end}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="owner">Người phụ trách</label>
            <input
              type="text"
              id="owner"
              name="owner"
              value={formData.owner}
              onChange={handleChange}
              placeholder="Tên người phụ trách"
            />
          </div>

          {error && <div className="panel__empty error">{error}</div>}

          <div className="form-actions">
            <button type="button" className="btn btn--ghost" onClick={() => navigate('/promotions')}>
              Hủy
            </button>
            <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
              {isSubmitting ? 'Đang tạo...' : 'Tạo chiến dịch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePromotion;

