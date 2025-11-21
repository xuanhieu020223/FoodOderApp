import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FiFilter, FiLock, FiRefreshCw, FiUnlock } from 'react-icons/fi';
import StatusBadge from '../components/StatusBadge';
import type { UserAccount, UserRole } from '../types';
import { fetchUsersWithOrderMeta, toggleUserStatus } from '../services/userService';

const roleFilters: { label: string; value: 'all' | UserRole }[] = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Khách hàng', value: 'customer' },
  { label: 'Nhà hàng', value: 'restaurant' },
  { label: 'Tài xế', value: 'driver' },
];

const usersQueryKey = ['users', 'list'];

const UsersManagement = () => {
  const [filter, setFilter] = useState<'all' | UserRole>('all');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    data: records = [],
    isLoading,
    isFetching,
    refetch,
    error: queryError,
  } = useQuery({
    queryKey: usersQueryKey,
    queryFn: fetchUsersWithOrderMeta,
    staleTime: 1000 * 60,
  });

  const { mutateAsync: mutateStatus, isPending: isMutating } = useMutation({
    mutationFn: toggleUserStatus,
    onMutate: async ({ id, currentStatus }) => {
      await queryClient.cancelQueries({ queryKey: usersQueryKey });
      const previous = queryClient.getQueryData<UserAccount[]>(usersQueryKey);
      queryClient.setQueryData<UserAccount[]>(usersQueryKey, (old) =>
        (old ?? []).map((record) => (record.id === id ? { ...record, status: currentStatus === 'locked' ? 'active' : 'locked' } : record)),
      );
      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(usersQueryKey, context.previous);
      }
      setError('Không thể cập nhật trạng thái tài khoản.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: usersQueryKey });
    },
  });

  const filteredUsers = useMemo(() => {
    if (filter === 'all') return records;
    return records.filter((user) => user.role === filter);
  }, [records, filter]);

  const handleToggle = async (user: UserAccount) => {
    setError(null);
    await mutateStatus({ id: user.id, currentStatus: user.status });
  };

  const displayError = error ?? (queryError ? 'Không thể tải danh sách người dùng.' : null);

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>Quản lý người dùng</h1>
          <p className="page__subtitle">
            Kiểm soát khách hàng, nhà hàng và tài xế trên toàn hệ sinh thái.
          </p>
        </div>
        <div className="page__actions">
          <button className="btn btn--ghost" onClick={() => refetch()} disabled={isFetching}>
            <FiRefreshCw />
            Làm mới
          </button>
          <button className="btn btn--ghost">
            <FiFilter />
            Bộ lọc nâng cao
          </button>
          <button className="btn btn--primary">Thêm tài khoản</button>
        </div>
      </div>

      <div className="tabs">
        {roleFilters.map((option) => (
          <button
            key={option.value}
            className={`tabs__item ${filter === option.value ? 'tabs__item--active' : ''}`}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="panel panel--table">
        <div className="panel__header">
          <div>
            <h3>Danh sách tài khoản</h3>
            <p>{filteredUsers.length} bản ghi</p>
          </div>
          <div className="panel__filters">
            <select>
              <option>Tất cả thành phố</option>
              <option>Hà Nội</option>
              <option>TP.HCM</option>
            </select>
            <select>
              <option>Trạng thái</option>
              <option>Active</option>
              <option>Locked</option>
              <option>Pending</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="panel__empty">Đang tải dữ liệu...</div>
        ) : displayError ? (
          <div className="panel__empty error">{displayError}</div>
        ) : (
          <div className="table">
            <div className="table__head">
              <span>Mã</span>
              <span>Tên hiển thị</span>
              <span>Vai trò</span>
              <span>Hoạt động</span>
              <span>Trạng thái</span>
              <span>Hành động</span>
            </div>
            {filteredUsers.map((user) => (
              <div key={user.id} className="table__row">
                <span>{user.id}</span>
                <span>
                  <p className="table__title">{user.name}</p>
                  <p className="table__subtitle">{user.email}</p>
                </span>
                <span className={`tag tag--${user.role}`}>{user.role}</span>
                <span>
                  <p>{user.orders?.toLocaleString('vi-VN') || '-'}</p>
                  <p className="table__subtitle">Đơn</p>
                </span>
                <span>
                  <StatusBadge status={user.status} />
                </span>
                <span>
                  <button className="btn btn--ghost" onClick={() => handleToggle(user)} disabled={isMutating}>
                    {user.status === 'locked' ? (
                      <>
                        <FiUnlock /> Mở khóa
                      </>
                    ) : (
                      <>
                        <FiLock /> Khóa
                      </>
                    )}
                  </button>
                </span>
              </div>
            ))}
            {!filteredUsers.length && <div className="panel__empty">Không có tài khoản phù hợp.</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersManagement;

