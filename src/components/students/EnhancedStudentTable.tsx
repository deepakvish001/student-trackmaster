
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Student } from '@/types';
import { StudentActions } from './StudentActions';
import { StudentDetailsDialog } from './StudentDetailsDialog';
import { CheckCircle, XCircle } from 'lucide-react';

interface EnhancedStudentTableProps {
  students: Student[];
  onEdit: (student: Student) => void;
  onDelete: (studentId: number) => void;
}

export function EnhancedStudentTable({ students, onEdit, onDelete }: EnhancedStudentTableProps) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student);
    setShowDetailsDialog(true);
  };

  const getFingerprintCount = (student: Student) => {
    const fingerprints = [
      student.finger_1,
      student.finger_2,
      student.finger_3,
      student.finger_4,
      student.finger_5,
    ];
    return fingerprints.filter(Boolean).length;
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Fingerprints</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No students found. Add your first student to get started.
                </TableCell>
              </TableRow>
            ) : (
              students.map((student) => (
                <TableRow key={student.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    {student.student_name}
                  </TableCell>
                  <TableCell>
                    {student.batches?.batch_name || (
                      <span className="text-gray-500 text-sm">No Batch</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">
                        {getFingerprintCount(student)}/5
                      </span>
                      {getFingerprintCount(student) > 0 ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={student.is_enabled ? "default" : "secondary"}>
                      {student.is_enabled ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {new Date(student.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <StudentActions
                      student={student}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onView={handleViewStudent}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <StudentDetailsDialog
        student={selectedStudent}
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
      />
    </>
  );
}
