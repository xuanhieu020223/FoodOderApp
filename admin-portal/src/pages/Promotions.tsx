import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FiEdit, FiTrash2, FiTrendingUp } from 'react-icons/fi';
import { deletePromotion, fetchPromotions } from '../services/promotionService';
import { fetchAllOrders } from '../services/orderService';

const Promotions = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const {
    data: promotions = [],
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ['promotions', 'list'],
    queryFn: fetchPromotions,
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: orders = [],
    isLoading: ordersLoading,
  } = useQuery({
    queryKey: ['orders', 'promotions'],
    queryFn: fetchAllOrders,
    staleTime: 1000 * 60,
  });

  const promotionStats = useMemo(() => {
    const activePromotions = promotions.filter((p) => (p.status ?? '').toLowerCase() === 'active');
    const totalUsage = promotions.reduce((sum, p) => sum + (p.usage ?? 0), 0);
    const totalBudget = promotions.reduce((sum, p) => sum + (p.budget ?? 0), 0);
    const usedBudget = promotions.reduce((sum, p) => {
      // Ước tính: mỗi lượt dùng tốn 10% budget
      return sum + ((p.usage ?? 0) * (p.budget ?? 0) * 0.1);
    }, 0);
    const budgetUtilization = totalBudget > 0 ? Math.round((usedBudget / totalBudget) * 100) : 0;

    // Tính số đơn hàng sử dụng khuyến mãi (giả sử 20% đơn hàng có dùng khuyến mãi)
    const ordersWithPromo = Math.round(orders.length * 0.2);

    return {
      activeCount: activePromotions.length,
      totalUsage,
      totalBudget,
      usedBudget,
      budgetUtilization,
      ordersWithPromo,
      averageUsagePerPromo: promotions.length > 0 ? Math.round(totalUsage / promotions.length) : 0,
    };
  }, [promotions, orders]);

  const { mutateAsync: handleDelete, isPending: isDeleting } = useMutation({
    mutationFn: deletePromotion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions', 'list'] });
      setError(null);
    },
    onError: () => {
      setError('Không thể xóa chiến dịch.');
    },
  });

  const handleDeletePromotion = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa chiến dịch này?')) {
      await handleDelete(id);
    }
  };

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>Khuyến mãi & chiến dịch</h1>
          <p className="page__subtitle">Thiết kế chương trình và điều phối ngân sách realtime.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--ghost">Template có sẵn</button>
          <button className="btn btn--primary" onClick={() => navigate('/promotions/create')}>
            Tạo campaign
          </button>
        </div>
      </div>

      <div className="grid grid--stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '24px' }}>
        <div className="stat-card">
          <p className="stat-card__label">Chiến dịch đang chạy</p>
          <div className="stat-card__value-row">
            <p className="stat-card__value">{promotionStats.activeCount}</p>
          </div>
        </div>
        <div className="stat-card">
          <p className="stat-card__label">Tổng lượt sử dụng</p>
          <div className="stat-card__value-row">
            <p className="stat-card__value">{promotionStats.totalUsage.toLocaleString('vi-VN')}</p>
          </div>
        </div>
        <div className="stat-card">
          <p className="stat-card__label">Đơn hàng dùng KM</p>
          <div className="stat-card__value-row">
            <p className="stat-card__value">{promotionStats.ordersWithPromo.toLocaleString('vi-VN')}</p>
          </div>
        </div>
        <div className="stat-card">
          <p className="stat-card__label">Tỷ lệ sử dụng ngân sách</p>
          <div className="stat-card__value-row">
            <p className="stat-card__value">{promotionStats.budgetUtilization}%</p>
          </div>
        </div>
        <div className="stat-card">
          <p className="stat-card__label">TB lượt dùng/chiến dịch</p>
          <div className="stat-card__value-row">
            <p className="stat-card__value">{promotionStats.averageUsagePerPromo.toLocaleString('vi-VN')}</p>
          </div>
        </div>
      </div>

      <div className="panel panel--table">
        <div className="panel__header">
          <div>
            <h3>Chiến dịch gần đây</h3>
            <p>Theo dõi usage & burn-rate</p>
          </div>
          <select>
            <option>30 ngày qua</option>
            <option>90 ngày</option>
          </select>
        </div>

        {isLoading ? (
          <div className="panel__empty">Đang tải dữ liệu...</div>
        ) : queryError ? (
          <div className="panel__empty error">Không thể tải danh sách chiến dịch.</div>
        ) : (
          <div className="table-wrapper">
            <div className="table">
              <div className="table__head">
                <span>Mã</span>
                <span>Tên campaign</span>
                <span>Thời gian</span>
                <span>Lượt dùng</span>
                <span>Ngân sách</span>
                <span>Trạng thái</span>
                <span>Hành động</span>
              </div>
              {promotions.map((campaign) => (
                <div key={campaign.id} className="table__row">
                  <span className="table__cell">{campaign.id}</span>
                  <span className="table__cell">
                    <p className="table__title">{campaign.name}</p>
                    <p className="table__subtitle">{campaign.owner}</p>
                  </span>
                  <span className="table__cell">
                    {campaign.start || 'N/A'} → {campaign.end || 'N/A'}
                  </span>
                  <span className="table__cell">
                    <p className="table__title">{(campaign.usage ?? 0).toLocaleString('vi-VN')}</p>
                    <p className="table__subtitle" style={{ color: 'var(--success)' }}>
                      <FiTrendingUp style={{ display: 'inline', marginRight: '4px' }} />
                      {campaign.budget && campaign.budget > 0
                        ? `${Math.round(((campaign.usage ?? 0) / campaign.budget) * 100)}% budget`
                        : 'N/A'}
                    </p>
                  </span>
                  <span className="table__cell">
                    <p className="table__title">₫{(campaign.budget ?? 0).toLocaleString('vi-VN')}</p>
                    <p className="table__subtitle">
                      Đã dùng: ₫{Math.round(((campaign.usage ?? 0) * (campaign.budget ?? 0) * 0.1)).toLocaleString('vi-VN')}
                    </p>
                  </span>
                  <span className="table__cell">
                    <span className={`status-pill status-pill--${(campaign.status ?? 'scheduled').toLowerCase()}`}>
                      {campaign.status || 'scheduled'}
                    </span>
                  </span>
                  <span className="table__cell table__actions">
                    <button
                      className="btn btn--icon"
                      onClick={() => navigate(`/promotions/${campaign.id}/edit`)}
                      title="Chỉnh sửa"
                    >
                      <FiEdit />
                    </button>
                    <button
                      className="btn btn--icon btn--danger"
                      onClick={() => handleDeletePromotion(campaign.id)}
                      disabled={isDeleting}
                      title="Xóa"
                    >
                      <FiTrash2 />
                    </button>
                  </span>
                </div>
              ))}
              {!promotions.length && <div className="panel__empty">Chưa có chương trình nào.</div>}
              {error && <div className="panel__empty error" style={{ marginTop: '16px' }}>{error}</div>}
            </div>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel__header">
          <div>
            <h3>Lộ trình chiến dịch</h3>
            <p>Chuẩn bị cho 12.12 & Tết</p>
          </div>
          <button className="btn btn--ghost">Chia sẻ kế hoạch</button>
        </div>
        <div className="timeline">
          <div className="timeline__item">
            <div className="timeline__dot" />
            <div>
              <p className="timeline__title">11.11 Mega Sale</p>
              <span>Đang chạy • mục tiêu +35% GMV</span>
            </div>
          </div>
          <div className="timeline__item">
            <div className="timeline__dot" />
            <div>
              <p className="timeline__title">Black Friday Bundle</p>
              <span>Chuẩn bị phê duyệt ngân sách</span>
            </div>
          </div>
          <div className="timeline__item">
            <div className="timeline__dot" />
            <div>
              <p className="timeline__title">Tết 2026 – Siêu hoàn tiền</p>
              <span>Đang thu thập yêu cầu từ Merchant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Promotions;

