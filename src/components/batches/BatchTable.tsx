import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit2, Check, X } from "lucide-react";
import { BatchTableProps } from "@/types/batch";

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
              <Button
                variant={batch.is_enabled ? "default" : "destructive"}
                size="sm"
                onClick={() => onStatusChange(batch)}
                className={`transition-colors ${
                  batch.is_enabled ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {batch.is_enabled ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
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