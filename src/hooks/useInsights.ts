import { useMemo } from "react";
import { Expense, Budget } from "@/types";

interface SpendingTrend {
  category: string;
  currentMonth: number;
  previousMonth: number;
  percentageChange: number;
  trend: "increasing" | "decreasing" | "stable";
}

interface Insight {
  id: string;
  type: "warning" | "success" | "info" | "prediction";
  title: string;
  description: string;
  category?: string;
  priority: "high" | "medium" | "low";
}

interface ForecastData {
  category: string;
  predicted: number;
  confidence: "high" | "medium" | "low";
}

export const useInsights = (expenses: Expense[], budgets: Budget[]) => {
  const insights = useMemo(() => {
    const currentDate = new Date();
    const currentMonth = currentDate.toISOString().slice(0, 7);
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
      .toISOString()
      .slice(0, 7);
    const twoMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 1)
      .toISOString()
      .slice(0, 7);

    // Group expenses by month and category
    const expensesByMonthCategory = expenses.reduce((acc, exp) => {
      const month = exp.date.slice(0, 7);
      if (!acc[month]) acc[month] = {};
      if (!acc[month][exp.category]) acc[month][exp.category] = 0;
      acc[month][exp.category] += exp.amount;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    const generatedInsights: Insight[] = [];
    const trends: SpendingTrend[] = [];
    const forecasts: ForecastData[] = [];

    // Analyze spending trends
    const currentExpenses = expensesByMonthCategory[currentMonth] || {};
    const previousExpenses = expensesByMonthCategory[lastMonth] || {};
    const oldExpenses = expensesByMonthCategory[twoMonthsAgo] || {};

    Object.keys({ ...currentExpenses, ...previousExpenses }).forEach((category) => {
      const current = currentExpenses[category] || 0;
      const previous = previousExpenses[category] || 0;
      const older = oldExpenses[category] || 0;

      if (previous > 0) {
        const percentageChange = ((current - previous) / previous) * 100;
        const trend: SpendingTrend = {
          category,
          currentMonth: current,
          previousMonth: previous,
          percentageChange,
          trend: percentageChange > 5 ? "increasing" : percentageChange < -5 ? "decreasing" : "stable",
        };
        trends.push(trend);

        // Generate insights for significant changes
        if (percentageChange > 15) {
          generatedInsights.push({
            id: `trend_${category}`,
            type: "warning",
            title: `${category} spending increased`,
            description: `Your ${category} expenses increased by ${percentageChange.toFixed(1)}% this month (from $${previous.toFixed(2)} to $${current.toFixed(2)}). Consider reviewing these expenses or setting a stricter budget.`,
            category,
            priority: percentageChange > 30 ? "high" : "medium",
          });
        } else if (percentageChange < -15) {
          generatedInsights.push({
            id: `savings_${category}`,
            type: "success",
            title: `Great savings in ${category}!`,
            description: `You reduced ${category} spending by ${Math.abs(percentageChange).toFixed(1)}% this month. Keep up the good work!`,
            category,
            priority: "low",
          });
        }

        // Predict next month using simple moving average
        if (older > 0) {
          const predicted = (current + previous + older) / 3;
          const variance = Math.abs(current - previous) + Math.abs(previous - older);
          const confidence = variance < 50 ? "high" : variance < 150 ? "medium" : "low";
          
          forecasts.push({
            category,
            predicted,
            confidence,
          });
        }
      }
    });

    // Budget overrun warnings
    const currentBudgets = budgets.filter((b) => b.month === currentMonth);
    currentBudgets.forEach((budget) => {
      const spent = currentExpenses[budget.category] || 0;
      const percentUsed = (spent / budget.amount) * 100;

      if (percentUsed > 90 && percentUsed <= 100) {
        generatedInsights.push({
          id: `budget_warning_${budget.category}`,
          type: "warning",
          title: `${budget.category} budget almost exhausted`,
          description: `You've used ${percentUsed.toFixed(0)}% of your ${budget.category} budget ($${spent.toFixed(2)} of $${budget.amount.toFixed(2)}). Only $${(budget.amount - spent).toFixed(2)} remaining.`,
          category: budget.category,
          priority: "high",
        });
      }
    });

    // Anomaly detection - spending spikes
    Object.entries(currentExpenses).forEach(([category, amount]) => {
      const previousAmount = previousExpenses[category] || 0;
      const avgPrevious = previousAmount > 0 ? previousAmount : amount;
      
      if (amount > avgPrevious * 2 && amount > 200) {
        generatedInsights.push({
          id: `anomaly_${category}`,
          type: "info",
          title: `Unusual spending in ${category}`,
          description: `Your ${category} expenses ($${amount.toFixed(2)}) are significantly higher than usual. This might be a one-time expense or a pattern to watch.`,
          category,
          priority: "medium",
        });
      }
    });

    // Smart suggestions based on patterns
    const totalCurrent = Object.values(currentExpenses).reduce((sum, val) => sum + val, 0);
    const totalPrevious = Object.values(previousExpenses).reduce((sum, val) => sum + val, 0);

    if (totalCurrent > totalPrevious * 1.2) {
      generatedInsights.push({
        id: "overall_increase",
        type: "warning",
        title: "Overall spending increased",
        description: `Your total spending increased by ${(((totalCurrent - totalPrevious) / totalPrevious) * 100).toFixed(1)}% this month. Review your expenses and consider adjusting budgets.`,
        priority: "high",
      });
    }

    // Generate smart savings suggestions
    const savingsSuggestions: Insight[] = [];
    
    // Transportation suggestion
    const transportSpending = currentExpenses["Transportation"] || 0;
    const prevTransport = previousExpenses["Transportation"] || 0;
    if (transportSpending > prevTransport * 1.15 && transportSpending > 100) {
      savingsSuggestions.push({
        id: "transport_tip",
        type: "info",
        title: "Transportation Cost Optimization",
        description: `Your transport expenses increased by ${(((transportSpending - prevTransport) / prevTransport) * 100).toFixed(0)}% this month. Consider carpooling, public transit, or ride-sharing apps to reduce costs.`,
        category: "Transportation",
        priority: "medium",
      });
    }

    // Food suggestion
    const foodSpending = (currentExpenses["Food & Dining"] || 0);
    if (foodSpending > 500) {
      savingsSuggestions.push({
        id: "food_tip",
        type: "info",
        title: "Dining Optimization",
        description: `You spent $${foodSpending.toFixed(2)} on dining this month. Meal planning and cooking at home could save you 30-40% on food expenses.`,
        category: "Food & Dining",
        priority: "medium",
      });
    }

    // Shopping suggestion
    const shoppingSpending = currentExpenses["Shopping"] || 0;
    if (shoppingSpending > 300) {
      savingsSuggestions.push({
        id: "shopping_tip",
        type: "info",
        title: "Shopping Smart Tips",
        description: "Consider implementing a 24-hour rule before making non-essential purchases. Use price comparison tools and wait for seasonal sales.",
        category: "Shopping",
        priority: "low",
      });
    }

    return {
      insights: [...generatedInsights, ...savingsSuggestions].sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }),
      trends,
      forecasts,
      totalCurrentSpending: totalCurrent,
      totalPreviousSpending: totalPrevious,
    };
  }, [expenses, budgets]);

  return insights;
};
