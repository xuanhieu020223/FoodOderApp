import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/Dashboard';
import UsersManagement from './pages/UsersManagement';
import CatalogOrders from './pages/CatalogOrders';
import Promotions from './pages/Promotions';
import Reports from './pages/Reports';
import Support from './pages/Support';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <div className="app-root">
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="users" element={<UsersManagement />} />
          <Route path="catalog-orders" element={<CatalogOrders />} />
          <Route path="promotions" element={<Promotions />} />
          <Route path="reports" element={<Reports />} />
          <Route path="support" element={<Support />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
