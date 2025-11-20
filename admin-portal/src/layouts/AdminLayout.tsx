import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const AdminLayout = () => {
  return (
    <div className="layout">
      <Sidebar />
      <div className="layout__content">
        <Topbar />
        <main className="layout__main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

