import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BatchTableProps } from "@/types/batch";
import { BatchActions } from "./BatchActions";

export const BatchTable = ({ 
  currentBatches, 
  onEdit, 
  onStatusChange 
}: BatchTableProps) => {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-foreground/10 hover:bg-transparent">
            <TableHead className="text-foreground font-semibold">Sr. No.</TableHead>
            <TableHead className="text-foreground font-semibold">Batch Name</TableHead>
            <TableHead className="text-foreground font-semibold">Admin</TableHead>
            <TableHead className="text-foreground font-semibold">User Name</TableHead>
            <TableHead className="text-foreground font-semibold">Students</TableHead>
            <TableHead className="text-foreground font-semibold text-center">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentBatches.map((batch, index) => (
            <TableRow 
              key={batch.id}
              className="border-b border-foreground/5 hover:bg-muted/30 transition-all duration-200"
            >
              <TableCell className="font-mono text-muted-foreground">{batch.serial_number}</TableCell>
              <TableCell className="font-medium text-electric-blue">{batch.batch_name}</TableCell>
              <TableCell className="text-foreground">{batch.admin_name}</TableCell>
              <TableCell className="text-foreground">{batch.username}</TableCell>
              <TableCell className="text-vibrant-purple font-semibold">{(batch as any).student_count || 0}</TableCell>
              <TableCell className="text-center">
                <BatchActions batch={batch} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};