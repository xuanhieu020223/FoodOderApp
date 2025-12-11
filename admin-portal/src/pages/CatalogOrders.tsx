import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FiEdit, FiTrash2 } from 'react-icons/fi';
import StatusBadge from '../components/StatusBadge';
import { deleteCategory, fetchCategories } from '../services/categoryService';
import { fetchLatestOrders, subscribeLatestOrders } from '../services/orderService';

const CatalogOrders = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useQuery({
    queryKey: ['categories', 'list'],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: orders = [],
    isLoading: ordersLoading,
    error: ordersError,
  } = useQuery({
    queryKey: ['orders', 'latest'],
    queryFn: () => fetchLatestOrders(15),
    staleTime: 1000 * 30,
  });

  const { mutateAsync: handleDeleteCategory, isPending: isDeleting } = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', 'list'] });
      setError(null);
    },
    onError: () => {
      setError('Không thể xóa danh mục.');
    },
  });

  useEffect(() => {
    const unsubscribe = subscribeLatestOrders(15, (next) => {
      queryClient.setQueryData(['orders', 'latest'], next);
    });
    return unsubscribe;
  }, [queryClient]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa danh mục này?')) {
      await handleDeleteCategory(id);
    }
  };

  const loading = categoriesLoading || ordersLoading;
  const errorMessage = categoriesError || ordersError ? 'Không thể tải dữ liệu danh mục/đơn hàng.' : null;

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>Danh mục & Đơn hàng</h1>
          <p className="page__subtitle">
            Quản lý menu chuẩn hóa toàn hệ thống và can thiệp các đơn gặp sự cố.
          </p>
        </div>
        <div className="page__actions">
          <button className="btn btn--ghost">Đồng bộ POS</button>
          <button className="btn btn--primary" onClick={() => navigate('/catalog-orders/add-category')}>
            Thêm danh mục
          </button>
        </div>
      </div>

      <div className="grid grid--2">
        <div className="panel panel--table">
          <div className="panel__header">
            <div>
              <h3>Danh mục toàn hệ thống</h3>
              <p>{categories.length} danh mục</p>
            </div>
            <button className="btn btn--ghost">Xuất file</button>
          </div>
          {loading ? (
            <div className="panel__empty">Đang tải dữ liệu...</div>
          ) : errorMessage ? (
            <div className="panel__empty error">{errorMessage}</div>
          ) : (
            <>
              <div className="category-grid">
                {categories.map((cat) => (
                  <div key={cat.id} className="category-card">
                    <span className="category-card__icon">{cat.icon || '🍽️'}</span>
                    <div style={{ flex: 1 }}>
                      <p className="category-card__title">{cat.name}</p>
                      <p className="category-card__subtitle">Priority #{cat.priority ?? '-'}</p>
                    </div>
                    <div className="category-card__actions">
                      <button
                        className="btn btn--icon"
                        onClick={() => navigate(`/catalog-orders/categories/${cat.id}/edit`)}
                        title="Chỉnh sửa"
                      >
                        <FiEdit />
                      </button>
                      <button
                        className="btn btn--icon btn--danger"
                        onClick={() => handleDelete(cat.id)}
                        disabled={isDeleting}
                        title="Xóa"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                ))}
                {!categories.length && <p className="panel__empty">Chưa có danh mục nào.</p>}
              </div>
              {error && <div className="panel__empty error" style={{ marginTop: '16px' }}>{error}</div>}
            </>
          )}
        </div>

        <div className="panel">
          <div className="panel__header">
            <div>
              <h3>Đơn hàng gặp vấn đề</h3>
              <p>Ưu tiên SLA có nguy cơ</p>
            </div>
            <button className="btn btn--ghost">Xem bản đồ</button>
          </div>
          {loading ? (
            <div className="panel__empty">Đang tải dữ liệu...</div>
          ) : errorMessage ? (
            <div className="panel__empty error">{errorMessage}</div>
          ) : (
            <div className="table-wrapper">
              <div className="table table--compact">
                <div className="table__head">
                  <div className="table__cell table__cell--id">Mã ĐH</div>
                  <div className="table__cell table__cell--restaurant">Nhà hàng</div>
                  <div className="table__cell table__cell--customer">Khách hàng</div>
                  <div className="table__cell table__cell--amount">Tổng</div>
                  <div className="table__cell table__cell--status">Trạng thái</div>
                  <div className="table__cell table__cell--sla">SLA</div>
                </div>
                {orders.map((order) => (
                  <div key={order.id} className="table__row">
                    <div className="table__cell table__cell--id" title={order.id}>
                      <span className="table__title">{order.id}</span>
                    </div>
                    <div className="table__cell table__cell--restaurant" title={order.restaurantName || 'Nhà hàng'}>
                      <span className="table__title">{order.restaurantName || 'Nhà hàng'}</span>
                    </div>
                    <div className="table__cell table__cell--customer" title={order.customerName || 'Khách hàng'}>
                      <span className="table__title">{order.customerName || 'Khách hàng'}</span>
                    </div>
                    <div className="table__cell table__cell--amount">
                      <span className="table__title">{(order.totalAmount ?? 0).toLocaleString('vi-VN')}đ</span>
                    </div>
                    <div className="table__cell table__cell--status">
                      <StatusBadge status={order.status ?? 'pending'} />
                    </div>
                    <div className="table__cell table__cell--sla">
                      <span>On track</span>
                    </div>
                  </div>
                ))}
                {!orders.length && <div className="panel__empty">Không có đơn hàng nào.</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CatalogOrders;

