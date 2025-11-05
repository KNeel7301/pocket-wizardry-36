// Type definitions for the finance tracker app

export interface Expense {
  id: string;
  userId: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  category: string;
  amount: number;
  month: string; // Format: YYYY-MM
  createdAt: string;
}

export const EXPENSE_CATEGORIES = [
  "Food & Dining",
  "Transportation",
  "Shopping",
  "Entertainment",
  "Bills & Utilities",
  "Healthcare",
  "Education",
  "Travel",
  "Other",
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];
