import type { User } from '../lib/api';

const MODES: Array<{ id: User['uiMode']; label: string; hint: string }> = [
  { id: 'co_ban', label: 'Cơ bản', hint: 'Luồng đơn giản: soạn KHDH nhanh, ít tuỳ chọn' },
  { id: 'nang_cao', label: 'Nâng cao', hint: 'Thêm Worksheet, Game, chỉnh tay từng khối nội dung' },
  { id: 'chuyen_gia', label: 'Chuyên gia', hint: 'Đầy đủ: Blueprint, NLS Map, Video AI, thống kê chất lượng' }
];

export default function ModeSidebar({
  mode,
  onChange
}: {
  mode: User['uiMode'];
  onChange: (mode: User['uiMode']) => void;
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-title">Chế độ làm việc</div>
      {MODES.map((m) => (
        <button
          key={m.id}
          className={`sidebar-mode-btn${mode === m.id ? ' active' : ''}`}
          onClick={() => onChange(m.id)}
        >
          <div className="sidebar-mode-label">{m.label}</div>
          <div className="sidebar-mode-hint">{m.hint}</div>
        </button>
      ))}
      <div className="sidebar-note muted">
        Các module tương ứng từng chế độ (Blueprint, NLS Map, Worksheet, Game, Video AI...) đang
        được xây dựng theo lộ trình milestone — xem <code>IMPLEMENTATION_REPORT.md</code> để biết
        phần nào đã hoàn thiện, phần nào còn giới hạn.
      </div>
    </aside>
  );
}
