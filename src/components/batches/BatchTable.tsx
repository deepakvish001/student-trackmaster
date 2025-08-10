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
          <TableHead>Admin</TableHead>
          <TableHead>User Name</TableHead>
          <TableHead>Students</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {currentBatches.map((batch) => (
          <TableRow 
            key={batch.id}
            className={`hover:bg-muted/50 hover:text-foreground transition-colors duration-300 ${
              !batch.is_enabled ? "bg-destructive/10" : ""
            }`}
          >
            <TableCell>{batch.serial_number}</TableCell>
            <TableCell className="font-medium text-electric-blue">{batch.batch_name}</TableCell>
            <TableCell>{batch.admin_name}</TableCell>
            <TableCell>{batch.username}</TableCell>
            <TableCell className="text-vibrant-purple font-semibold">{(batch as any).student_count || 0}</TableCell>
            <TableCell>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(batch)}
                className="bg-sunset-orange hover:bg-sunset-orange/90 text-white border-0"
              >
                Action
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};