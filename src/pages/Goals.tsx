import { useState } from "react";
import Layout from "@/components/Layout";
import { useGoals } from "@/hooks/useGoals";
import { useCurrency } from "@/hooks/useCurrency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, TrendingUp, Target, Award } from "lucide-react";

const Goals = () => {
  const { goals, addGoal, deleteGoal, addProgress, updateGoal } = useGoals();
  const { formatCurrency } = useCurrency();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [category, setCategory] = useState("");
  const [progressAmount, setProgressAmount] = useState("");

  const resetForm = () => {
    setName("");
    setTargetAmount("");
    setDeadline("");
    setCategory("");
    setIsDialogOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !targetAmount || !deadline || !category) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    addGoal({
      name,
      targetAmount: parseFloat(targetAmount),
      currentAmount: 0,
      deadline,
      category,
    });

    toast({
      title: "Success",
      description: "Goal created successfully",
    });

    resetForm();
  };

  const handleAddProgress = (e: React.FormEvent) => {
    e.preventDefault();

    if (!progressAmount || parseFloat(progressAmount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    addProgress(selectedGoalId, parseFloat(progressAmount));

    const goal = goals.find(g => g.id === selectedGoalId);
    const newAmount = (goal?.currentAmount || 0) + parseFloat(progressAmount);
    
    if (goal && newAmount >= goal.targetAmount) {
      toast({
        title: "🎉 Goal Achieved!",
        description: `Congratulations! You've reached your "${goal.name}" goal!`,
      });
    } else {
      toast({
        title: "Progress Updated",
        description: "Your progress has been saved",
      });
    }

    setProgressAmount("");
    setIsProgressDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this goal?")) {
      deleteGoal(id);
      toast({
        title: "Goal deleted",
        description: "Your goal has been removed",
      });
    }
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getAchievementBadge = (percentage: number) => {
    if (percentage >= 100) return { icon: Award, text: "Achieved!", color: "text-green-500" };
    if (percentage >= 75) return { icon: TrendingUp, text: "Almost There!", color: "text-blue-500" };
    if (percentage >= 50) return { icon: Target, text: "Halfway!", color: "text-yellow-500" };
    return { icon: Target, text: "Getting Started", color: "text-gray-500" };
  };

  const sortedGoals = [...goals].sort((a, b) => {
    const percentA = getProgressPercentage(a.currentAmount, a.targetAmount);
    const percentB = getProgressPercentage(b.currentAmount, b.targetAmount);
    return percentB - percentA;
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Saving Goals</h1>
            <p className="text-muted-foreground">Track your financial goals and achievements</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Goal</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Goal Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Vacation Fund"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    placeholder="e.g., Travel, Emergency, Home"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target">Target Amount</Label>
                  <Input
                    id="target"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full">
                  Create Goal
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {sortedGoals.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No goals yet. Create your first saving goal to get started!
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sortedGoals.map((goal) => {
              const percentage = getProgressPercentage(goal.currentAmount, goal.targetAmount);
              const badge = getAchievementBadge(percentage);
              const BadgeIcon = badge.icon;
              const daysLeft = Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

              return (
                <Card key={goal.id} className="relative overflow-hidden">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{goal.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{goal.category}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(goal.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    <div className={`flex items-center gap-2 mt-2 ${badge.color}`}>
                      <BadgeIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">{badge.text}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{formatCurrency(goal.currentAmount)}</span>
                        <span className="text-muted-foreground">{formatCurrency(goal.targetAmount)}</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{percentage.toFixed(0)}% complete</span>
                        <span>{daysLeft > 0 ? `${daysLeft} days left` : "Overdue"}</span>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => {
                        setSelectedGoalId(goal.id);
                        setIsProgressDialogOpen(true);
                      }}
                      disabled={percentage >= 100}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Progress
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={isProgressDialogOpen} onOpenChange={setIsProgressDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Progress</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddProgress} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="progressAmount">Amount to Add</Label>
                <Input
                  id="progressAmount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={progressAmount}
                  onChange={(e) => setProgressAmount(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full">
                Add Progress
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Goals;
