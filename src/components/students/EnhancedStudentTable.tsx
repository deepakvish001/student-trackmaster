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
import { CheckCircle, XCircle, Fingerprint } from 'lucide-react';

interface EnhancedStudentTableProps {
  students: Student[];
  onEdit: (student: Student) => void;
  onDelete: (studentId: string) => void;
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

  const getFingerprintImageUrl = (fingerprintData: string | null) => {
    if (!fingerprintData) return null;
    
    // Check if it's already a data URL
    if (fingerprintData.startsWith('data:image/')) {
      return fingerprintData;
    }
    
    // If it's a very long string (image data), treat it as base64
    if (fingerprintData.length > 50000) {
      return `data:image/png;base64,${fingerprintData}`;
    }
    
    return null;
  };

  const renderFingerprintPreview = (student: Student, index: number) => {
    // Use the specific image field for each finger
    const imageFields = [
      student.finger_1_image,
      student.finger_2_image, 
      student.finger_3_image,
      student.finger_4_image,
      student.finger_5_image
    ];
    
    const fingerprintData = imageFields[index];
    const imageUrl = getFingerprintImageUrl(fingerprintData);
    
    if (imageUrl) {
      return (
        <div className="w-16 h-20 border rounded overflow-hidden bg-gray-50 shadow-sm">
          <img 
            src={imageUrl}
            alt={`Finger ${index + 1}`}
            className="w-full h-full object-contain"
            style={{
              filter: 'contrast(1.3) brightness(1.15) saturate(1.1)',
              imageRendering: 'crisp-edges'
            }}
          />
        </div>
      );
    }
    
    return (
      <div className="w-16 h-20 border rounded flex items-center justify-center bg-gray-100">
        <Fingerprint className="h-5 w-5 text-gray-400" />
        <span className="sr-only">No fingerprint {index + 1}</span>
      </div>
    );
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead className="text-center">Fingerprint Images</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No students found. Add your first student to get started.
                </TableCell>
              </TableRow>
            ) : (
              students.map((student) => (
                <TableRow key={student.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    {student.student_name}
                  </TableCell>
                  <TableCell className="text-sm">
                    {student.mobile_number || (
                      <span className="text-gray-500">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">
                    {student.address || (
                      <span className="text-gray-500">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {student.batches?.batch_name || (
                      <span className="text-gray-500 text-sm">No Batch</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2 justify-center items-center">
                      {renderFingerprintPreview(student, 0)}
                      {renderFingerprintPreview(student, 1)}
                      {renderFingerprintPreview(student, 2)}
                      {renderFingerprintPreview(student, 3)}
                      {renderFingerprintPreview(student, 4)}
                    </div>
                    <div className="text-center mt-2">
                      <span className="text-xs text-gray-500 font-medium">
                        {getFingerprintCount(student)}/5 captured
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={student.is_enabled ? "default" : "secondary"}>
                      {student.is_enabled ? "Active" : "Inactive"}
                    </Badge>
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
