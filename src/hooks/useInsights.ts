import { useMemo, useEffect, useState } from "react";
import { Expense, Budget } from "@/types";
import * as tf from "@tensorflow/tfjs";

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

// Train a simple linear regression model for spending prediction
const trainSpendingModel = async (historicalData: number[]) => {
  if (historicalData.length < 3) return null;

  // Prepare training data: [month_index] -> [spending]
  const xs = tf.tensor2d(historicalData.map((_, i) => [i]), [historicalData.length, 1]);
  const ys = tf.tensor2d(historicalData.map(val => [val]), [historicalData.length, 1]);

  // Create a simple linear model: y = mx + b
  const model = tf.sequential();
  model.add(tf.layers.dense({ units: 1, inputShape: [1] }));
  model.compile({ optimizer: tf.train.adam(0.1), loss: 'meanSquaredError' });

  // Train the model
  await model.fit(xs, ys, { epochs: 100, verbose: 0 });

  return model;
};

export const useInsights = (expenses: Expense[], budgets: Budget[]) => {
  const [mlPredictions, setMlPredictions] = useState<Record<string, number>>({});

  useEffect(() => {
    const trainModels = async () => {
      const currentDate = new Date();
      const predictions: Record<string, number> = {};

      // Group expenses by month and category
      const expensesByMonthCategory = expenses.reduce((acc, exp) => {
        const month = exp.date.slice(0, 7);
        if (!acc[month]) acc[month] = {};
        if (!acc[month][exp.category]) acc[month][exp.category] = 0;
        acc[month][exp.category] += exp.amount;
        return acc;
      }, {} as Record<string, Record<string, number>>);

      // Get all unique categories
      const categories = Array.from(
        new Set(expenses.map(exp => exp.category))
      );

      // Train a model for each category
      for (const category of categories) {
        const monthlyData: number[] = [];
        
        // Collect last 6 months of data for this category
        for (let i = 5; i >= 0; i--) {
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
          const monthKey = date.toISOString().slice(0, 7);
          monthlyData.push(expensesByMonthCategory[monthKey]?.[category] || 0);
        }

        // Train model and predict next month
        if (monthlyData.some(val => val > 0)) {
          try {
            const model = await trainSpendingModel(monthlyData);
            if (model) {
              const prediction = model.predict(tf.tensor2d([[monthlyData.length]], [1, 1])) as tf.Tensor;
              const predictedValue = (await prediction.data())[0];
              predictions[category] = Math.max(0, predictedValue);
              
              // Clean up
              model.dispose();
              prediction.dispose();
            }
          } catch (error) {
            console.error(`Failed to train model for ${category}:`, error);
          }
        }
      }

      setMlPredictions(predictions);
    };

    if (expenses.length > 0) {
      trainModels();
    }
  }, [expenses]);

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

        // Use ML prediction if available, otherwise use moving average
        const predicted = mlPredictions[category] !== undefined 
          ? mlPredictions[category]
          : older > 0 ? (current + previous + older) / 3 : current;

        if (predicted > 0) {
          const variance = Math.abs(current - previous) + Math.abs(previous - older);
          const mlConfidence = mlPredictions[category] !== undefined ? "high" : "medium";
          const confidence = mlPredictions[category] !== undefined 
            ? mlConfidence
            : variance < 50 ? "high" : variance < 150 ? "medium" : "low";
          
          forecasts.push({
            category,
            predicted,
            confidence,
          });

          // Generate prediction-based insights
          if (mlPredictions[category] !== undefined && predicted > current * 1.2) {
            generatedInsights.push({
              id: `ml_prediction_${category}`,
              type: "prediction",
              title: `${category} spending likely to increase`,
              description: `Based on ML analysis of your spending patterns, ${category} expenses are predicted to reach ${predicted.toFixed(2)} next month (${((predicted - current) / current * 100).toFixed(0)}% increase). Consider setting aside extra budget.`,
              category,
              priority: "medium",
            });
          }
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

    // Smart suggestions based on ML patterns
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

    // ML-powered total spending prediction
    const totalPredicted = Object.values(mlPredictions).reduce((sum, val) => sum + val, 0);
    if (totalPredicted > totalCurrent * 1.15) {
      generatedInsights.push({
        id: "ml_overall_prediction",
        type: "prediction",
        title: "Rising spending trend detected",
        description: `ML models predict your total spending will increase to $${totalPredicted.toFixed(2)} next month. This is ${((totalPredicted - totalCurrent) / totalCurrent * 100).toFixed(0)}% higher than this month. Review your upcoming expenses.`,
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
  }, [expenses, budgets, mlPredictions]);

  return insights;
};
