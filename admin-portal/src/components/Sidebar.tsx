import { NavLink } from 'react-router-dom';
import {
  FiBarChart2,
  FiBell,
  FiHeadphones,
  FiHome,
  FiLayers,
  FiPackage,
  FiPercent,
  FiUsers,
  FiTruck,
  FiCoffee,
} from 'react-icons/fi';

const navItems = [
  { label: 'Tổng quan', icon: <FiHome />, path: '/' },
  { label: 'Người dùng', icon: <FiUsers />, path: '/users' },
  { label: 'Nhà hàng', icon: <FiCoffee />, path: '/restaurants' },
  { label: 'Tài xế', icon: <FiTruck />, path: '/drivers' },
  { label: 'Danh mục & Đơn', icon: <FiLayers />, path: '/catalog-orders' },
  { label: 'Khuyến mãi', icon: <FiPercent />, path: '/promotions' },
  { label: 'Thông báo', icon: <FiBell />, path: '/notifications' },
  { label: 'Báo cáo', icon: <FiBarChart2 />, path: '/reports' },
  { label: 'Hỗ trợ', icon: <FiHeadphones />, path: '/support' },
];

const quickActions = [
  { label: 'Đơn cần xử lý', value: '32', icon: <FiPackage /> },
  { label: 'Ticket SLA < 2h', value: '12', icon: <FiHeadphones /> },
];

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__logo">FO</div>
        <div>
          <p className="sidebar__title">FoodOrder Control</p>
          <span className="sidebar__badge">Enterprise</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
            }
          >
            <span className="sidebar__icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__section">
        <p className="sidebar__section-title">Tác vụ nhanh</p>
        <div className="sidebar__quick-grid">
          {quickActions.map((action) => (
            <button key={action.label} className="quick-card">
              <span className="quick-card__icon">{action.icon}</span>
              <div>
                <p className="quick-card__value">{action.value}</p>
                <p className="quick-card__label">{action.label}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

