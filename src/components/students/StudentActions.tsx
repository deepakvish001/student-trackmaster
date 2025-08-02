
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

  const handleDelete = () => {
    onDelete(student.id);
    setShowDeleteDialog(false);
  };

  const handleView = () => {
    const fingerprintId = Math.random().toString(36).substr(2, 9).toUpperCase();
    
    const newWindow = window.open('', '_blank', 'width=1400,height=900');
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Student Finger List - ${student.student_name}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: #f5f7fa;
              color: #2d3748;
              line-height: 1.6;
            }
            .header {
              background: #2d3748;
              color: white;
              padding: 20px;
              border-bottom: 3px solid #4299e1;
            }
            .header h1 {
              font-size: 28px;
              font-weight: 600;
              margin-bottom: 8px;
            }
            .breadcrumb {
              color: #a0aec0;
              font-size: 14px;
            }
            .breadcrumb a {
              color: #4299e1;
              text-decoration: none;
            }
            .container {
              max-width: 1200px;
              margin: 0 auto;
              padding: 30px;
            }
            .student-info {
              background: white;
              border-radius: 12px;
              padding: 25px;
              margin-bottom: 30px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.05);
              border: 1px solid #e2e8f0;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              gap: 20px;
              margin-bottom: 20px;
            }
            .info-item {
              display: flex;
              flex-direction: column;
            }
            .info-label {
              font-weight: 600;
              color: #4a5568;
              font-size: 14px;
              margin-bottom: 5px;
            }
            .info-value {
              font-size: 16px;
              color: #2d3748;
            }
            .fingerprint-id {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 12px 20px;
              border-radius: 8px;
              text-align: center;
              font-weight: 600;
              font-size: 18px;
              letter-spacing: 2px;
            }
            .status-badge {
              padding: 6px 12px;
              border-radius: 20px;
              font-weight: 600;
              font-size: 14px;
            }
            .status-enabled {
              background: #48bb78;
              color: white;
            }
            .status-disabled {
              background: #f56565;
              color: white;
            }
            .finger-section {
              background: white;
              border-radius: 12px;
              padding: 25px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.05);
              border: 1px solid #e2e8f0;
            }
            .finger-section h2 {
              font-size: 24px;
              margin-bottom: 25px;
              color: #2d3748;
              text-align: center;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 15px;
            }
            .finger-grid {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 25px;
              max-width: 1000px;
              margin: 0 auto;
            }
            .finger-item {
              text-align: center;
              background: #f8fafc;
              border-radius: 12px;
              padding: 20px;
              border: 2px solid #e2e8f0;
              transition: all 0.3s ease;
            }
            .finger-item:hover {
              border-color: #4299e1;
              box-shadow: 0 8px 25px rgba(66, 153, 225, 0.15);
              transform: translateY(-2px);
            }
            .finger-tab {
              background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
              color: white;
              padding: 8px 16px;
              border-radius: 8px 8px 0 0;
              font-weight: 600;
              font-size: 16px;
              margin: -20px -20px 15px -20px;
            }
            .finger-image {
              width: 140px;
              height: 140px;
              object-fit: cover;
              border-radius: 8px;
              border: 3px solid #e2e8f0;
              background: #f0f4f7;
              margin: 0 auto;
              display: block;
            }
            .no-print {
              width: 140px;
              height: 140px;
              background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 8px;
              border: 3px dashed #cbd5e0;
              color: #a0aec0;
              font-size: 14px;
              font-weight: 500;
              margin: 0 auto;
              flex-direction: column;
            }
            .no-print-icon {
              font-size: 24px;
              margin-bottom: 8px;
            }
            .quality-badge {
              background: #38a169;
              color: white;
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 600;
              margin-top: 8px;
              display: inline-block;
            }
            @media (max-width: 768px) {
              .finger-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
              }
              .info-grid {
                grid-template-columns: 1fr;
              }
              .container {
                padding: 15px;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Student Finger List</h1>
            <div class="breadcrumb">
              <a href="#">Home</a> / Student Finger List
            </div>
          </div>
          
          <div class="container">
            <div class="student-info">
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Student Name</div>
                  <div class="info-value">${student.student_name}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Mobile Number</div>
                  <div class="info-value">${student.id.slice(-10)}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Batch</div>
                  <div class="info-value">${student.batches?.batch_name || 'No Batch Assigned'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Address</div>
                  <div class="info-value">Not Available</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Status</div>
                  <div class="info-value">
                    <span class="status-badge ${student.is_enabled ? 'status-enabled' : 'status-disabled'}">
                      ${student.is_enabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                </div>
                <div class="info-item">
                  <div class="info-label">Fingerprint ID</div>
                  <div class="fingerprint-id">${fingerprintId}</div>
                </div>
              </div>
            </div>
            
            <div class="finger-section">
              <h2>Finger List</h2>
              <div class="finger-grid">
                <div class="finger-item">
                  <div class="finger-tab">Finger 1</div>
                  ${student.finger_1_image ? 
                    `<img src="${student.finger_1_image}" alt="Finger 1" class="finger-image" />
                     <div class="quality-badge">Quality: Good</div>` : 
                    `<div class="no-print">
                       <div class="no-print-icon">👆</div>
                       <div>No Print</div>
                     </div>`
                  }
                </div>
                <div class="finger-item">
                  <div class="finger-tab">Finger 2</div>
                  ${student.finger_2_image ? 
                    `<img src="${student.finger_2_image}" alt="Finger 2" class="finger-image" />
                     <div class="quality-badge">Quality: Good</div>` : 
                    `<div class="no-print">
                       <div class="no-print-icon">👆</div>
                       <div>No Print</div>
                     </div>`
                  }
                </div>
                <div class="finger-item">
                  <div class="finger-tab">Finger 3</div>
                  ${student.finger_3_image ? 
                    `<img src="${student.finger_3_image}" alt="Finger 3" class="finger-image" />
                     <div class="quality-badge">Quality: Good</div>` : 
                    `<div class="no-print">
                       <div class="no-print-icon">👆</div>
                       <div>No Print</div>
                     </div>`
                  }
                </div>
                <div class="finger-item">
                  <div class="finger-tab">Finger 4</div>
                  ${student.finger_4_image ? 
                    `<img src="${student.finger_4_image}" alt="Finger 4" class="finger-image" />
                     <div class="quality-badge">Quality: Good</div>` : 
                    `<div class="no-print">
                       <div class="no-print-icon">👆</div>
                       <div>No Print</div>
                     </div>`
                  }
                </div>
                <div class="finger-item">
                  <div class="finger-tab">Finger 5</div>
                  ${student.finger_5_image ? 
                    `<img src="${student.finger_5_image}" alt="Finger 5" class="finger-image" />
                     <div class="quality-badge">Quality: Good</div>` : 
                    `<div class="no-print">
                       <div class="no-print-icon">👆</div>
                       <div>No Print</div>
                     </div>`
                  }
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `);
      newWindow.document.close();
    }
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
