
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SuperFastFingerprintCapture } from '@/components/SuperFastFingerprintCapture';
import DashboardLayout from '@/components/DashboardLayout';
import { Save, ArrowLeft, User, Phone, Mail, MapPin } from 'lucide-react';

interface Batch {
  id: string;
  batch_name: string;
}

export default function SuperFastAddStudent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [studentData, setStudentData] = useState({
    name: '',
    mobile: '',
    email: '',
    batch: '',
    address: ''
  });
  
  const [fingerprints, setFingerprints] = useState<string[]>(['', '', '', '', '']);
  const [images, setImages] = useState<string[]>(['', '', '', '', '']);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load batches on component mount
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

  useState(() => {
    loadBatches();
  });

  const handleInputChange = (field: string, value: string) => {
    setStudentData(prev => ({ ...prev, [field]: value }));
  };

  const handleFingerprintChange = (index: number, value: string) => {
    setFingerprints(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleImageChange = (index: number, imageData: string) => {
    setImages(prev => {
      const updated = [...prev];
      updated[index] = imageData;
      return updated;
    });
  };

  const handleSave = async () => {
    // Basic validation
    if (!studentData.name.trim()) {
      toast.error('Student name is required');
      return;
    }

    if (!studentData.mobile.trim()) {
      toast.error('Mobile number is required');
      return;
    }

    if (!studentData.batch) {
      toast.error('Please select a batch');
      return;
    }

    // Check if at least one fingerprint is captured
    const capturedCount = fingerprints.filter(fp => fp.trim() !== '').length;
    if (capturedCount === 0) {
      toast.error('Please capture at least one fingerprint');
      return;
    }

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('students')
        .insert({
          student_name: studentData.name.trim(),
          batch_id: studentData.batch,
          // Only save non-empty fingerprints and images
          finger_1: (fingerprints[0] && fingerprints[0].trim() !== '') ? fingerprints[0] : null,
          finger_2: (fingerprints[1] && fingerprints[1].trim() !== '') ? fingerprints[1] : null,
          finger_3: (fingerprints[2] && fingerprints[2].trim() !== '') ? fingerprints[2] : null,
          finger_4: (fingerprints[3] && fingerprints[3].trim() !== '') ? fingerprints[3] : null,
          finger_5: (fingerprints[4] && fingerprints[4].trim() !== '') ? fingerprints[4] : null,
          finger_1_image: (images[0] && images[0].trim() !== '') ? images[0] : null,
          finger_2_image: (images[1] && images[1].trim() !== '') ? images[1] : null,
          finger_3_image: (images[2] && images[2].trim() !== '') ? images[2] : null,
          finger_4_image: (images[3] && images[3].trim() !== '') ? images[3] : null,
          finger_5_image: (images[4] && images[4].trim() !== '') ? images[4] : null,
          user_id: user?.id
        })
        .select();

      if (error) throw error;

      console.log('✅ Student saved successfully:', data);
      toast.success(`Student "${studentData.name}" saved with ${capturedCount} fingerprints!`);
      
      // Reset form for next student
      setStudentData({
        name: '',
        mobile: '',
        email: '',
        batch: studentData.batch, // Keep same batch for efficiency
        address: ''
      });
      setFingerprints(['', '', '', '', '']);
      setImages(['', '', '', '', '']);

      toast.success('Form reset. Ready for next student!', { duration: 3000 });

    } catch (error) {
      console.error('❌ Error saving student:', error);
      toast.error('Failed to save student. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const capturedCount = fingerprints.filter(fp => fp.trim() !== '').length;

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/students')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Super Fast Student Registration</h1>
          </div>
          
          <Button
            onClick={handleSave}
            disabled={isLoading || !studentData.name || !studentData.batch}
            className="bg-green-500 hover:bg-green-600"
            size="lg"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Student ({capturedCount}/5 prints)
          </Button>
        </div>

        {/* Student Information Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Student Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center space-x-1">
                  <User className="h-4 w-4" />
                  <span>Student Name *</span>
                </Label>
                <Input
                  id="name"
                  value={studentData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter student name"
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="mobile" className="flex items-center space-x-1">
                  <Phone className="h-4 w-4" />
                  <span>Mobile Number *</span>
                </Label>
                <Input
                  id="mobile"
                  value={studentData.mobile}
                  onChange={(e) => handleInputChange('mobile', e.target.value)}
                  placeholder="Enter mobile number"
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center space-x-1">
                  <Mail className="h-4 w-4" />
                  <span>Email (Optional)</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={studentData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="student@example.com"
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="batch">Select Batch *</Label>
                <Select value={studentData.batch} onValueChange={(value) => handleInputChange('batch', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.batch_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mt-4 space-y-2">
              <Label htmlFor="address" className="flex items-center space-x-1">
                <MapPin className="h-4 w-4" />
                <span>Complete Address</span>
              </Label>
              <Textarea
                id="address"
                value={studentData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Enter complete address"
                rows={2}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Super Fast Fingerprint Capture */}
        <Card>
          <CardHeader>
            <CardTitle>Super Fast Fingerprint Capture</CardTitle>
            <p className="text-sm text-gray-600">
              Device connects once and stays ready. Capture all 5 fingers one by one, super fast!
            </p>
          </CardHeader>
          <CardContent>
            <SuperFastFingerprintCapture
              fingerprints={fingerprints}
              images={images}
              onFingerprintChange={handleFingerprintChange}
              onImageChange={handleImageChange}
              targetQuality={60}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
