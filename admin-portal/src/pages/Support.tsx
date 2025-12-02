import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FiMessageCircle, FiPhoneCall, FiEye } from 'react-icons/fi';
import { fetchSupportTickets, updateTicketStatus, type SupportTicketDoc } from '../services/supportService';

const Support = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const {
    data: tickets = [],
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ['support', 'tickets'],
    queryFn: fetchSupportTickets,
    staleTime: 1000 * 60,
  });

  const { mutateAsync: handleUpdateStatus, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SupportTicketDoc['status'] }) =>
      updateTicketStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
      setError(null);
    },
    onError: () => {
      setError('Không thể cập nhật trạng thái ticket.');
    },
  });

  const urgentTickets = tickets.filter((t) => t.severity === 'high' && t.status !== 'resolved');
  const recentTickets = tickets.slice(0, 10);
  const resolvedTickets = tickets.filter((t) => t.status === 'resolved').slice(0, 10);

  const ticketHistory = useMemo(() => {
    const history: Array<{
      ticketId: string;
      topic: string;
      customer: string;
      action: string;
      by: string;
      at: string;
      status: string;
    }> = [];

    resolvedTickets.forEach((ticket) => {
      if (ticket.respondedAt && ticket.respondedBy) {
        history.push({
          ticketId: ticket.id,
          topic: ticket.topic || 'N/A',
          customer: ticket.customer || 'Ẩn danh',
          action: 'Đã xử lý',
          by: ticket.respondedBy,
          at: ticket.respondedAt,
          status: ticket.status || 'resolved',
        });
      }
    });

    // Sắp xếp theo thời gian mới nhất
    return history.sort((a, b) => {
      const dateA = new Date(a.at).getTime();
      const dateB = new Date(b.at).getTime();
      return dateB - dateA;
    });
  }, [resolvedTickets]);

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
          ) : queryError ? (
            <div className="panel__empty error">Không thể tải danh sách ticket.</div>
        ) : (
          <div className="table-wrapper">
            <div className="table">
              <div className="table__head">
                <span>Mã</span>
                <span>Khách hàng</span>
                <span>Chủ đề</span>
                <span>Kênh</span>
                <span>Severity</span>
                <span>Trạng thái</span>
                <span>Hành động</span>
              </div>
              {recentTickets.map((ticket) => (
                <div key={ticket.id} className="table__row">
                  <span className="table__cell">{ticket.id}</span>
                  <span className="table__cell">
                    <p className="table__title">{ticket.customer || 'Ẩn danh'}</p>
                    <p className="table__subtitle">{ticket.updatedAt || ''}</p>
                  </span>
                  <span className="table__cell">{ticket.topic}</span>
                  <span className="table__cell">
                    <span className={`tag tag--${ticket.channel ?? 'app'}`}>{ticket.channel || 'app'}</span>
                  </span>
                  <span className="table__cell">
                    <span className={`status-pill status-pill--${ticket.severity ?? 'low'}`}>
                      {ticket.severity || 'low'}
                    </span>
                  </span>
                  <span className="table__cell">
                    <span className={`status-pill status-pill--${ticket.status ?? 'new'}`}>
                      {ticket.status || 'new'}
                    </span>
                  </span>
                  <span className="table__cell table__actions">
                    <button
                      className="btn btn--icon"
                      onClick={() => navigate(`/support/tickets/${ticket.id}`)}
                      title="Xem chi tiết"
                    >
                      <FiEye />
                    </button>
                    {ticket.status !== 'resolved' && (
                      <button
                        className="btn btn--ghost btn--small"
                        onClick={() => handleUpdateStatus({ id: ticket.id, status: 'resolved' })}
                        disabled={isUpdating}
                        title="Đánh dấu đã xử lý"
                      >
                        Xử lý
                      </button>
                    )}
                  </span>
                </div>
              ))}
              {!recentTickets.length && <div className="panel__empty">Chưa có ticket nào.</div>}
              {error && <div className="panel__empty error" style={{ marginTop: '16px' }}>{error}</div>}
            </div>
          </div>
        )}
        </div>

        {urgentTickets.length > 0 && (
          <div className="panel" style={{ marginTop: '24px', borderColor: 'var(--danger)' }}>
            <div className="panel__header">
              <div>
                <h3 style={{ color: 'var(--danger)' }}>⚠️ Ticket cần xử lý gấp (SLA &lt; 2h)</h3>
                <p>{urgentTickets.length} ticket cần ưu tiên</p>
              </div>
            </div>
            <div className="list">
              {urgentTickets.slice(0, 5).map((ticket) => (
                <div key={ticket.id} className="list__item">
                  <div>
                    <p className="list__title">{ticket.topic}</p>
                    <p className="list__subtitle">{ticket.customer || 'Ẩn danh'} • {ticket.id}</p>
                  </div>
                  <button
                    className="btn btn--primary btn--small"
                    onClick={() => navigate(`/support/tickets/${ticket.id}`)}
                  >
                    Xử lý ngay
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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

      <div className="panel">
        <div className="panel__header">
          <div>
            <h3>Lịch sử xử lý ticket</h3>
            <p>{ticketHistory.length} ticket đã được xử lý</p>
          </div>
          <select>
            <option>Tất cả thời gian</option>
            <option>7 ngày qua</option>
            <option>30 ngày qua</option>
          </select>
        </div>
        {ticketHistory.length === 0 ? (
          <div className="panel__empty">Chưa có lịch sử xử lý.</div>
        ) : (
          <div className="table-wrapper">
            <div className="table">
              <div className="table__head">
                <span>Ticket ID</span>
                <span>Chủ đề</span>
                <span>Khách hàng</span>
                <span>Người xử lý</span>
                <span>Thời gian xử lý</span>
                <span>Trạng thái</span>
              </div>
              {ticketHistory.map((item) => (
                <div key={`${item.ticketId}-${item.at}`} className="table__row">
                  <span className="table__cell">
                    <p className="table__title">{item.ticketId}</p>
                  </span>
                  <span className="table__cell">
                    <p className="table__title">{item.topic}</p>
                  </span>
                  <span className="table__cell">
                    <p>{item.customer}</p>
                  </span>
                  <span className="table__cell">
                    <p className="table__title">{item.by}</p>
                    <p className="table__subtitle">{item.action}</p>
                  </span>
                  <span className="table__cell">
                    <p>{new Date(item.at).toLocaleString('vi-VN')}</p>
                  </span>
                  <span className="table__cell">
                    <span className="status-pill status-pill--resolved">{item.status}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Support;

