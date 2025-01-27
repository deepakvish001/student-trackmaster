import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit2 } from "lucide-react";
import { BatchTableProps } from "@/types/batch";
import { BatchStatusButton } from "./BatchStatusButton";

export const BatchTable = ({ 
  currentBatches, 
  onEdit, 
  onStatusChange 
}: BatchTableProps) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Sr. No.</TableHead>
          <TableHead>Batch Name</TableHead>
          <TableHead>Admin Name</TableHead>
          <TableHead>Username</TableHead>
          <TableHead>Max Students</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {currentBatches.map((batch) => (
          <TableRow 
            key={batch.id}
            className={!batch.is_enabled ? "bg-red-50" : ""}
          >
            <TableCell>{batch.serial_number}</TableCell>
            <TableCell className="font-medium">{batch.batch_name}</TableCell>
            <TableCell>{batch.admin_name}</TableCell>
            <TableCell>{batch.username}</TableCell>
            <TableCell>{batch.max_students}</TableCell>
            <TableCell>
              <BatchStatusButton
                isEnabled={batch.is_enabled}
                onClick={() => onStatusChange(batch)}
              />
            </TableCell>
            <TableCell>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(batch)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};