import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";

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
          background: #4fa3ff;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .login-box {
          width: 900px;
          max-width: 95%;
          height: 520px;
          display: flex;
          background: white;
          box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        }

        /* LEFT */
        .login-left {
          width: 50%;
          background: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)),
            url("https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80") center/cover no-repeat;
          color: white;
          padding: 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .circle {
          width: 30px;
          height: 30px;
          background: white;
          border-radius: 50%;
          margin-bottom: 20px;
        }

        .login-left h2 {
          font-size: 30px;
          margin-bottom: 10px;
        }

        .login-left p {
          font-size: 14px;
          opacity: 0.9;
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
          width: 60px;
          height: 60px;
          border-radius: 16px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 22px;
          font-weight: bold;
          margin: 0 auto 10px;
        }

        .logo-area h2 {
          margin: 0;
          font-size: 20px;
          color: #222;
        }

        .logo-area p {
          margin: 0;
          font-size: 12px;
          color: #777;
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
          border-bottom: 1px solid #3b82f6;
        }

        .password-wrapper {
          position: relative;
        }

        .toggle-pass {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          font-size: 12px;
          cursor: pointer;
          color: #3b82f6;
          user-select: none;
        }

        .login-btn {
          margin-top: 10px;
          width: 100%;
          padding: 12px;
          border: none;
          background: #3b82f6;
          color: white;
          font-size: 14px;
          cursor: pointer;
        }

        .login-btn:hover {
          background: #2563eb;
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
          <div className="login-left">
            <div className="circle"></div>
            <h2>Food Delivery</h2>
            <p>Fast - Fresh - Simple</p>
          </div>

          {/* RIGHT */}
          <div className="login-right">
            {/* LOGO + NAME */}
            <div className="logo-area">
              <div className="logo">FO</div>
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

                <div
                  className="toggle-pass"
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? "Ẩn" : "Hiện"}
                </div>
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
