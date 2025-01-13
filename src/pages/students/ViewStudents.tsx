import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Filter } from "lucide-react";

const mockStudents = [
  {
    id: 1,
    name: "John Doe",
    mobile: "1234567890",
    batchId: "2617113",
    address: "123 Main St",
  },
  {
    id: 2,
    name: "Jane Smith",
    mobile: "9876543210",
    batchId: "2617114",
    address: "456 Oak Ave",
  },
];

export default function ViewStudents() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");

  const filteredStudents = mockStudents.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (!selectedBatch || student.batchId === selectedBatch)
  );

  return (
    <DashboardLayout>
      <Card>
        <CardHeader>
          <CardTitle>View Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="w-full md:w-1/3 relative">
                <Search className="absolute left-2 top-3 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="w-full md:w-1/3 relative">
                <Filter className="absolute left-2 top-3 h-4 w-4 text-gray-500" />
                <Select onValueChange={setSelectedBatch} value={selectedBatch}>
                  <SelectTrigger className="pl-8">
                    <SelectValue placeholder="Filter by batch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Batches</SelectItem>
                    <SelectItem value="2617113">Batch 2617113</SelectItem>
                    <SelectItem value="2617114">Batch 2617114</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>{student.id}</TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{student.mobile}</TableCell>
                    <TableCell>{student.batchId}</TableCell>
                    <TableCell>{student.address}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">Edit</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}