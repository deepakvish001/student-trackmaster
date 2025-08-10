import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
            <TableHead className="text-foreground font-semibold">Status</TableHead>
            <TableHead className="text-foreground font-semibold text-center">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentBatches.map((batch, index) => (
            <TableRow 
              key={batch.id}
              className={`border-b border-foreground/5 hover:bg-muted/30 transition-all duration-200 ${
                !batch.is_enabled ? 'opacity-60' : ''
              }`}
            >
              <TableCell className="font-mono text-muted-foreground">{batch.serial_number}</TableCell>
              <TableCell className="font-medium text-electric-blue">{batch.batch_name}</TableCell>
              <TableCell className="text-foreground">{batch.admin_name}</TableCell>
              <TableCell className="text-foreground">{batch.username}</TableCell>
              <TableCell className="text-vibrant-purple font-semibold">{(batch as any).student_count || 0}</TableCell>
              <TableCell>
                <Badge 
                  className={`${
                    batch.is_enabled 
                      ? 'bg-emerald-green/20 text-emerald-green border-emerald-green/30 shadow-emerald-green/20' 
                      : 'bg-pink-rose/20 text-pink-rose border-pink-rose/30 shadow-pink-rose/20'
                  } shadow-lg font-medium`}
                >
                  {batch.is_enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </TableCell>
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