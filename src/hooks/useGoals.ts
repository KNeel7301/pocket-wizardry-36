import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Goal } from "@/types";

export const useGoals = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`goals_${user.id}`);
      if (stored) {
        setGoals(JSON.parse(stored));
      }
    }
  }, [user]);

  const saveGoals = (newGoals: Goal[]) => {
    if (user) {
      localStorage.setItem(`goals_${user.id}`, JSON.stringify(newGoals));
      setGoals(newGoals);
    }
  };

  const addGoal = (goal: Omit<Goal, "id" | "userId" | "createdAt">) => {
    if (!user) return;

    const newGoal: Goal = {
      ...goal,
      id: crypto.randomUUID(),
      userId: user.id,
      createdAt: new Date().toISOString(),
    };

    saveGoals([...goals, newGoal]);
  };

  const updateGoal = (id: string, updates: Partial<Goal>) => {
    const updated = goals.map((goal) =>
      goal.id === id ? { ...goal, ...updates } : goal
    );
    saveGoals(updated);
  };

  const deleteGoal = (id: string) => {
    const filtered = goals.filter((goal) => goal.id !== id);
    saveGoals(filtered);
  };

  const addProgress = (id: string, amount: number) => {
    const goal = goals.find((g) => g.id === id);
    if (goal) {
      updateGoal(id, { currentAmount: goal.currentAmount + amount });
    }
  };

  return {
    goals,
    addGoal,
    updateGoal,
    deleteGoal,
    addProgress,
  };
};
