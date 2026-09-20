export interface User {
  email: string;
  name: string;
  picture: string;
  uiMode: 'co_ban' | 'nang_cao' | 'chuyen_gia';
}

export interface Project {
  id: string;
  name: string;
  subject: string;
  grade: string;
  created_at: string;
  updated_at: string;
}

export type SourceSlot = 'pl1' | 'sgk' | 'khdh_cu' | 'form_to';

export interface SourceInfo {
  slot: SourceSlot;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  parsed: any;
  warnings: string[];
}

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: `Máy chủ trả về phản hồi không hợp lệ (HTTP ${res.status}).` };
  }
}

async function request(path: string, init?: RequestInit) {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: init?.body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
    ...init
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || `Yêu cầu thất bại (HTTP ${res.status}).`);
  return data;
}

export const api = {
  me: () => request('/auth/me').then((d) => d.user as User),
  loginWithGoogle: (credential: string) =>
    request('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }).then((d) => d.user as User),
  logout: () => request('/auth/logout', { method: 'POST' }),
  setUiMode: (mode: User['uiMode']) => request('/auth/ui-mode', { method: 'POST', body: JSON.stringify({ mode }) }),

  listApiKeys: () => request('/api-keys').then((d) => d.keys as Array<{ provider: string; last4: string; validated_at: string | null }>),
  saveApiKey: (provider: 'anthropic' | 'google', apiKey: string) =>
    request('/api-keys', { method: 'POST', body: JSON.stringify({ provider, apiKey }) }),
  deleteApiKey: (provider: 'anthropic' | 'google') => request(`/api-keys/${provider}`, { method: 'DELETE' }),

  listProjects: () => request('/projects').then((d) => d.projects as Project[]),
  createProject: (name: string, subject: string, grade: string) =>
    request('/projects', { method: 'POST', body: JSON.stringify({ name, subject, grade }) }).then((d) => d.id as string),
  getProject: (id: string) => request(`/projects/${id}`) as Promise<{ project: Project; sources: SourceInfo[] }>,
  deleteProject: (id: string) => request(`/projects/${id}`, { method: 'DELETE' }),

  uploadSource: (projectId: string, slot: SourceSlot, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/sources/${projectId}/${slot}`, { method: 'POST', body: formData });
  },
  deleteSource: (projectId: string, slot: SourceSlot) => request(`/sources/${projectId}/${slot}`, { method: 'DELETE' })
};
