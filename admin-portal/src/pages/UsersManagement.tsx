import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FiEdit, FiFilter, FiLock, FiRefreshCw, FiSearch, FiTrash2, FiUnlock, FiEye } from 'react-icons/fi';
import StatusBadge from '../components/StatusBadge';
import type { UserAccount, UserRole } from '../types';
import { deleteUser, fetchUsersWithOrderMeta, toggleUserStatus } from '../services/userService';

const roleFilters: { label: string; value: 'all' | UserRole }[] = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Khách hàng', value: 'customer' },
  { label: 'Nhà hàng', value: 'restaurant' },
  { label: 'Tài xế', value: 'driver' },
];

const statusFilters: { label: string; value: 'all' | UserAccount['status'] }[] = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Locked', value: 'locked' },
  { label: 'Pending', value: 'pending' },
];

const usersQueryKey = ['users', 'list'];

const UsersManagement = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | UserAccount['status']>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
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

  const { mutateAsync: handleDelete, isPending: isDeleting } = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersQueryKey });
      setError(null);
    },
    onError: () => {
      setError('Không thể xóa tài khoản.');
    },
  });

  const filteredUsers = useMemo(() => {
    let result = records;

    // Filter by role
    if (filter !== 'all') {
      result = result.filter((user) => user.role === filter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter((user) => user.status === statusFilter);
    }

    // Filter by city
    if (cityFilter !== 'all') {
      result = result.filter((user) => user.city?.toLowerCase() === cityFilter.toLowerCase());
    }

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (user) =>
          user.name?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query) ||
          user.phone?.includes(query) ||
          user.id.toLowerCase().includes(query),
      );
    }

    return result;
  }, [records, filter, statusFilter, cityFilter, searchQuery]);

  const uniqueCities = useMemo(() => {
    const cities = new Set<string>();
    records.forEach((user) => {
      if (user.city) cities.add(user.city);
    });
    return Array.from(cities).sort();
  }, [records]);

  const handleToggle = async (user: UserAccount) => {
    setError(null);
    await mutateStatus({ id: user.id, currentStatus: user.status });
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tài khoản này?')) {
      await handleDelete(id);
    }
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
          <button
            className={`btn btn--ghost ${showAdvancedFilters ? 'btn--active' : ''}`}
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            <FiFilter />
            Bộ lọc nâng cao
          </button>
          <button className="btn btn--primary" onClick={() => navigate('/users/add')}>
            Thêm tài khoản
          </button>
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

      {showAdvancedFilters && (
        <div className="panel panel--filters">
          <div className="filters-grid">
            <div className="form-group">
              <label>Tìm kiếm</label>
              <div className="search-input">
                <FiSearch />
                <input
                  type="text"
                  placeholder="Tìm theo tên, email, số điện thoại, mã..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Lọc theo trạng thái</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
                {statusFilters.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Lọc theo thành phố</label>
              <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
                <option value="all">Tất cả thành phố</option>
                {uniqueCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="panel panel--table">
        <div className="panel__header">
          <div>
            <h3>Danh sách tài khoản</h3>
            <p>{filteredUsers.length} bản ghi</p>
          </div>
        </div>

        {isLoading ? (
          <div className="panel__empty">Đang tải dữ liệu...</div>
        ) : displayError ? (
          <div className="panel__empty error">{displayError}</div>
        ) : (
          <div className="table-wrapper">
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
                  <span className="table__cell">{user.id}</span>
                  <span className="table__cell">
                    <p className="table__title">{user.name}</p>
                    <p className="table__subtitle">{user.email}</p>
                  </span>
                  <span className="table__cell">
                    <span className={`tag tag--${user.role}`}>{user.role}</span>
                  </span>
                  <span className="table__cell">
                    <p>{user.orders?.toLocaleString('vi-VN') || '-'}</p>
                    <p className="table__subtitle">Đơn</p>
                  </span>
                  <span className="table__cell">
                    <StatusBadge status={user.status} />
                  </span>
                  <span className="table__cell table__actions">
                    <button
                      className="btn btn--icon"
                      onClick={() => navigate(`/users/${user.id}`)}
                      title="Xem chi tiết"
                    >
                      <FiEye />
                    </button>
                    <button
                      className="btn btn--icon"
                      onClick={() => navigate(`/users/${user.id}/edit`)}
                      title="Chỉnh sửa"
                    >
                      <FiEdit />
                    </button>
                    <button
                      className="btn btn--icon"
                      onClick={() => handleToggle(user)}
                      disabled={isMutating}
                      title={user.status === 'locked' ? 'Mở khóa' : 'Khóa'}
                    >
                      {user.status === 'locked' ? <FiUnlock /> : <FiLock />}
                    </button>
                    <button
                      className="btn btn--icon btn--danger"
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={isDeleting}
                      title="Xóa"
                    >
                      <FiTrash2 />
                    </button>
                  </span>
                </div>
              ))}
              {!filteredUsers.length && <div className="panel__empty">Không có tài khoản phù hợp.</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersManagement;
