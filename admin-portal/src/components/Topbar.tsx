import { FiBell, FiCalendar, FiLogOut, FiSearch, FiUser } from 'react-icons/fi';
import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

const Topbar = () => {
  const { profile, signOutUser } = useAuth();

  const todayLabel = useMemo(() => {
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  }, []);

  const initials = useMemo(() => {
    const source = profile?.name || profile?.username || profile?.email || 'AD';
    return source
      .split(' ')
      .map((s) => s[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }, [profile]);

  return (
    <header className="topbar">
      <div className="topbar__left">
        <div className="topbar__date">
          <FiCalendar />
          <span>{todayLabel}</span>
        </div>
        <div className="topbar__search">
          <FiSearch />
          <input type="search" placeholder="Tìm kiếm người dùng, đơn hàng, ticket..." />
        </div>
      </div>

      <div className="topbar__actions">
        <button className="topbar__button" title="Thông báo">
          <FiBell />
          <span className="topbar__dot" />
        </button>
        <button className="topbar__button" title="Đăng xuất" onClick={() => signOutUser()}>
          <FiLogOut />
        </button>
        <div className="topbar__profile">
          <div className="avatar">{initials}</div>
          <div>
            <p className="topbar__name">{profile?.name || profile?.username || profile?.email}</p>
            <span>{profile?.role === 'admin' ? 'Super Admin' : profile?.role ?? 'Admin'}</span>
          </div>
          <FiUser className="topbar__chevron" />
        </div>
      </div>
    </header>
  );
};

export default Topbar;

