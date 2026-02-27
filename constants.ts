
import type { User } from './types';
import { Role } from './types';

export enum AppView {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  ENTREPRENEURS = 'ENTREPRENEURS',
  ADD_ENTREPRENEUR = 'ADD_ENTREPRENEUR',
  EDIT_ENTREPRENEUR = 'EDIT_ENTREPRENEUR',
  ENTREPRENEUR_DASHBOARD = 'ENTREPRENEUR_DASHBOARD',
  TRANSACTIONS = 'TRANSACTIONS', // Combined view for adding and listing
  REPORTS = 'REPORTS',
  GROWTH_HUB = 'GROWTH_HUB',
  USER_MANAGEMENT = 'USER_MANAGEMENT',
}

export enum TransactionType {
  INCOME = 'Income',
  EXPENSE = 'Expense',
}

export enum PaymentMethod {
  CASH = 'Cash',
  MOMO = 'MoMo',
  BANK = 'Bank Transfer',
  CREDIT = 'Credit',
}

export enum PaidStatus {
  FULL = 'Full',
  PARTIAL = 'Partial',
  PENDING = 'Pending',
}
export const GENAI_MODEL_NAME = 'gemini-2.5-flash';

// Simulated user database for login. In a real app, this would be in a secure database.
export const USERS: User[] = [
  { id: 'user-super', username: 'superadmin', password: 'password123', role: Role.SUPER_ADMIN },
  { id: 'user-admin-1', username: 'john.doe', password: 'password123', role: Role.ADMIN },
  { id: 'user-staff-1', username: 'jane.smith', password: 'password123', role: Role.STAFF, assignedEntrepreneurIds: [] },
  { id: 'user-staff-2', username: 'peter.jones', password: 'password123', role: Role.STAFF, assignedEntrepreneurIds: [] },
];
