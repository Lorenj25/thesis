import { Instructor, Language, Lobby, Submission } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const TOKEN_KEY = 'codeauthentic_token';

export class ApiRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

interface ApiLobby {
  id: string;
  subject: string;
  title: string;
  language: Language;
  max_students: number;
  status: 'ACTIVE' | 'LOCKED';
  created_at: string;
  expires_at: string;
  shareable_url: string;
  submissions?: ApiSubmission[];
}

interface ApiSubmission {
  id: number;
  lobby_id: string;
  student_id: string;
  file_name: string;
  language: Language;
  status: Submission['status'];
  ai_probability: number | null;
  risk_level: Submission['riskLevel'];
  error_message?: string | null;
  created_at: string;
}

interface ApiPublicLobby {
  active: boolean;
  subject: string;
  title: string;
  language: Language;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (typeof body.detail === 'string') message = body.detail;
    } catch {
      // Use the HTTP status when the server does not return a JSON error.
    }
    throw new ApiRequestError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function mapSubmission(submission: ApiSubmission): Submission {
  return {
    id: String(submission.id),
    lobbyId: submission.lobby_id,
    studentId: submission.student_id,
    fileName: submission.file_name,
    language: submission.language,
    sourceCode: '',
    status: submission.status,
    aiProbability: submission.ai_probability,
    riskLevel: submission.risk_level,
    errorMessage: submission.error_message || undefined,
    tokenCount: 0,
    indicators: [],
    submittedAt: submission.created_at,
  };
}

export function mapLobby(lobby: ApiLobby): Lobby {
  return {
    id: lobby.id,
    code: lobby.id,
    language: lobby.language,
    subject: lobby.subject || lobby.title,
    title: lobby.subject ? lobby.title : '',
    instructorId: '',
    instructorEmail: '',
    maxStudents: lobby.max_students,
    durationMinutes: Math.max(
      1,
      Math.ceil(
        (new Date(lobby.expires_at).getTime() - new Date(lobby.created_at).getTime()) /
          60_000,
      ),
    ),
    createdAt: lobby.created_at,
    expiresAt: lobby.expires_at,
    status: lobby.status,
    maxUploadsPerStudent: 3,
    shareableUrl: lobby.shareable_url,
  };
}

export async function loginInstructor(
  email: string,
  password: string,
): Promise<string> {
  const result = await request<{ access_token: string }>('/auth/login/json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return result.access_token;
}

export async function registerInstructor(
  name: string,
  email: string,
  password: string,
): Promise<void> {
  await request('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
}

export async function resendInstructorVerification(email: string): Promise<void> {
  await request('/auth/resend-verification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

export async function loadInstructorData(token: string): Promise<{
  lobbies: Lobby[];
  submissions: Submission[];
}> {
  const remoteLobbies = await request<ApiLobby[]>('/lobbies', {}, token);
  const details = await Promise.all(
    remoteLobbies.map((lobby) =>
      request<ApiLobby>(`/lobbies/${encodeURIComponent(lobby.id)}`, {}, token),
    ),
  );
  return {
    lobbies: remoteLobbies.map(mapLobby),
    submissions: details.flatMap((lobby) =>
      (lobby.submissions || []).map(mapSubmission),
    ),
  };
}

export async function createLobby(
  token: string,
  subject: string,
  title: string,
  language: Language,
  durationMinutes: number,
  maxStudents: number,
): Promise<Lobby> {
  const lobby = await request<ApiLobby>(
    '/lobbies',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject,
        title,
        language,
        duration_minutes: durationMinutes,
        max_students: maxStudents,
      }),
    },
    token,
  );
  return mapLobby(lobby);
}

export async function setLobbyLocked(
  token: string,
  lobbyId: string,
  locked: boolean,
): Promise<void> {
  await request(
    `/lobbies/${encodeURIComponent(lobbyId)}/${locked ? 'lock' : 'unlock'}`,
    { method: 'POST' },
    token,
  );
}

export async function deleteLobby(token: string, lobbyId: string): Promise<void> {
  await request<void>(
    `/lobbies/${encodeURIComponent(lobbyId)}`,
    { method: 'DELETE' },
    token,
  );
}

export async function getPublicLobby(lobbyId: string): Promise<ApiPublicLobby> {
  return request<ApiPublicLobby>(
    `/public/lobbies/${encodeURIComponent(lobbyId)}/status`,
  );
}

export async function submitLobbyFiles(
  lobbyId: string,
  studentId: string,
  files: Array<{ name: string; content: string }>,
): Promise<void> {
  const body = new FormData();
  body.append('student_id', studentId);
  for (const file of files) {
    body.append('files', new Blob([file.content]), file.name);
  }
  await request(`/lobbies/${encodeURIComponent(lobbyId)}/submit`, {
    method: 'POST',
    body,
  });
}

export function saveAuthSession(instructor: Instructor, token: string): void {
  localStorage.setItem('codeauthentic_instructor', JSON.stringify(instructor));
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthSession(): void {
  localStorage.removeItem('codeauthentic_instructor');
  localStorage.removeItem(TOKEN_KEY);
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getSavedInstructor(): Instructor | null {
  const saved = localStorage.getItem('codeauthentic_instructor');
  if (!saved) return null;
  try {
    return JSON.parse(saved) as Instructor;
  } catch {
    return null;
  }
}
