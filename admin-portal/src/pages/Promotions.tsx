import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';

type PromotionDoc = {
  id: string;
  name?: string;
  owner?: string;
  start?: string;
  end?: string;
  usage?: number;
  budget?: number;
  status?: string;
};

const Promotions = () => {
  const [promotions, setPromotions] = useState<PromotionDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'promotions'), orderBy('start', 'desc')));
        setPromotions(
          snap.docs.map((docSnap) => ({
            ...(docSnap.data() as PromotionDoc),
            id: docSnap.id,
          })),
        );
      } catch (err) {
        console.error('Error loading promotions', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPromotions();
  }, []);

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>Khuyến mãi & chiến dịch</h1>
          <p className="page__subtitle">Thiết kế chương trình và điều phối ngân sách realtime.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--ghost">Template có sẵn</button>
          <button className="btn btn--primary">Tạo campaign</button>
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

        {loading ? (
          <div className="panel__empty">Đang tải dữ liệu...</div>
        ) : (
          <div className="table">
            <div className="table__head">
              <span>Mã</span>
              <span>Tên campaign</span>
              <span>Thời gian</span>
              <span>Lượt dùng</span>
              <span>Ngân sách</span>
              <span>Trạng thái</span>
            </div>
            {promotions.map((campaign) => (
              <div key={campaign.id} className="table__row">
                <span>{campaign.id}</span>
                <span>
                  <p className="table__title">{campaign.name}</p>
                  <p className="table__subtitle">{campaign.owner}</p>
                </span>
                <span>
                  {campaign.start || 'N/A'} → {campaign.end || 'N/A'}
                </span>
                <span>{(campaign.usage ?? 0).toLocaleString('vi-VN')}</span>
                <span>₫{(campaign.budget ?? 0).toLocaleString('vi-VN')}</span>
                <span>
                  <span className={`status-pill status-pill--${(campaign.status ?? 'scheduled').toLowerCase()}`}>
                    {campaign.status || 'scheduled'}
                  </span>
                </span>
              </div>
            ))}
            {!promotions.length && <div className="panel__empty">Chưa có chương trình nào.</div>}
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

