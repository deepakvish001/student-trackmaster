
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Student } from '@/types';
import { User, GraduationCap, Save, X } from 'lucide-react';

interface EditStudentDialogProps {
  student: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updates: Partial<Student>) => void;
  batches: Array<{ id: string; batch_name: string; }>;
  isUpdating?: boolean;
}

export function EditStudentDialog({ 
  student, 
  open, 
  onOpenChange, 
  onUpdate, 
  batches, 
  isUpdating = false 
}: EditStudentDialogProps) {
  const [formData, setFormData] = useState({
    student_name: '',
    batch_id: ''
  });

  useEffect(() => {
    if (student) {
      setFormData({
        student_name: student.student_name || '',
        batch_id: student.batch_id || 'no-batch'
      });
    }
  }, [student]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    onUpdate({
      student_name: formData.student_name,
      batch_id: formData.batch_id === 'no-batch' ? null : formData.batch_id
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    setFormData({ student_name: '', batch_id: '' });
  };

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Edit Student</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="student_name">Student Name</Label>
            <Input
              id="student_name"
              value={formData.student_name}
              onChange={(e) => setFormData(prev => ({ ...prev, student_name: e.target.value }))}
              placeholder="Enter student name"
              required
              disabled={isUpdating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="batch_id">Batch</Label>
            <Select
              value={formData.batch_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, batch_id: value }))}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a batch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-batch">No Batch</SelectItem>
                {batches.map((batch) => (
                  <SelectItem key={batch.id} value={batch.id}>
                    <div className="flex items-center space-x-2">
                      <GraduationCap className="h-4 w-4" />
                      <span>{batch.batch_name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isUpdating}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUpdating || !formData.student_name.trim()}
            >
              <Save className="h-4 w-4 mr-2" />
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
