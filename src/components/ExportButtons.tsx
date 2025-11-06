import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { Expense } from "@/types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ExportButtonsProps {
  expenses: Expense[];
  title?: string;
}

export const ExportButtons = ({ expenses, title = "Expense Report" }: ExportButtonsProps) => {
  const exportToCSV = () => {
    if (expenses.length === 0) {
      alert("No data to export");
      return;
    }

    const headers = ["Date", "Category", "Description", "Amount"];
    const rows = expenses.map(exp => [
      new Date(exp.date).toLocaleDateString(),
      exp.category,
      exp.description,
      exp.amount.toFixed(2)
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    if (expenses.length === 0) {
      alert("No data to export");
      return;
    }

    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text(title, 14, 20);
    
    // Summary stats
    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    doc.setFontSize(12);
    doc.text(`Total Expenses: $${totalAmount.toFixed(2)}`, 14, 30);
    doc.text(`Number of Transactions: ${expenses.length}`, 14, 37);
    doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, 14, 44);

    // Table
    const tableData = expenses.map(exp => [
      new Date(exp.date).toLocaleDateString(),
      exp.category,
      exp.description,
      `$${exp.amount.toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 52,
      head: [["Date", "Category", "Description", "Amount"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`${title.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={exportToCSV}>
        <FileText className="w-4 h-4 mr-2" />
        Export CSV
      </Button>
      <Button variant="outline" size="sm" onClick={exportToPDF}>
        <Download className="w-4 h-4 mr-2" />
        Export PDF
      </Button>
    </div>
  );
};
