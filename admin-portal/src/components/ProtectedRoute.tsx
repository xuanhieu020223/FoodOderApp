import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { firebaseUser, isAdmin, loading, error } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="spinner" />
        <p>Đang xác thực...</p>
      </div>
    );
  }

  if (error || !isAdmin) {
    return (
      <Navigate
        to="/login"
        state={{
          from: location.pathname,
          reason: error ? 'profile-error' : 'no-permission',
        }}
        replace
      />
    );
  }

  if (!firebaseUser) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

