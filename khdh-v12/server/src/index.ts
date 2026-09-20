import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import apiKeysRouter from './routes/apiKeys.js';
import projectsRouter from './routes/projects.js';
import sourcesRouter from './routes/sources.js';

const REQUIRED_ENV = ['SESSION_SECRET', 'API_KEY_ENCRYPTION_SECRET'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(
    `[FATAL] Thieu bien moi truong bat buoc: ${missing.join(', ')}.\n` +
      'Xem huong dan sinh gia tri trong .env.example / RUN_LOCAL.md. Server khong khoi dong ' +
      'de tranh luu du lieu (session/API key) o trang thai khong an toan.'
  );
  process.exit(1);
}
if (!process.env.GOOGLE_CLIENT_ID) {
  console.warn(
    '[WARN] GOOGLE_CLIENT_ID chua duoc cau hinh - dang nhap Google se khong hoat dong cho toi khi ' +
      'bien nay duoc dien (xem .env.example muc Google OAuth).'
  );
}

const app = express();
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true
  })
);
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'khdh-v12-server' }));
app.use('/api/auth', authRouter);
app.use('/api/api-keys', apiKeysRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/sources', sourcesRouter);

app.use((req, res) => {
  res.status(404).json({ error: `Không tìm thấy endpoint ${req.method} ${req.path}.` });
});

// Bo bat loi toan cuc: bat ky loi khong luong truoc nao (vi du loi SQLite,
// loi parse file) deu tra ve JSON gon gang thay vi trang HTML stack-trace
// mac dinh cua Express, vua an toan hon (khong lo cau truc noi bo) vua de
// client xu ly nhat quan bang safeJson().
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Loi khong xu ly:', err?.message ?? err);
  res.status(500).json({ error: 'Có lỗi hệ thống không mong đợi. Vui lòng thử lại.' });
});

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => {
  console.log(`KHDH V12 server dang chay tai http://localhost:${port}`);
});
