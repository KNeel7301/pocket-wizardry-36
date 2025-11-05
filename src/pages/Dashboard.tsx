import { useMemo } from "react";
import Layout from "@/components/Layout";
import { useExpenses } from "@/hooks/useExpenses";
import { useBudgets } from "@/hooks/useBudgets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { DollarSign, TrendingUp, TrendingDown, PiggyBank } from "lucide-react";

const Dashboard = () => {
  const { expenses } = useExpenses();
  const { budgets } = useBudgets();

  // Get current month in YYYY-MM format
  const currentMonth = new Date().toISOString().slice(0, 7);

  // Calculate statistics for current month
  const stats = useMemo(() => {
    const monthExpenses = expenses.filter((exp) => exp.date.startsWith(currentMonth));
    const totalSpent = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    // Calculate total budget for current month
    const totalBudget = budgets
      .filter((b) => b.month === currentMonth)
      .reduce((sum, b) => sum + b.amount, 0);

    // Group expenses by category
    const byCategory = monthExpenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSpent,
      totalBudget,
      remaining: totalBudget - totalSpent,
      transactionCount: monthExpenses.length,
      byCategory,
    };
  }, [expenses, budgets, currentMonth]);

  // Prepare data for pie chart
  const categoryData = Object.entries(stats.byCategory).map(([name, value]) => ({
    name,
    value,
  }));

  // Prepare data for budget comparison chart
  const budgetComparison = useMemo(() => {
    return budgets
      .filter((b) => b.month === currentMonth)
      .map((budget) => ({
        category: budget.category,
        budget: budget.amount,
        spent: stats.byCategory[budget.category] || 0,
      }));
  }, [budgets, stats.byCategory, currentMonth]);

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FFC658", "#FF6B9D", "#8DD1E1"];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your finances for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <TrendingDown className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalSpent.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
              <PiggyBank className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalBudget.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Allocated this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Remaining</CardTitle>
              <TrendingUp className={`w-4 h-4 ${stats.remaining >= 0 ? 'text-green-600' : 'text-destructive'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.remaining >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                ${Math.abs(stats.remaining).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.remaining >= 0 ? 'Under budget' : 'Over budget'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <DollarSign className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.transactionCount}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spending by Category - Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Spending by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No expenses recorded this month
                </div>
              )}
            </CardContent>
          </Card>

          {/* Budget vs Actual - Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Budget vs Actual Spending</CardTitle>
            </CardHeader>
            <CardContent>
              {budgetComparison.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={budgetComparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                    <Legend />
                    <Bar dataKey="budget" fill="#0088FE" name="Budget" />
                    <Bar dataKey="spent" fill="#FF8042" name="Spent" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No budgets set for this month
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
