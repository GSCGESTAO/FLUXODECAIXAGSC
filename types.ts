
export enum TransactionType {
  ENTRADA = 'Entrada',
  SAIDA = 'Saída'
}

export enum TransactionStatus {
  PENDENTE = 'Pendente',
  APROVADO = 'Aprovado',
  REJEITADO = 'Rejeitado'
}

export interface UserProfile {
  email: string;
  name: string;
  picture: string;
  token: string;
}

export type UserRole = 'Admin' | 'Financeiro' | 'Convidado';

export interface AuthorizedUser {
  id?: string;
  email: string;
  role: UserRole;
}

export interface Establishment {
  id: string;
  name: string;
  responsibleEmail: string;
}

export interface Transaction {
  id: string;
  date: string; 
  timestamp: string;
  establishmentId: string;
  type: TransactionType;
  amount: number;
  description: string;
  observations?: string;
  status: TransactionStatus;
  user: string;
  isSynced?: boolean;
  isEdited?: boolean;
}

export interface AppSettings {
  readyDescriptions: string[];
  groupAIds: string[];
  groupBIds: string[];
  showNotes: boolean;
  showAI: boolean;
  showChart: boolean;
  pushNotifications: boolean;
  weeklyEmailSummary: boolean;
}

export interface AnomalyCheckResult {
  isAnomalous: boolean;
  reason: string;
}
