
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Student } from '@/types';
import { StudentFingerprintView } from '@/components/StudentFingerprintView';
import { User, Calendar, Hash, Building } from 'lucide-react';

interface StudentDetailsDialogProps {
  student: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudentDetailsDialog({ student, open, onOpenChange }: StudentDetailsDialogProps) {
  if (!student) return null;

  // Debug logging to help identify data issues
  console.log('StudentDetailsDialog - Student data:', {
    id: student.id,
    name: student.student_name,
    batchId: student.batch_id,
    hasFingerprints: {
      finger_1: !!student.finger_1,
      finger_2: !!student.finger_2,
      finger_3: !!student.finger_3,
      finger_4: !!student.finger_4,
      finger_5: !!student.finger_5,
      finger_1_image: !!student.finger_1_image,
      finger_2_image: !!student.finger_2_image,
      finger_3_image: !!student.finger_3_image,
      finger_4_image: !!student.finger_4_image,
      finger_5_image: !!student.finger_5_image,
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>{student.student_name}</span>
            <Badge variant={student.is_enabled ? "default" : "secondary"}>
              {student.is_enabled ? "Active" : "Inactive"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Student Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Hash className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Student ID:</span>
              <span className="text-sm">{student.id}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Building className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Batch:</span>
              <span className="text-sm">{student.batches?.batch_name || 'No Batch Assigned'}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Created:</span>
              <span className="text-sm">{new Date(student.created_at).toLocaleDateString()}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Updated:</span>
              <span className="text-sm">{new Date(student.updated_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Fingerprints */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Fingerprint Data</h3>
            <StudentFingerprintView
              student={{
                finger_1: student.finger_1,
                finger_2: student.finger_2,
                finger_3: student.finger_3,
                finger_4: student.finger_4,
                finger_5: student.finger_5,
                finger_1_image: student.finger_1_image,
                finger_2_image: student.finger_2_image,
                finger_3_image: student.finger_3_image,
                finger_4_image: student.finger_4_image,
                finger_5_image: student.finger_5_image,
              }}
              showQuality={true}
            />
          </div>

          {/* Debug Information */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">Debug Information:</h4>
            <div className="text-xs text-blue-700 space-y-1">
              <div>Student ID: {student.id}</div>
              <div>Batch ID: {student.batch_id || 'None'}</div>
              <div>Is Enabled: {student.is_enabled ? 'Yes' : 'No'}</div>
              <div>Template Data Available: {[
                student.finger_1, student.finger_2, student.finger_3, 
                student.finger_4, student.finger_5
              ].filter(Boolean).length} fingers</div>
              <div>Image Data Available: {[
                student.finger_1_image, student.finger_2_image, student.finger_3_image,
                student.finger_4_image, student.finger_5_image
              ].filter(Boolean).length} fingers</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
