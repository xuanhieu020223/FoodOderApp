import { useQuery } from '@tanstack/react-query';
import { FiMessageCircle, FiPhoneCall } from 'react-icons/fi';
import { fetchSupportTickets } from '../services/supportService';

const Support = () => {
  const {
    data: tickets = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['support', 'tickets'],
    queryFn: fetchSupportTickets,
    staleTime: 1000 * 60,
  });

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>Hỗ trợ & khiếu nại</h1>
          <p className="page__subtitle">Tiếp nhận phản ánh và giữ SLA phản hồi dưới 15 phút.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--ghost">
            <FiPhoneCall />
            Hotline
          </button>
          <button className="btn btn--primary">
            <FiMessageCircle />
            Tạo ticket
          </button>
        </div>
      </div>

      <div className="grid grid--2">
        <div className="panel panel--table">
          <div className="panel__header">
            <div>
              <h3>Ticket mới nhất</h3>
              <p>Ưu tiên theo mức độ nghiêm trọng</p>
            </div>
            <select>
              <option>Trong 24h</option>
              <option>7 ngày</option>
            </select>
          </div>
          {isLoading ? (
            <div className="panel__empty">Đang tải dữ liệu...</div>
          ) : error ? (
            <div className="panel__empty error">Không thể tải danh sách ticket.</div>
          ) : (
            <div className="table">
              <div className="table__head">
                <span>Mã</span>
                <span>Khách hàng</span>
                <span>Chủ đề</span>
                <span>Kênh</span>
                <span>Severity</span>
                <span>Trạng thái</span>
              </div>
              {tickets.map((ticket) => (
                <div key={ticket.id} className="table__row">
                  <span>{ticket.id}</span>
                  <span>
                    <p className="table__title">{ticket.customer || 'Ẩn danh'}</p>
                    <p className="table__subtitle">{ticket.updatedAt || ''}</p>
                  </span>
                  <span>{ticket.topic}</span>
                  <span className={`tag tag--${ticket.channel ?? 'app'}`}>{ticket.channel || 'app'}</span>
                  <span>
                    <span className={`status-pill status-pill--${ticket.severity ?? 'low'}`}>
                      {ticket.severity || 'low'}
                    </span>
                  </span>
                  <span>
                    <span className={`status-pill status-pill--${ticket.status ?? 'new'}`}>
                      {ticket.status || 'new'}
                    </span>
                  </span>
                </div>
              ))}
              {!tickets.length && <div className="panel__empty">Chưa có ticket nào.</div>}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel__header">
            <div>
              <h3>Playbook xử lý</h3>
              <p>Các kịch bản được phê duyệt</p>
            </div>
          </div>
          <ul className="playbook">
            <li>
              <p className="playbook__title">Đơn hàng trễ &gt; 15 phút</p>
              <span>Thông báo khách hàng + hỗ trợ 15% voucher</span>
            </li>
            <li>
              <p className="playbook__title">Nhà hàng offline đột ngột</p>
              <span>Khóa nhận đơn + chuyển hướng đơn tự động</span>
            </li>
            <li>
              <p className="playbook__title">Hoàn tiền ví điện tử</p>
              <span>Escalate sang đội Payments trong 30 phút</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Support;

