import DashboardApp from '@/components/DashboardApp';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <div>
      <div className="topbar">
        <div className="brand">
          Trợ lý số KHDH <span className="badge">Chuẩn CV 5512</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              background: '#e6fffa',
              color: '#234e52',
              border: '1px solid #b2f5ea',
              padding: '4px 12px',
              borderRadius: 16,
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>🔒</span>
            <span>Không gian riêng tư · Dữ liệu tự hủy khi đóng tab</span>
          </span>
        </div>
      </div>
      <div className="container">
        <DashboardApp />
      </div>
    </div>
  );
}
