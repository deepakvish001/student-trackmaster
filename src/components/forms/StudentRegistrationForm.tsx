
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

interface StudentFormData {
  student_name: string;
  mobile_number: string;
  batch_id: string;
  address: string;
}

interface StudentRegistrationFormProps {
  formData: StudentFormData;
  onFormChange: (formData: StudentFormData) => void;
}

export function StudentRegistrationForm({ formData, onFormChange }: StudentRegistrationFormProps) {
  const [batches, setBatches] = useState<Batch[]>([]);

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

  const handleInputChange = (field: keyof StudentFormData, value: string) => {
    const updatedData = { ...formData, [field]: value };
    onFormChange(updatedData);
  };

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
