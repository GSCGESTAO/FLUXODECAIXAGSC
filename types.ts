
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

export interface AuthorizedUser {
  email: string;
  role: 'Admin' | 'Operador' | 'Visualizador';
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
}

export interface AnomalyCheckResult {
  isAnomalous: boolean;
  reason: string;
}
