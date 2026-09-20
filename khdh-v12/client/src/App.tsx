import { useEffect, useState } from 'react';
import { api, type User } from './lib/api';
import GoogleLoginButton from './components/GoogleLoginButton';
import ApiKeyManager from './components/ApiKeyManager';
import ModeSidebar from './components/ModeSidebar';
import ProjectPanel from './components/ProjectPanel';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function handleCredential(credential: string) {
    setError(null);
    try {
      const u = await api.loginWithGoogle(credential);
      setUser(u);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleLogout() {
    await api.logout();
    setUser(null);
  }

  async function handleModeChange(mode: User['uiMode']) {
    if (!user) return;
    setUser({ ...user, uiMode: mode });
    try {
      await api.setUiMode(mode);
    } catch {
      /* không chặn UI nếu lưu chế độ thất bại tạm thời */
    }
  }

  if (loading) return <div className="center-screen">Đang tải...</div>;

  if (!user) {
    return (
      <div className="center-screen">
        <div className="login-card">
          <h1>KHDH V12</h1>
          <p className="muted">Nền tảng soạn giáo án mở rộng — đăng nhập bằng tài khoản Google trường bạn.</p>
          {error && <div className="error-box">{error}</div>}
          <GoogleLoginButton onCredential={handleCredential} />
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <ModeSidebar mode={user.uiMode} onChange={handleModeChange} />
      <main className="main-content">
        <header className="topbar">
          <div>
            <strong>{user.name || user.email}</strong>
            <span className="muted"> · {user.email}</span>
          </div>
          <button className="btn btn-secondary" onClick={handleLogout}>
            Đăng xuất
          </button>
        </header>

        <ApiKeyManager />
        <ProjectPanel />
      </main>
    </div>
  );
}
