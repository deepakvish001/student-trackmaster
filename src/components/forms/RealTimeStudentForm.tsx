
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, Phone, MapPin, GraduationCap } from 'lucide-react';

interface Batch {
  id: string;
  batch_name: string;
}

interface RealTimeStudentFormProps {
  studentId?: string;
  onStudentIdChange: (id: string) => void;
}

export function RealTimeStudentForm({ studentId, onStudentIdChange }: RealTimeStudentFormProps) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    student_name: '',
    mobile_number: '',
    batch_id: '',
    address: ''
  });
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Get user from supabase auth directly instead of context
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Error getting user:', error);
      }
    };
    getUser();
  }, []);

  // Load batches on mount
  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    try {
      const { data, error } = await supabase
        .from('batches')
        .select('id, batch_name')
        .eq('is_enabled', true)
        .order('batch_name');

      if (error) throw error;
      setBatches(data || []);
    } catch (error) {
      console.error('Error loading batches:', error);
      toast.error('Failed to load batches');
    }
  };

  const saveToDatabase = async (data: typeof formData, isUpdate: boolean = false) => {
    if (!user?.id || !data.student_name.trim()) return;

    try {
      if (isUpdate && studentId) {
        // Update existing student
        const { error } = await supabase
          .from('students')
          .update({
            student_name: data.student_name.trim(),
            mobile_number: data.mobile_number || null,
            batch_id: data.batch_id || null,
            address: data.address || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', studentId);

        if (error) throw error;
        console.log('✅ Student updated in real-time:', studentId);
      } else {
        // Create new student
        const { data: newStudent, error } = await supabase
          .from('students')
          .insert({
            student_name: data.student_name.trim(),
            mobile_number: data.mobile_number || null,
            batch_id: data.batch_id || null,
            address: data.address || null,
            user_id: user.id
          })
          .select()
          .single();

        if (error) throw error;
        if (newStudent) {
          onStudentIdChange(newStudent.id);
          console.log('✅ Student created in real-time:', newStudent.id);
        }
      }
    } catch (error) {
      console.error('❌ Error saving student:', error);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);

    // Clear existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    // Set new timeout for auto-save (500ms delay)
    const timeout = setTimeout(() => {
      if (updatedData.student_name.trim()) {
        saveToDatabase(updatedData, !!studentId);
      }
    }, 500);

    setSaveTimeout(timeout);
  };

  // Don't render if no user (auth not available)
  if (!user) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-slate-500">
          <p>Loading authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Student Name */}
        <div className="space-y-3">
          <Label htmlFor="student_name" className="text-sm font-medium text-slate-700 flex items-center space-x-2">
            <User className="h-4 w-4 text-slate-500" />
            <span>Student Name *</span>
          </Label>
          <Input
            id="student_name"
            value={formData.student_name}
            onChange={(e) => handleInputChange('student_name', e.target.value)}
            placeholder="Enter full name"
            className="h-11 border-slate-300 focus:border-blue-500 focus:ring-blue-500/20"
          />
          {formData.student_name && (
            <div className="text-xs text-green-600 flex items-center space-x-1">
              <div className="w-1 h-1 bg-green-500 rounded-full"></div>
              <span>Auto-saving...</span>
            </div>
          )}
        </div>

        {/* Mobile Number */}
        <div className="space-y-3">
          <Label htmlFor="mobile_number" className="text-sm font-medium text-slate-700 flex items-center space-x-2">
            <Phone className="h-4 w-4 text-slate-500" />
            <span>Mobile Number</span>
          </Label>
          <Input
            id="mobile_number"
            value={formData.mobile_number}
            onChange={(e) => handleInputChange('mobile_number', e.target.value)}
            placeholder="+91 98765 43210"
            className="h-11 border-slate-300 focus:border-blue-500 focus:ring-blue-500/20"
          />
        </div>

        {/* Batch */}
        <div className="space-y-3">
          <Label htmlFor="batch_id" className="text-sm font-medium text-slate-700 flex items-center space-x-2">
            <GraduationCap className="h-4 w-4 text-slate-500" />
            <span>Batch *</span>
          </Label>
          <Select 
            value={formData.batch_id} 
            onValueChange={(value) => handleInputChange('batch_id', value)}
          >
            <SelectTrigger className="h-11 border-slate-300 focus:border-blue-500 focus:ring-blue-500/20">
              <SelectValue placeholder="Select batch" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200">
              {batches.map((batch) => (
                <SelectItem key={batch.id} value={batch.id} className="hover:bg-blue-50">
                  {batch.batch_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Address */}
        <div className="space-y-3">
          <Label htmlFor="address" className="text-sm font-medium text-slate-700 flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-slate-500" />
            <span>Address</span>
          </Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            placeholder="Enter address"
            className="h-11 border-slate-300 focus:border-blue-500 focus:ring-blue-500/20"
          />
        </div>
      </div>
    </div>
  );
}
