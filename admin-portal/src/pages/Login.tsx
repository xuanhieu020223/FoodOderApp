import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import AppLogo from "../assets/AppLogo.png";

const Login = () => {
  const { firebaseUser, isAdmin } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      console.error(err);
      setError("Sai email hoặc mật khẩu");
    } finally {
      setLoading(false);
    }
  };

  if (firebaseUser && isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <style>
        {`
        * {
          box-sizing: border-box;
          font-family: Arial, Helvetica, sans-serif;
        }

        body {
          margin: 0;
        }

        .login-container {
          width: 100vw;
          height: 100vh;
          background: #0d4fd5;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .login-container::before,
        .login-container::after {
          content: "";
          position: absolute;
          width: 320px;
          height: 320px;
          border-radius: 40%;
          background: rgba(255, 255, 255, 0.08);
          filter: blur(40px);
          animation: glowPulse 6s ease-in-out infinite;
        }

        .login-container::before {
          top: -80px;
          left: -60px;
        }

        .login-container::after {
          bottom: -100px;
          right: -40px;
          animation-delay: 3s;
        }

        @keyframes glowPulse {
          0%, 100% { opacity: 0.35; transform: scale(0.95) rotate(0deg); }
          50% { opacity: 0.8; transform: scale(1.05) rotate(4deg); }
        }

        .login-box {
          width: 900px;
          max-width: 95%;
          height: 520px;
          display: flex;
          background: #fff;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        }

        /* LEFT */
        .login-left {
          width: 50%;
          background:
            linear-gradient(rgba(5, 17, 63, 0.35), rgba(3, 48, 120, 0.35)),
            url("https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=2000&q=80")
              center/cover no-repeat;
          filter: contrast(1.05) brightness(1.05);
        }

        /* RIGHT */
        .login-right {
          width: 50%;
          padding: 40px;
        }

        .logo-area {
          text-align: center;
          margin-bottom: 30px;
        }

        .logo {
          width: 70px;
          height: 70px;
          border-radius: 18px;
          margin: 0 auto 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: #0f172a;
        }

        .logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .logo-area h2 {
          margin: 0;
          font-size: 20px;
          color: #0a1f44;
        }

        .logo-area p {
          margin: 0;
          font-size: 12px;
          color: #5a6c8c;
        }

        .form-group {
          margin-bottom: 25px;
        }

        .form-group label {
          font-size: 13px;
          color: #888;
        }

        .form-group input {
          width: 100%;
          border: none;
          border-bottom: 1px solid #ddd;
          padding: 8px 0;
          outline: none;
        }

        .form-group input:focus {
          border-bottom: 2px solid #2563eb;
        }

        .password-wrapper {
          position: relative;
        }

        .password-wrapper input {
          padding-right: 44px;
        }

        .eye-toggle {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1d4ed8;
        }

        .eye-toggle svg {
          width: 20px;
          height: 20px;
          transition: color 0.2s ease;
        }

        .eye-toggle:hover svg {
          color: #0f2a61;
        }

        .login-btn {
          margin-top: 10px;
          width: 100%;
          padding: 14px;
          border: none;
          background: linear-gradient(135deg, #1d4ed8, #2563eb 60%, #60a5fa);
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          border-radius: 10px;
          transition: all 0.3s ease;
          box-shadow: 0 10px 20px rgba(37, 99, 235, 0.35);
        }

        .login-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 26px rgba(37, 99, 235, 0.45);
        }

        .login-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .error {
          font-size: 13px;
          color: red;
          margin-top: 10px;
          text-align: center;
        }

        @media(max-width: 768px) {
          .login-box {
            flex-direction: column;
            height: auto;
          }

          .login-left,
          .login-right {
            width: 100%;
          }

          .login-left {
            height: 200px;
          }
        }
        `}
      </style>

      <div className="login-container">
        <div className="login-box">
          {/* LEFT */}
          <div className="login-left" />

          {/* RIGHT */}
          <div className="login-right">
            {/* LOGO + NAME */}
            <div className="logo-area">
              <div className="logo">
                <img src={AppLogo} alt="Food Order Logo" />
              </div>
              <h2>Food Order Admin</h2>
              <p>Hệ thống quản trị</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  placeholder="admin@foodorder.com"
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group password-wrapper">
                <label>Mật khẩu</label>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  placeholder="********"
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button
                  type="button"
                  className="eye-toggle"
                  aria-label={showPass ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
                      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                      <line x1="3" y1="3" x2="21" y2="21" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              {error && <div className="error">{error}</div>}

              <button className="login-btn" type="submit" disabled={loading}>
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
