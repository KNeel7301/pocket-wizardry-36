import Layout from "@/components/Layout";
import { useExpenses } from "@/hooks/useExpenses";
import { useBudgets } from "@/hooks/useBudgets";
import { useInsights } from "@/hooks/useInsights";
import { useCurrency } from "@/hooks/useCurrency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Brain, Target } from "lucide-react";

const Insights = () => {
  const { expenses } = useExpenses();
  const { budgets } = useBudgets();
  const { formatCurrency } = useCurrency();
  const { insights: insightData, trends, forecasts, totalCurrentSpending, totalPreviousSpending } = useInsights(expenses, budgets);

  const spendingChange = totalPreviousSpending > 0
    ? ((totalCurrentSpending - totalPreviousSpending) / totalPreviousSpending) * 100
    : 0;

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case "success":
        return <TrendingDown className="w-5 h-5 text-green-500" />;
      case "prediction":
        return <Brain className="w-5 h-5 text-blue-500" />;
      default:
        return <Lightbulb className="w-5 h-5 text-primary" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      default:
        return "secondary";
    }
  };

  const trendChartData = trends
    .slice(0, 5)
    .map((trend) => ({
      category: trend.category,
      "This Month": trend.currentMonth,
      "Last Month": trend.previousMonth,
    }));

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">AI Insights</h1>
          </div>
          <p className="text-muted-foreground">
            Smart analysis of your spending patterns and personalized recommendations
          </p>
        </div>

        {/* Overall Spending Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Spending Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">{formatCurrency(totalCurrentSpending)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Month</p>
                <p className="text-2xl font-bold">{formatCurrency(totalPreviousSpending)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Change</p>
                <div className="flex items-center gap-2">
                  <p className={`text-2xl font-bold ${spendingChange > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {spendingChange > 0 ? '+' : ''}{spendingChange.toFixed(1)}%
                  </p>
                  {spendingChange > 0 ? (
                    <TrendingUp className="w-5 h-5 text-red-500" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-green-500" />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Spending Trends Chart */}
        {trendChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Category Trends (Top 5)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="Last Month" stroke="#8884d8" strokeWidth={2} />
                  <Line type="monotone" dataKey="This Month" stroke="#82ca9d" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* AI-Generated Insights */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Smart Insights & Recommendations
          </h2>
          {insightData.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Not enough data yet. Keep tracking your expenses for personalized insights!
              </CardContent>
            </Card>
          ) : (
            insightData.map((insight) => (
              <Alert key={insight.id} className="border-l-4">
                <div className="flex items-start gap-3">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTitle className="mb-0">{insight.title}</AlertTitle>
                      <Badge variant={getPriorityColor(insight.priority)}>
                        {insight.priority}
                      </Badge>
                      {insight.category && (
                        <Badge variant="outline">{insight.category}</Badge>
                      )}
                    </div>
                    <AlertDescription>{insight.description}</AlertDescription>
                  </div>
                </div>
              </Alert>
            ))
          )}
        </div>

        {/* Next Month Predictions */}
        {forecasts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Next Month Predictions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {forecasts.slice(0, 5).map((forecast) => (
                  <div key={forecast.category} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{forecast.category}</span>
                        <Badge variant={forecast.confidence === "high" ? "default" : "secondary"}>
                          {forecast.confidence} confidence
                        </Badge>
                      </div>
                      <span className="text-lg font-bold">{formatCurrency(forecast.predicted)}</span>
                    </div>
                    <Progress 
                      value={Math.min((forecast.predicted / 1000) * 100, 100)} 
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trend Details */}
        {trends.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Detailed Trend Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {trends.slice(0, 8).map((trend) => (
                  <div key={trend.category} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {trend.trend === "increasing" ? (
                        <TrendingUp className="w-5 h-5 text-red-500" />
                      ) : trend.trend === "decreasing" ? (
                        <TrendingDown className="w-5 h-5 text-green-500" />
                      ) : (
                        <TrendingUp className="w-5 h-5 text-gray-400" />
                      )}
                      <div>
                        <p className="font-medium">{trend.category}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(trend.previousMonth)} → {formatCurrency(trend.currentMonth)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${trend.percentageChange > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {trend.percentageChange > 0 ? '+' : ''}{trend.percentageChange.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">{trend.trend}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Insights;
