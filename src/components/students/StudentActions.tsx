
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
              background: #f8f9fa;
              color: #2d3748;
              line-height: 1.6;
            }
            .sidebar {
              position: fixed;
              left: 0;
              top: 0;
              width: 250px;
              height: 100vh;
              background: #2c3e50;
              color: white;
              padding: 20px 0;
              z-index: 1000;
            }
            .sidebar .user-info {
              padding: 20px;
              border-bottom: 1px solid #34495e;
              display: flex;
              align-items: center;
              margin-bottom: 20px;
            }
            .sidebar .user-avatar {
              width: 40px;
              height: 40px;
              background: #3498db;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-right: 12px;
              font-weight: bold;
            }
            .sidebar .menu-item {
              display: flex;
              align-items: center;
              padding: 15px 20px;
              color: #ecf0f1;
              text-decoration: none;
              transition: background 0.3s;
            }
            .sidebar .menu-item:hover {
              background: #34495e;
            }
            .sidebar .menu-item.active {
              background: #3498db;
            }
            .sidebar .menu-icon {
              margin-right: 12px;
              font-size: 18px;
            }
            .header {
              position: fixed;
              top: 0;
              left: 250px;
              right: 0;
              height: 60px;
              background: white;
              border-bottom: 1px solid #e2e8f0;
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 0 30px;
              z-index: 999;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header h1 {
              font-size: 24px;
              font-weight: 600;
              color: #2d3748;
            }
            .header .breadcrumb {
              color: #718096;
              font-size: 14px;
            }
            .header .breadcrumb a {
              color: #3498db;
              text-decoration: none;
            }
            .header .user-actions {
              display: flex;
              align-items: center;
              gap: 15px;
            }
            .main-content {
              margin-left: 250px;
              margin-top: 60px;
              padding: 30px;
              min-height: calc(100vh - 60px);
            }
            .finger-list-container {
              background: white;
              border-radius: 8px;
              padding: 30px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .finger-list-header {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px 8px 0 0;
              border-bottom: 2px solid #3498db;
              margin: -30px -30px 30px -30px;
            }
            .finger-list-header h2 {
              font-size: 20px;
              color: #2d3748;
              margin: 0;
            }
            .finger-grid {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 30px;
              max-width: 1200px;
              margin: 0 auto;
            }
            .finger-item {
              text-align: center;
              background: #fff;
              border-radius: 8px;
              padding: 20px;
              border: 2px solid #e2e8f0;
              transition: all 0.3s ease;
              position: relative;
            }
            .finger-item::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 4px;
              background: linear-gradient(90deg, #3498db 0%, #2980b9 100%);
              border-radius: 8px 8px 0 0;
            }
            .finger-item:hover {
              border-color: #3498db;
              box-shadow: 0 8px 25px rgba(52, 152, 219, 0.15);
              transform: translateY(-3px);
            }
            .finger-label {
              color: #2d3748;
              font-weight: 600;
              font-size: 16px;
              margin-bottom: 15px;
            }
            .finger-image-container {
              width: 180px;
              height: 180px;
              margin: 0 auto 15px;
              border: 3px solid #e2e8f0;
              border-radius: 8px;
              overflow: hidden;
              background: #f8f9fa;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .finger-image {
              width: 100%;
              height: 100%;
              object-fit: cover;
              filter: contrast(1.2) brightness(1.1);
            }
            .no-print {
              color: #a0aec0;
              font-size: 14px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100%;
            }
            .no-print-icon {
              font-size: 32px;
              margin-bottom: 8px;
              opacity: 0.5;
            }
            .footer {
              position: fixed;
              bottom: 0;
              left: 250px;
              right: 0;
              padding: 15px 30px;
              background: white;
              border-top: 1px solid #e2e8f0;
              color: #718096;
              font-size: 12px;
              text-align: center;
            }
            @media (max-width: 768px) {
              .sidebar {
                transform: translateX(-100%);
              }
              .header {
                left: 0;
              }
              .main-content {
                margin-left: 0;
              }
              .footer {
                left: 0;
              }
              .finger-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
              }
            }
          </style>
        </head>
        <body>
          <!-- Sidebar -->
          <div class="sidebar">
            <div class="user-info">
              <div class="user-avatar">A</div>
              <div>
                <div style="font-weight: 600;">AdminLTE USER</div>
                <div style="font-size: 12px; color: #bdc3c7;">User</div>
              </div>
            </div>
            <a href="#" class="menu-item">
              <span class="menu-icon">📊</span>
              Dashboard
            </a>
            <a href="#" class="menu-item active">
              <span class="menu-icon">👥</span>
              Student List
            </a>
            <a href="#" class="menu-item">
              <span class="menu-icon">📋</span>
              Batch List
            </a>
            <a href="#" class="menu-item">
              <span class="menu-icon">📥</span>
              Download
            </a>
          </div>

          <!-- Header -->
          <div class="header">
            <div>
              <h1>Student Finger List</h1>
            </div>
            <div class="breadcrumb">
              <a href="#">Home</a> / Student Finger List
            </div>
            <div class="user-actions">
              <button style="background: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                Logout
              </button>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; width: 24px; height: 24px;">
                <div style="background: #3498db; border-radius: 2px;"></div>
                <div style="background: #3498db; border-radius: 2px;"></div>
                <div style="background: #3498db; border-radius: 2px;"></div>
                <div style="background: #3498db; border-radius: 2px;"></div>
                <div style="background: #3498db; border-radius: 2px;"></div>
                <div style="background: #3498db; border-radius: 2px;"></div>
                <div style="background: #3498db; border-radius: 2px;"></div>
                <div style="background: #3498db; border-radius: 2px;"></div>
                <div style="background: #3498db; border-radius: 2px;"></div>
              </div>
            </div>
          </div>

          <!-- Main Content -->
          <div class="main-content">
            <div class="finger-list-container">
              <div class="finger-list-header">
                <h2>Finger List</h2>
              </div>
              
              <div class="finger-grid">
                <div class="finger-item">
                  <div class="finger-label">Finger 1</div>
                  <div class="finger-image-container">
                    ${student.finger_1_image ? 
                      `<img src="${student.finger_1_image}" alt="Finger 1" class="finger-image" />` : 
                      `<div class="no-print">
                         <div class="no-print-icon">👆</div>
                         <div>No Print</div>
                       </div>`
                    }
                  </div>
                </div>
                
                <div class="finger-item">
                  <div class="finger-label">Finger 2</div>
                  <div class="finger-image-container">
                    ${student.finger_2_image ? 
                      `<img src="${student.finger_2_image}" alt="Finger 2" class="finger-image" />` : 
                      `<div class="no-print">
                         <div class="no-print-icon">👆</div>
                         <div>No Print</div>
                       </div>`
                    }
                  </div>
                </div>
                
                <div class="finger-item">
                  <div class="finger-label">Finger 3</div>
                  <div class="finger-image-container">
                    ${student.finger_3_image ? 
                      `<img src="${student.finger_3_image}" alt="Finger 3" class="finger-image" />` : 
                      `<div class="no-print">
                         <div class="no-print-icon">👆</div>
                         <div>No Print</div>
                       </div>`
                    }
                  </div>
                </div>
                
                <div class="finger-item">
                  <div class="finger-label">Finger 4</div>
                  <div class="finger-image-container">
                    ${student.finger_4_image ? 
                      `<img src="${student.finger_4_image}" alt="Finger 4" class="finger-image" />` : 
                      `<div class="no-print">
                         <div class="no-print-icon">👆</div>
                         <div>No Print</div>
                       </div>`
                    }
                  </div>
                </div>
                
                <div class="finger-item">
                  <div class="finger-label">Finger 5</div>
                  <div class="finger-image-container">
                    ${student.finger_5_image ? 
                      `<img src="${student.finger_5_image}" alt="Finger 5" class="finger-image" />` : 
                      `<div class="no-print">
                         <div class="no-print-icon">👆</div>
                         <div>No Print</div>
                       </div>`
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            Copyright © 2014-2021 <strong style="color: #3498db;">AdminLTE.io</strong>. All rights reserved.
            <span style="float: right;">Version 3.2.0</span>
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
