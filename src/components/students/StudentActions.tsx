
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { MoreHorizontal, Edit, Trash2, Eye, Power, PowerOff } from 'lucide-react';
import { Student } from '@/types';

interface StudentActionsProps {
  student: Student;
  onEdit: (student: Student) => void;
  onDelete: (studentId: string) => void;
  onView: (student: Student) => void;
  onToggleStatus: (student: Student) => void;
}

export function StudentActions({ student, onEdit, onDelete, onView, onToggleStatus }: StudentActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const navigate = useNavigate();

  const handleDelete = () => {
    onDelete(student.id);
    setShowDeleteDialog(false);
  };

  const handleView = () => {
    // Use the student ID as the fingerprint ID for the URL
    // This way we can find the student reliably
    navigate(`/students/${student.id}`);
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
          <DropdownMenuItem onClick={handleView}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEdit(student)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Student
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onToggleStatus(student)}>
            {student.is_enabled ? (
              <>
                <PowerOff className="mr-2 h-4 w-4" />
                Disable Student
              </>
            ) : (
              <>
                <Power className="mr-2 h-4 w-4" />
                Enable Student
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Student
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the student 
              record for "{student.student_name}" and all associated fingerprint data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Student
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
