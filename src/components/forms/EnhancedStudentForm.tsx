
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { EnhancedInput } from '@/components/ui/enhanced-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin,
  GraduationCap,
  Hash
} from 'lucide-react';
import { toast } from 'sonner';

const studentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  rollNumber: z.string().min(1, 'Roll number is required'),
  batch: z.string().min(1, 'Please select a batch'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  address: z.string().min(10, 'Address must be at least 10 characters'),
  guardianName: z.string().min(2, 'Guardian name must be at least 2 characters'),
  guardianPhone: z.string().min(10, 'Guardian phone must be at least 10 digits'),
});

type StudentFormData = z.infer<typeof studentSchema>;

interface EnhancedStudentFormProps {
  onSubmit: (data: StudentFormData) => void;
  isLoading?: boolean;
  initialData?: Partial<StudentFormData>;
  availableBatches: Array<{ id: string; name: string; }>;
}

export function EnhancedStudentForm({
  onSubmit,
  isLoading = false,
  initialData,
  availableBatches
}: EnhancedStudentFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid, dirtyFields }
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: initialData,
    mode: 'onChange'
  });

  const watchedBatch = watch('batch');

  const handleFormSubmit = (data: StudentFormData) => {
    try {
      onSubmit(data);
      toast.success('Student information saved successfully!');
    } catch (error) {
      toast.error('Failed to save student information. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Personal Information */}
      <EnhancedCard
        title="Personal Information"
        description="Basic student details and contact information"
        icon={User}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EnhancedInput
            label="Full Name"
            placeholder="Enter student's full name"
            leftIcon={<User className="h-4 w-4" />}
            error={errors.name?.message}
            success={dirtyFields.name && !errors.name ? 'Valid name' : undefined}
            required
            {...register('name')}
          />

          <EnhancedInput
            label="Email Address"
            type="email"
            placeholder="student@example.com"
            leftIcon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
            success={dirtyFields.email && !errors.email ? 'Valid email' : undefined}
            required
            {...register('email')}
          />

          <EnhancedInput
            label="Phone Number"
            type="tel"
            placeholder="+1 (555) 123-4567"
            leftIcon={<Phone className="h-4 w-4" />}
            error={errors.phone?.message}
            success={dirtyFields.phone && !errors.phone ? 'Valid phone' : undefined}
            required
            {...register('phone')}
          />

          <EnhancedInput
            label="Date of Birth"
            type="date"
            leftIcon={<Calendar className="h-4 w-4" />}
            error={errors.dateOfBirth?.message}
            success={dirtyFields.dateOfBirth && !errors.dateOfBirth ? 'Valid date' : undefined}
            required
            {...register('dateOfBirth')}
          />
        </div>

        <EnhancedInput
          label="Address"
          placeholder="Enter complete address"
          leftIcon={<MapPin className="h-4 w-4" />}
          error={errors.address?.message}
          success={dirtyFields.address && !errors.address ? 'Valid address' : undefined}
          required
          {...register('address')}
        />
      </EnhancedCard>

      {/* Academic Information */}
      <EnhancedCard
        title="Academic Information"
        description="Student's academic details and batch assignment"
        icon={GraduationCap}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EnhancedInput
            label="Roll Number"
            placeholder="Enter roll number"
            leftIcon={<Hash className="h-4 w-4" />}
            error={errors.rollNumber?.message}
            success={dirtyFields.rollNumber && !errors.rollNumber ? 'Valid roll number' : undefined}
            required
            {...register('rollNumber')}
          />

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Batch <span className="text-red-500">*</span>
            </Label>
            <Select
              value={watchedBatch}
              onValueChange={(value) => setValue('batch', value, { shouldValidate: true })}
            >
              <SelectTrigger className={errors.batch ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select a batch" />
              </SelectTrigger>
              <SelectContent>
                {availableBatches.map((batch) => (
                  <SelectItem key={batch.id} value={batch.id}>
                    {batch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.batch && (
              <p className="text-sm text-red-600">{errors.batch.message}</p>
            )}
          </div>
        </div>
      </EnhancedCard>

      {/* Guardian Information */}
      <EnhancedCard
        title="Guardian Information"
        description="Emergency contact and guardian details"
        icon={User}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EnhancedInput
            label="Guardian Name"
            placeholder="Enter guardian's full name"
            leftIcon={<User className="h-4 w-4" />}
            error={errors.guardianName?.message}
            success={dirtyFields.guardianName && !errors.guardianName ? 'Valid name' : undefined}
            required
            {...register('guardianName')}
          />

          <EnhancedInput
            label="Guardian Phone"
            type="tel"
            placeholder="+1 (555) 123-4567"
            leftIcon={<Phone className="h-4 w-4" />}
            error={errors.guardianPhone?.message}
            success={dirtyFields.guardianPhone && !errors.guardianPhone ? 'Valid phone' : undefined}
            required
            {...register('guardianPhone')}
          />
        </div>
      </EnhancedCard>

      {/* Submit Button */}
      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="outline" disabled={isLoading}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!isValid || isLoading}
          size="lg"
          className="min-w-32"
        >
          {isLoading ? 'Saving...' : 'Save Student'}
        </Button>
      </div>
    </form>
  );
}
