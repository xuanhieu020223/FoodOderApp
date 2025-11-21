import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, type AuthError } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { firebaseUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const reason = (location.state as { reason?: string })?.reason;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      const redirectPath = (location.state as { from?: string })?.from || '/';
      navigate(redirectPath, { replace: true });
    } catch (err) {
      console.error('Login error', err);
      const firebaseError = err as AuthError | { code?: string };
      switch (firebaseError.code) {
        case 'auth/invalid-credential':
          setError('Email hoặc mật khẩu không đúng.');
          break;
        case 'auth/user-not-found':
          setError('Không tìm thấy tài khoản.');
          break;
        default:
          setError('Không thể đăng nhập. Vui lòng thử lại.');
          break;
      }
    } finally {
      setLoading(false);
    }
  };

  if (firebaseUser && isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="sidebar__logo">FO</div>
          <div>
            <p>FoodOrder Admin Control</p>
            <span>Đăng nhập tài khoản quản trị</span>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              placeholder="admin@foodorder.vn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Mật khẩu
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {(error || reason === 'no-permission') && (
            <p className="form-error">
              {reason === 'no-permission'
                ? 'Tài khoản của bạn chưa được cấp quyền admin.'
                : error}
            </p>
          )}
          <button type="submit" className="btn btn--primary" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
        <p className="login-hint">
          Bạn cần quyền admin. Liên hệ đội vận hành để được cấp quyền nếu chưa có.
        </p>
      </div>
    </div>
  );
};

export default Login;

