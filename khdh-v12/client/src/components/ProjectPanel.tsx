import { useEffect, useState } from 'react';
import { SUBJECTS, GRADES } from '../lib/constants';
import { api, type Project, type SourceInfo, type SourceSlot } from '../lib/api';
import SourceSlotCard from './SourceSlotCard';

const SLOTS: SourceSlot[] = ['pl1', 'sgk', 'khdh_cu', 'form_to'];

export default function ProjectPanel() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newSubject, setNewSubject] = useState(SUBJECTS[0]);
  const [newGrade, setNewGrade] = useState(GRADES[0]);
  const [creating, setCreating] = useState(false);

  async function refreshProjects() {
    const list = await api.listProjects();
    setProjects(list);
    return list;
  }

  async function refreshActive(id: string) {
    const detail = await api.getProject(id);
    setActiveProject(detail.project);
    setSources(detail.sources);
  }

  useEffect(() => {
    (async () => {
      try {
        const list = await refreshProjects();
        if (list.length > 0) {
          setActiveId(list[0].id);
          await refreshActive(list[0].id);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleCreate() {
    if (!newName.trim()) {
      setError('Vui lòng nhập tên dự án.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const id = await api.createProject(newName.trim(), newSubject, newGrade);
      setNewName('');
      await refreshProjects();
      setActiveId(id);
      await refreshActive(id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleSelect(id: string) {
    setActiveId(id);
    setError(null);
    try {
      await refreshActive(id);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleDeleteProject(id: string) {
    await api.deleteProject(id);
    const list = await refreshProjects();
    if (activeId === id) {
      if (list.length > 0) {
        setActiveId(list[0].id);
        await refreshActive(list[0].id);
      } else {
        setActiveId(null);
        setActiveProject(null);
        setSources([]);
      }
    }
  }

  if (loading) return <div className="card">Đang tải danh sách dự án...</div>;

  const requiredReady = sources.some((s) => s.slot === 'pl1') && sources.some((s) => s.slot === 'sgk');

  return (
    <>
      <div className="card">
        <h3>Dự án của bạn</h3>
        {error && <div className="error-box">{error}</div>}

        {projects.length > 0 && (
          <div className="project-list">
            {projects.map((p) => (
              <div key={p.id} className={`project-list-item${p.id === activeId ? ' active' : ''}`}>
                <button className="project-list-select" onClick={() => handleSelect(p.id)}>
                  <strong>{p.name}</strong>
                  <span className="muted"> · {p.subject || '—'} · Lớp {p.grade || '—'}</span>
                </button>
                <button className="btn btn-secondary" onClick={() => handleDeleteProject(p.id)}>
                  Xoá
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="section-title">Tạo dự án mới</div>
        <div className="grid-2" style={{ marginBottom: 10 }}>
          <div>
            <label className="muted">Môn học</label>
            <select value={newSubject} onChange={(e) => setNewSubject(e.target.value)}>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="muted">Khối lớp</label>
            <select value={newGrade} onChange={(e) => setNewGrade(e.target.value)}>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  Lớp {g}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Tên dự án, ví dụ: Toán 10 - Chương I"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" disabled={creating} onClick={handleCreate}>
            {creating ? 'Đang tạo...' : '+ Tạo dự án'}
          </button>
        </div>
      </div>

      {activeProject && (
        <div className="card">
          <h3>Nguồn dữ liệu · {activeProject.name}</h3>
          <p className="muted">
            Nạp đủ 2 nguồn bắt buộc (Phụ lục I, SGK) để có thể soạn KHDH ở bước tiếp theo. KHDH cũ
            và Form tổ là tuỳ chọn, giúp AI bám sát phong cách/mẫu của tổ chuyên môn hơn.
          </p>
          <div className="source-slot-grid">
            {SLOTS.map((slot) => (
              <SourceSlotCard
                key={slot}
                projectId={activeProject.id}
                slot={slot}
                source={sources.find((s) => s.slot === slot)}
                onChanged={() => refreshActive(activeProject.id)}
              />
            ))}
          </div>
          {requiredReady ? (
            <div className="info-box" style={{ marginTop: 14 }}>
              Đã đủ 2 nguồn bắt buộc. Bước soạn Lesson Catalog / Blueprint / KHDH sẽ được xây dựng ở
              milestone tiếp theo.
            </div>
          ) : (
            <div className="warn-box" style={{ marginTop: 14 }}>
              Cần nạp đủ Phụ lục I (.docx) và SGK (.pdf) trước khi tiếp tục.
            </div>
          )}
        </div>
      )}
    </>
  );
}
