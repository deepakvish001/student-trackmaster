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
import { Button } from '@/components/ui/button';
import { Student } from '@/types';
import { StudentActions } from './StudentActions';
import { StudentDetailsDialog } from './StudentDetailsDialog';
import { CheckCircle, XCircle, Fingerprint, Eye, ZoomIn } from 'lucide-react';
import { FullscreenFingerprintPreview } from '@/components/fingerprint/FullscreenFingerprintPreview';

interface EnhancedStudentTableProps {
  students: Student[];
  onEdit: (student: Student) => void;
  onDelete: (studentId: string) => void;
}

export function EnhancedStudentTable({ students, onEdit, onDelete }: EnhancedStudentTableProps) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [fingerprintPreview, setFingerprintPreview] = useState({
    isVisible: false,
    fingerName: '',
    imageData: '',
    quality: 0
  });

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
    
    const fingerNames = [
      "Right Thumb",
      "Right Index", 
      "Right Middle",
      "Left Index",
      "Left Thumb"
    ];
    
    const fingerprintData = imageFields[index];
    const imageUrl = getFingerprintImageUrl(fingerprintData);
    
    if (imageUrl) {
      return (
        <div className="relative group cursor-pointer">
          <div 
            className="w-24 h-28 border-2 border-border rounded-xl overflow-hidden bg-muted/30 shadow-lg hover:shadow-2xl hover:border-electric-blue/50 transition-all duration-300 transform hover:scale-105"
            onClick={() => setFingerprintPreview({
              isVisible: true,
              fingerName: fingerNames[index],
              imageData: imageUrl,
              quality: 95
            })}
          >
            <img 
              src={imageUrl}
              alt={`${fingerNames[index]} fingerprint`}
              className="w-full h-full object-contain transition-all duration-300 group-hover:brightness-110"
              style={{
                filter: 'contrast(1.5) brightness(1.25) saturate(1.3)',
                imageRendering: 'crisp-edges'
              }}
            />
          </div>
          
          {/* Enhanced Hover overlay with + sign and View Full button */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center rounded-xl">
            {/* Plus Icon */}
            <div className="bg-electric-blue/90 rounded-full p-2 mb-2 transform scale-75 group-hover:scale-100 transition-transform duration-300">
              <ZoomIn className="h-4 w-4 text-white" />
            </div>
            
            {/* View Full Button */}
            <Button 
              size="sm" 
              className="bg-white/90 hover:bg-white text-black text-xs px-3 py-1 h-6 rounded-full font-medium transform translate-y-2 group-hover:translate-y-0 transition-all duration-300"
              onClick={(e) => {
                e.stopPropagation();
                setFingerprintPreview({
                  isVisible: true,
                  fingerName: fingerNames[index],
                  imageData: imageUrl,
                  quality: 95
                });
              }}
            >
              View Full
            </Button>
          </div>
          
          {/* Enhanced Finger label */}
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
            <span className="text-xs bg-electric-blue/90 text-white px-3 py-1 rounded-full border border-electric-blue/30 font-bold shadow-lg">
              {index + 1}
            </span>
          </div>
        </div>
      );
    }
    
    // Enhanced empty slot with hover effect
    return (
      <div className="relative group cursor-pointer">
        <div className="w-24 h-28 border-2 border-dashed border-border/50 rounded-xl flex flex-col items-center justify-center bg-muted/10 hover:bg-muted/20 hover:border-electric-blue/30 transition-all duration-300 transform hover:scale-105">
          <Fingerprint className="h-6 w-6 text-muted-foreground/60 mb-1 group-hover:text-electric-blue/70 transition-colors duration-300" />
          <span className="text-xs text-muted-foreground/60 font-medium group-hover:text-electric-blue/70 transition-colors duration-300">{index + 1}</span>
        </div>
        
        {/* Hover overlay for empty slots */}
        <div className="absolute inset-0 bg-gradient-to-t from-electric-blue/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-xl">
          <span className="text-xs text-electric-blue font-medium bg-white/90 px-2 py-1 rounded-full">No Image</span>
        </div>
        
        {/* Finger label for empty slots */}
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
          <span className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full border border-border/50 font-bold shadow-sm">
            {index + 1}
          </span>
        </div>
      </div>
    );
  };

  console.log('🔍 EnhancedStudentTable: Rendering', students.length, 'students');
  
  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name & Mobile</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead className="text-center min-w-[400px]">High-Quality Fingerprint Images</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No students found. Add your first student to get started.
                </TableCell>
              </TableRow>
            ) : (
              students.map((student, index) => {
                console.log('🔍 Rendering student row:', index + 1, student.student_name);
                return (
                <TableRow key={student.id} className="hover:bg-muted/50 hover:text-foreground transition-colors duration-300">
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-medium">{student.student_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {student.mobile_number || '-'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {student.batches?.batch_name || (
                        <span className="text-muted-foreground text-sm">No Batch</span>
                      )}
                      {student.batches?.is_enabled === false && (
                        <Badge variant="destructive" className="text-xs">
                          Disabled
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex space-x-3 justify-center items-center">
                      {renderFingerprintPreview(student, 0)}
                      {renderFingerprintPreview(student, 1)}
                      {renderFingerprintPreview(student, 2)}
                      {renderFingerprintPreview(student, 3)}
                      {renderFingerprintPreview(student, 4)}
                    </div>
                    <div className="text-center mt-3">
                      <Badge 
                        variant={getFingerprintCount(student) === 5 ? "default" : "secondary"}
                        className="text-xs font-medium"
                      >
                        {getFingerprintCount(student)}/5 fingerprints captured
                      </Badge>
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
                );
              })
            )}
          </TableBody>
      </Table>
      </div>

      {/* Fullscreen Fingerprint Preview */}
      <FullscreenFingerprintPreview
        isOpen={fingerprintPreview.isVisible}
        fingerName={fingerprintPreview.fingerName}
        imageData={fingerprintPreview.imageData}
        quality={fingerprintPreview.quality}
        onClose={() => setFingerprintPreview(prev => ({ ...prev, isVisible: false }))}
      />

      <StudentDetailsDialog
        student={selectedStudent}
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
      />
    </>
  );
}
