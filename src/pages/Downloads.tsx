import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";
import { toast } from "sonner";

export default function Downloads() {
  const handleDownload = (type: string) => {
    // Mock download functionality
    console.log(`Downloading ${type} data...`);
    toast.success(`${type} data downloaded successfully!`);
  };

  return (
    <DashboardLayout>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Students Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Download complete students data in Excel format
            </p>
            <Button onClick={() => handleDownload("students")}>
              <Download className="mr-2 h-4 w-4" />
              Download Students Excel
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Batches Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Download complete batches data in Excel format
            </p>
            <Button onClick={() => handleDownload("batches")}>
              <Download className="mr-2 h-4 w-4" />
              Download Batches Excel
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}