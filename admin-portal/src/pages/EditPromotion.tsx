import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPromotionById, updatePromotion } from '../services/promotionService';
import type { PromotionCampaign } from '../types';

const EditPromotion = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: promotion,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ['promotion', id],
    queryFn: () => getPromotionById(id!),
    enabled: !!id,
  });

  const [formData, setFormData] = useState({
    name: '',
    type: 'voucher' as PromotionCampaign['type'],
    budget: '',
    start: '',
    end: '',
    owner: '',
    status: 'scheduled' as const,
  });

  useEffect(() => {
    if (promotion) {
      setFormData({
        name: promotion.name || '',
        type: (promotion.type as PromotionCampaign['type']) || 'voucher',
        budget: promotion.budget?.toString() || '',
        start: promotion.start || '',
        end: promotion.end || '',
        owner: promotion.owner || '',
        status: (promotion.status as 'scheduled' | 'active' | 'ended') || 'scheduled',
      });
    }
  }, [promotion]);

  const { mutateAsync: updatePromotionMutation } = useMutation({
    mutationFn: (data: typeof formData) => {
      const updateData = {
        name: data.name,
        type: data.type,
        budget: Number(data.budget) || 0,
        start: data.start,
        end: data.end,
        owner: data.owner || 'Admin',
        status: data.status,
      };
      return updatePromotion(id!, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['promotion', id] });
      navigate('/promotions');
    },
    onError: (err: Error) => {
      setError(err.message || 'Không thể cập nhật chiến dịch. Vui lòng thử lại.');
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
      await updatePromotionMutation(formData);
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

  if (queryError || !promotion) {
    return (
      <div className="page">
        <div className="panel__empty error">Không tìm thấy chiến dịch hoặc có lỗi xảy ra.</div>
        <button className="btn btn--ghost" onClick={() => navigate('/promotions')}>
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>Chỉnh sửa chiến dịch khuyến mãi</h1>
          <p className="page__subtitle">Cập nhật thông tin chiến dịch.</p>
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

          <div className="form-group">
            <label htmlFor="status">Trạng thái *</label>
            <select id="status" name="status" value={formData.status} onChange={handleChange} required>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="ended">Ended</option>
            </select>
          </div>

          {error && <div className="panel__empty error">{error}</div>}

          <div className="form-actions">
            <button type="button" className="btn btn--ghost" onClick={() => navigate('/promotions')}>
              Hủy
            </button>
            <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
              {isSubmitting ? 'Đang cập nhật...' : 'Cập nhật chiến dịch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPromotion;

