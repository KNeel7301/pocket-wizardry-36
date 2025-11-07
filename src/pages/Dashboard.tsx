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
  const [selectedMonths, setSelectedMonths] = useState<string[]>([currentMonth]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
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

  // Get categories available in selected months
  const availableCategories = useMemo(() => {
    if (selectedMonths.length === 0) return [];
    
    const categories = new Set<string>();
    expenses.forEach(exp => {
      if (selectedMonths.some(month => exp.date.startsWith(month))) {
        categories.add(exp.category);
      }
    });
    
    return Array.from(categories).sort();
  }, [expenses, selectedMonths]);

  // Calculate comparison data for multiple months
  const comparisonData = useMemo(() => {
    if (selectedMonths.length < 2) return null;

    // Filter by selected category if not "all"
    const filterByCategory = (exps: typeof expenses) => 
      selectedCategory === "all" ? exps : exps.filter(e => e.category === selectedCategory);

    // Calculate totals for each month
    const monthTotals = selectedMonths.map(month => {
      const monthExpenses = filterByCategory(expenses.filter(exp => exp.date.startsWith(month)));
      const total = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const budget = budgets.filter(b => b.month === month && (selectedCategory === "all" || b.category === selectedCategory))
        .reduce((sum, b) => sum + b.amount, 0);
      
      return { month, total, budget };
    });

    // Get all categories if viewing all, or just the selected category
    const categoriesToShow = selectedCategory === "all" ? availableCategories : [selectedCategory];

    // Category-wise comparison across all selected months
    const categoryComparison = categoriesToShow.map(category => {
      const dataPoint: any = { category };
      
      selectedMonths.forEach(month => {
        const monthExpenses = expenses.filter(exp => 
          exp.date.startsWith(month) && exp.category === category
        );
        const total = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        dataPoint[month] = total;
      });
      
      return dataPoint;
    });

    return {
      monthTotals,
      categoryComparison
    };
  }, [expenses, budgets, selectedMonths, selectedCategory, availableCategories]);

  // Toggle month selection
  const toggleMonth = (month: string) => {
    setSelectedMonths(prev => {
      if (prev.includes(month)) {
        return prev.filter(m => m !== month);
      } else {
        return [...prev, month].sort().reverse();
      }
    });
  };

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
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Months (select 2 or more)</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {availableMonths.map(month => (
                      <Button
                        key={month}
                        variant={selectedMonths.includes(month) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleMonth(month)}
                        className="w-full"
                      >
                        {new Date(month + "-01").toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedMonths.length} month{selectedMonths.length !== 1 ? 's' : ''} selected
                  </p>
                </div>

                {selectedMonths.length >= 2 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Filter by Category</label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {availableCategories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {comparisonData ? (
              <>
                {/* Monthly Totals Comparison */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Monthly Spending Overview
                      {selectedCategory !== "all" && ` - ${selectedCategory}`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {comparisonData.monthTotals.map(({ month, total, budget }) => (
                        <Card key={month}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">
                              {new Date(month + "-01").toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(total)}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Budget: {formatCurrency(budget)}
                            </p>
                            {budget > 0 && (
                              <p className={`text-xs mt-1 ${total > budget ? 'text-destructive' : 'text-green-600'}`}>
                                {total > budget ? 'Over' : 'Under'} by {formatCurrency(Math.abs(budget - total))}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Comparison Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {selectedCategory === "all" ? "Category-wise" : selectedCategory} Spending Across Months
                    </CardTitle>
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
                          {selectedMonths.map((month, index) => (
                            <Bar 
                              key={month}
                              dataKey={month} 
                              fill={COLORS[index % COLORS.length]} 
                              name={new Date(month + "-01").toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} 
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                        No data available for comparison
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Detailed Comparison Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Detailed Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-4">Category</th>
                            {selectedMonths.map(month => (
                              <th key={month} className="text-right py-2 px-4">
                                {new Date(month + "-01").toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {comparisonData.categoryComparison.map((cat, index) => (
                            <tr key={index} className="border-b hover:bg-muted/50">
                              <td className="py-2 px-4 font-medium">{cat.category}</td>
                              {selectedMonths.map(month => (
                                <td key={month} className="text-right py-2 px-4">
                                  {formatCurrency(cat[month] || 0)}
                                </td>
                              ))}
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
                <CardContent className="py-12 text-center text-muted-foreground">
                  Please select at least 2 months to start comparing
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
