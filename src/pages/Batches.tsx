import DashboardLayout from "@/components/DashboardLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

const mockBatches = [
  {
    id: "2617113",
    name: "Batch 2617113",
    studentCount: 25,
    startDate: "2024-01-01",
    status: "Active",
  },
  {
    id: "2617114",
    name: "Batch 2617114",
    studentCount: 30,
    startDate: "2024-02-01",
    status: "Active",
  },
];

export default function Batches() {
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button>Add New Batch</Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Students</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockBatches.map((batch) => (
              <TableRow key={batch.id}>
                <TableCell>{batch.id}</TableCell>
                <TableCell>{batch.name}</TableCell>
                <TableCell>{batch.studentCount}</TableCell>
                <TableCell>{batch.startDate}</TableCell>
                <TableCell>{batch.status}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">Edit</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
}