export type Language = 'c' | 'java' | 'python';

export type RiskLevel = 'Low' | 'Medium' | 'High';

export type LobbyStatus = 'ACTIVE' | 'LOCKED';

export interface Instructor {
  idNumber: string;
  email: string;
  name: string;
}

export interface Lobby {
  id: string;
  code: string;
  subject: string;
  title: string;
  instructorId: string;
  instructorEmail: string;
  maxStudents: number;
  durationMinutes: number;
  createdAt: string;
  expiresAt: string;
  status: LobbyStatus;
  maxUploadsPerStudent: number; // Always 3
}

export interface Submission {
  id: string;
  lobbyId: string;
  studentId: string; // e.g. "221", "222", "221-0045"
  fileName: string;
  language: Language;
  sourceCode: string;
  status: 'pending' | 'analyzing' | 'done' | 'failed';
  aiProbability: number | null; // 0.0 to 1.0
  riskLevel: RiskLevel | null;
  errorMessage?: string;
  tokenCount: number;
  indicators: string[];
  submittedAt: string;
}

export type Theme = 'dark' | 'light';
