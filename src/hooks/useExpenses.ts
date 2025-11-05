import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Expense } from "@/types";

// Custom hook for managing expenses with localStorage
export const useExpenses = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Load expenses from localStorage on mount
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`expenses_${user.id}`);
      if (stored) {
        setExpenses(JSON.parse(stored));
      }
    }
  }, [user]);

  // Save expenses to localStorage whenever they change
  const saveExpenses = (newExpenses: Expense[]) => {
    if (user) {
      localStorage.setItem(`expenses_${user.id}`, JSON.stringify(newExpenses));
      setExpenses(newExpenses);
    }
  };

  // Add new expense
  const addExpense = (expense: Omit<Expense, "id" | "userId" | "createdAt">) => {
    if (!user) return;

    const newExpense: Expense = {
      ...expense,
      id: crypto.randomUUID(),
      userId: user.id,
      createdAt: new Date().toISOString(),
    };

    saveExpenses([...expenses, newExpense]);
  };

  // Update existing expense
  const updateExpense = (id: string, updates: Partial<Expense>) => {
    const updated = expenses.map((exp) =>
      exp.id === id ? { ...exp, ...updates } : exp
    );
    saveExpenses(updated);
  };

  // Delete expense
  const deleteExpense = (id: string) => {
    const filtered = expenses.filter((exp) => exp.id !== id);
    saveExpenses(filtered);
  };

  return {
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
  };
};
