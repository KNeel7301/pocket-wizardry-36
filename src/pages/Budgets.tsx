import { useState, useMemo, useEffect } from "react";
import Layout from "@/components/Layout";
import { useBudgets } from "@/hooks/useBudgets";
import { useExpenses } from "@/hooks/useExpenses";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil } from "lucide-react";
import { EXPENSE_CATEGORIES, Budget } from "@/types";

const Budgets = () => {
  const { budgets, setBudget, deleteBudget } = useBudgets();
  const { expenses } = useExpenses();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  
  // Form state
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  // Reset form
  const resetForm = () => {
    setAmount("");
    setCategory("");
    setMonth(new Date().toISOString().slice(0, 7));
    setEditingBudget(null);
  };

  // Handle edit
  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setAmount(budget.amount.toString());
    setCategory(budget.category);
    setMonth(budget.month);
    setIsDialogOpen(true);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || !category || !month) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setBudget({
      amount: parseFloat(amount),
      category,
      month,
    });

    toast({
      title: "Success",
      description: editingBudget ? "Budget updated successfully" : "Budget saved successfully",
    });

    resetForm();
    setIsDialogOpen(false);
  };

  // Handle delete
  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this budget?")) {
      deleteBudget(id);
      toast({
        title: "Success",
        description: "Budget deleted successfully",
      });
    }
  };

  // Calculate spending for each budget
  const budgetStats = useMemo(() => {
    return budgets.map((budget) => {
      const spent = expenses
        .filter(
          (exp) =>
            exp.category === budget.category &&
            exp.date.startsWith(budget.month)
        )
        .reduce((sum, exp) => sum + exp.amount, 0);

      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
      const remaining = budget.amount - spent;

      return {
        ...budget,
        spent,
        percentage,
        remaining,
      };
    });
  }, [budgets, expenses]);

  // Sort budgets by month (newest first)
  const sortedBudgets = [...budgetStats].sort((a, b) => 
    b.month.localeCompare(a.month)
  );

  // Check for over-budget notifications
  useEffect(() => {
    budgetStats.forEach((budget) => {
      // Only show notification for current month budgets that are over 100%
      const currentMonth = new Date().toISOString().slice(0, 7);
      if (budget.month === currentMonth && budget.percentage > 100) {
        const notificationKey = `budget_alert_${budget.id}_${budget.month}`;
        const hasShownNotification = sessionStorage.getItem(notificationKey);
        
        if (!hasShownNotification) {
          toast({
            title: "⚠️ Budget Exceeded!",
            description: `You've exceeded your ${budget.category} budget by $${Math.abs(budget.remaining).toFixed(2)}`,
            variant: "destructive",
          });
          sessionStorage.setItem(notificationKey, "true");
        }
      }
    });
  }, [budgetStats]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Budgets</h1>
            <p className="text-muted-foreground">Set and track your monthly budgets</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Set Budget
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingBudget ? "Edit Budget" : "Set Budget"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Budget Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="month">Month</Label>
                  <Input
                    id="month"
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full">
                  {editingBudget ? "Update Budget" : "Save Budget"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedBudgets.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="text-center py-8 text-muted-foreground">
                No budgets set yet. Create your first budget to start tracking!
              </CardContent>
            </Card>
          ) : (
            sortedBudgets.map((budget) => (
              <Card key={budget.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{budget.category}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(budget.month + "-01").toLocaleDateString('en-US', { 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(budget)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(budget.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Spent</span>
                      <span className="font-medium">
                        ${budget.spent.toFixed(2)} / ${budget.amount.toFixed(2)}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(budget.percentage, 100)} 
                      className={
                        budget.percentage > 100 
                          ? "[&>div]:bg-destructive" 
                          : budget.percentage > 80 
                          ? "[&>div]:bg-yellow-500" 
                          : ""
                      }
                    />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {budget.percentage.toFixed(0)}% used
                      </span>
                      <span className={budget.remaining >= 0 ? "text-green-600" : "text-destructive"}>
                        {budget.remaining >= 0 ? "Remaining: " : "Over by: "}
                        ${Math.abs(budget.remaining).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Budgets;
