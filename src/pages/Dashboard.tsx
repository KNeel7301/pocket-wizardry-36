import { useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { useExpenses } from "@/hooks/useExpenses";
import { useBudgets } from "@/hooks/useBudgets";
import { useCurrency } from "@/hooks/useCurrency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { DollarSign, TrendingUp, TrendingDown, PiggyBank, ArrowRightLeft } from "lucide-react";
import { ExportButtons } from "@/components/ExportButtons";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Dashboard = () => {
  const { expenses } = useExpenses();
  const { budgets } = useBudgets();
  const { formatCurrency } = useCurrency();

  // Get current month in YYYY-MM format
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  // State for month comparison
  const [compareMonth1, setCompareMonth1] = useState(currentMonth);
  const [compareMonth2, setCompareMonth2] = useState("");
  
  // Get available months from expenses
  const availableMonths = useMemo(() => {
    const months = new Set(expenses.map(exp => exp.date.slice(0, 7)));
    return Array.from(months).sort().reverse();
  }, [expenses]);

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

  // Calculate comparison data
  const comparisonData = useMemo(() => {
    if (!compareMonth2) return null;

    const month1Expenses = expenses.filter(exp => exp.date.startsWith(compareMonth1));
    const month2Expenses = expenses.filter(exp => exp.date.startsWith(compareMonth2));

    const month1Total = month1Expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const month2Total = month2Expenses.reduce((sum, exp) => sum + exp.amount, 0);

    const month1Budget = budgets.filter(b => b.month === compareMonth1).reduce((sum, b) => sum + b.amount, 0);
    const month2Budget = budgets.filter(b => b.month === compareMonth2).reduce((sum, b) => sum + b.amount, 0);

    // Category comparison
    const allCategories = new Set([
      ...month1Expenses.map(e => e.category),
      ...month2Expenses.map(e => e.category)
    ]);

    const categoryComparison = Array.from(allCategories).map(category => {
      const month1Amount = month1Expenses.filter(e => e.category === category).reduce((sum, e) => sum + e.amount, 0);
      const month2Amount = month2Expenses.filter(e => e.category === category).reduce((sum, e) => sum + e.amount, 0);
      
      return {
        category,
        month1: month1Amount,
        month2: month2Amount,
        difference: month2Amount - month1Amount,
        percentChange: month1Amount > 0 ? ((month2Amount - month1Amount) / month1Amount) * 100 : 0
      };
    });

    return {
      month1Total,
      month2Total,
      month1Budget,
      month2Budget,
      totalDifference: month2Total - month1Total,
      totalPercentChange: month1Total > 0 ? ((month2Total - month1Total) / month1Total) * 100 : 0,
      categoryComparison
    };
  }, [expenses, budgets, compareMonth1, compareMonth2]);

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FFC658", "#FF6B9D", "#8DD1E1"];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Overview of your finances for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
          </div>
          <ExportButtons expenses={expenses.filter((exp) => exp.date.startsWith(currentMonth))} title="Monthly Report" />
        </div>

        <Tabs defaultValue="current" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="current">Current Month</TabsTrigger>
            <TabsTrigger value="compare">Compare Months</TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-6 mt-6">

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <TrendingDown className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalSpent)}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
              <PiggyBank className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalBudget)}</div>
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
                {formatCurrency(Math.abs(stats.remaining))}
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
          </TabsContent>

          <TabsContent value="compare" className="space-y-6 mt-6">
            {/* Month Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5" />
                  Select Months to Compare
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">First Month</label>
                    <Select value={compareMonth1} onValueChange={setCompareMonth1}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMonths.map(month => (
                          <SelectItem key={month} value={month}>
                            {new Date(month + "-01").toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Second Month</label>
                    <Select value={compareMonth2} onValueChange={setCompareMonth2}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select month to compare" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMonths.filter(m => m !== compareMonth1).map(month => (
                          <SelectItem key={month} value={month}>
                            {new Date(month + "-01").toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {comparisonData ? (
              <>
                {/* Comparison Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        {new Date(compareMonth1 + "-01").toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} Spent
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(comparisonData.month1Total)}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        {new Date(compareMonth2 + "-01").toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} Spent
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(comparisonData.month2Total)}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Difference</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${comparisonData.totalDifference < 0 ? 'text-green-600' : 'text-destructive'}`}>
                        {comparisonData.totalDifference > 0 ? '+' : ''}{formatCurrency(comparisonData.totalDifference)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {comparisonData.totalPercentChange > 0 ? '+' : ''}{comparisonData.totalPercentChange.toFixed(1)}%
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Budget Comparison</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        <div className="text-sm">{formatCurrency(comparisonData.month1Budget)} → {formatCurrency(comparisonData.month2Budget)}</div>
                        <p className="text-xs text-muted-foreground">Total budgets</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Category-wise Comparison Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Category-wise Spending Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {comparisonData.categoryComparison.length > 0 ? (
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={comparisonData.categoryComparison}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
                          <YAxis />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Legend />
                          <Bar 
                            dataKey="month1" 
                            fill="#0088FE" 
                            name={new Date(compareMonth1 + "-01").toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} 
                          />
                          <Bar 
                            dataKey="month2" 
                            fill="#FF8042" 
                            name={new Date(compareMonth2 + "-01").toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} 
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                        No data available for comparison
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Detailed Category Comparison Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Detailed Category Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-4">Category</th>
                            <th className="text-right py-2 px-4">
                              {new Date(compareMonth1 + "-01").toLocaleDateString('en-US', { month: 'short' })}
                            </th>
                            <th className="text-right py-2 px-4">
                              {new Date(compareMonth2 + "-01").toLocaleDateString('en-US', { month: 'short' })}
                            </th>
                            <th className="text-right py-2 px-4">Difference</th>
                            <th className="text-right py-2 px-4">Change %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {comparisonData.categoryComparison.map((cat, idx) => (
                            <tr key={idx} className="border-b">
                              <td className="py-2 px-4 font-medium">{cat.category}</td>
                              <td className="text-right py-2 px-4">{formatCurrency(cat.month1)}</td>
                              <td className="text-right py-2 px-4">{formatCurrency(cat.month2)}</td>
                              <td className={`text-right py-2 px-4 ${cat.difference < 0 ? 'text-green-600' : 'text-destructive'}`}>
                                {cat.difference > 0 ? '+' : ''}{formatCurrency(cat.difference)}
                              </td>
                              <td className={`text-right py-2 px-4 ${cat.percentChange < 0 ? 'text-green-600' : 'text-destructive'}`}>
                                {cat.percentChange > 0 ? '+' : ''}{cat.percentChange.toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <ArrowRightLeft className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a second month to compare</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Dashboard;
