import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import './App.css';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/Dashboard';
import UsersManagement from './pages/UsersManagement';
import AddUser from './pages/AddUser';
import EditUser from './pages/EditUser';
import UserDetail from './pages/UserDetail';
import CatalogOrders from './pages/CatalogOrders';
import AddCategory from './pages/AddCategory';
import EditCategory from './pages/EditCategory';
import Promotions from './pages/Promotions';
import CreatePromotion from './pages/CreatePromotion';
import EditPromotion from './pages/EditPromotion';
import Reports from './pages/Reports';
import Support from './pages/Support';
import RestaurantManagement from './pages/RestaurantManagement';
import RestaurantDetail from './pages/RestaurantDetail';
import DriverManagement from './pages/DriverManagement';
import DriverDetail from './pages/DriverDetail';
import NotificationManagement from './pages/NotificationManagement';
import CreateNotification from './pages/CreateNotification';
import EditNotification from './pages/EditNotification';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

function App() {
  const { firebaseUser, isAdmin, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (location.pathname === '/login') return;
    if (!firebaseUser || !isAdmin) {
      navigate('/login', { replace: true, state: { from: location.pathname } });
    }
  }, [firebaseUser, isAdmin, loading, location.pathname, navigate]);

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
          <Route path="users/add" element={<AddUser />} />
          <Route path="users/:id" element={<UserDetail />} />
          <Route path="users/:id/edit" element={<EditUser />} />
          <Route path="catalog-orders" element={<CatalogOrders />} />
          <Route path="catalog-orders/add-category" element={<AddCategory />} />
          <Route path="catalog-orders/categories/:id/edit" element={<EditCategory />} />
          <Route path="promotions" element={<Promotions />} />
          <Route path="promotions/create" element={<CreatePromotion />} />
          <Route path="promotions/:id/edit" element={<EditPromotion />} />
          <Route path="restaurants" element={<RestaurantManagement />} />
          <Route path="restaurants/:id" element={<RestaurantDetail />} />
          <Route path="drivers" element={<DriverManagement />} />
          <Route path="drivers/:id" element={<DriverDetail />} />
          <Route path="notifications" element={<NotificationManagement />} />
          <Route path="notifications/create" element={<CreateNotification />} />
          <Route path="notifications/:id/edit" element={<EditNotification />} />
          <Route path="reports" element={<Reports />} />
          <Route path="support" element={<Support />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route
          path="*"
          element={<Navigate to={firebaseUser && isAdmin ? '/' : '/login'} replace />}
        />
      </Routes>
    </div>
  );
}

export default App;
