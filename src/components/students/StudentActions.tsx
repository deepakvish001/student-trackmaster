
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, Edit, Trash2, Eye } from 'lucide-react';
import { Student } from '@/types';

interface StudentActionsProps {
  student: Student;
  onEdit: (student: Student) => void;
  onDelete: (studentId: string) => void;
  onView: (student: Student) => void;
}

export function StudentActions({ student, onEdit, onDelete, onView }: StudentActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Check if batch is enabled for student operations
  const isBatchEnabled = student.batches?.is_enabled !== false;

  const handleDelete = () => {
    onDelete(student.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onView(student)}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => onEdit(student)}
            disabled={!isBatchEnabled}
            className={!isBatchEnabled ? "opacity-50 cursor-not-allowed" : ""}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Student {!isBatchEnabled && "(Batch Disabled)"}
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            disabled={!isBatchEnabled}
            className={`${!isBatchEnabled ? "opacity-50 cursor-not-allowed" : "text-red-600"}`}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Student {!isBatchEnabled && "(Batch Disabled)"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {!isBatchEnabled ? (
                <div className="space-y-2">
                  <p className="text-red-600 font-semibold">⚠️ Cannot delete student - Batch is disabled</p>
                  <p>The batch "{student.batches?.batch_name}" is currently disabled. Enable the batch first to perform student operations.</p>
                </div>
              ) : (
                <>
                  This action cannot be undone. This will permanently delete the student 
                  record for "{student.student_name}" and all associated fingerprint data.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={!isBatchEnabled}
              className={`${!isBatchEnabled ? "opacity-50 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"}`}
            >
              {!isBatchEnabled ? "Cannot Delete" : "Delete Student"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
