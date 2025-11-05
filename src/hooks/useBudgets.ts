import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Budget } from "@/types";

// Custom hook for managing budgets with localStorage
export const useBudgets = () => {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);

  // Load budgets from localStorage on mount
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`budgets_${user.id}`);
      if (stored) {
        setBudgets(JSON.parse(stored));
      }
    }
  }, [user]);

  // Save budgets to localStorage whenever they change
  const saveBudgets = (newBudgets: Budget[]) => {
    if (user) {
      localStorage.setItem(`budgets_${user.id}`, JSON.stringify(newBudgets));
      setBudgets(newBudgets);
    }
  };

  // Add or update budget
  const setBudget = (budget: Omit<Budget, "id" | "userId" | "createdAt">) => {
    if (!user) return;

    // Check if budget already exists for this category and month
    const existingIndex = budgets.findIndex(
      (b) => b.category === budget.category && b.month === budget.month
    );

    if (existingIndex >= 0) {
      // Update existing budget
      const updated = [...budgets];
      updated[existingIndex] = {
        ...updated[existingIndex],
        amount: budget.amount,
      };
      saveBudgets(updated);
    } else {
      // Add new budget
      const newBudget: Budget = {
        ...budget,
        id: crypto.randomUUID(),
        userId: user.id,
        createdAt: new Date().toISOString(),
      };
      saveBudgets([...budgets, newBudget]);
    }
  };

  // Delete budget
  const deleteBudget = (id: string) => {
    const filtered = budgets.filter((b) => b.id !== id);
    saveBudgets(filtered);
  };

  // Get budget for specific category and month
  const getBudget = (category: string, month: string) => {
    return budgets.find((b) => b.category === category && b.month === month);
  };

  return {
    budgets,
    setBudget,
    deleteBudget,
    getBudget,
  };
};
