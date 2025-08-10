import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Save, X } from 'lucide-react';

interface CreateBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateBatchDialog = ({ open, onOpenChange }: CreateBatchDialogProps) => {
  const [formData, setFormData] = useState({
    batch_name: '',
    serial_number: '',
    admin_name: '',
    username: '',
    max_students: 50
  });

  const queryClient = useQueryClient();

  // Generate next serial number
  const generateNextSerialNumber = async (): Promise<string> => {
    const { data: existingBatches } = await supabase
      .from('batches')
      .select('serial_number')
      .order('serial_number', { ascending: false });
    
    if (!existingBatches || existingBatches.length === 0) {
      return '1';
    }
    
    // Find the highest numeric serial number
    const maxSerial = existingBatches
      .map(batch => parseInt(batch.serial_number))
      .filter(num => !isNaN(num))
      .reduce((max, current) => Math.max(max, current), 0);
    
    return (maxSerial + 1).toString();
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      console.log('🚀 Creating batch with data:', data);
      
      // Auto-generate serial number if not provided
      let serialNumber = data.serial_number;
      if (!serialNumber) {
        console.log('📝 Auto-generating serial number...');
        serialNumber = await generateNextSerialNumber();
        console.log('✅ Generated serial number:', serialNumber);
      } else {
        console.log('🔍 Checking if serial number exists:', serialNumber);
        // Check if serial number already exists
        const { data: existingBatch, error: checkError } = await supabase
          .from('batches')
          .select('id')
          .eq('serial_number', serialNumber)
          .maybeSingle();
        
        console.log('🔍 Check result:', { existingBatch, checkError });
        
        if (checkError && checkError.code !== 'PGRST116') {
          console.error('❌ Error checking serial number:', checkError);
          throw checkError;
        }
        
        if (existingBatch) {
          console.log('❌ Serial number already exists');
          throw new Error(`Serial number "${serialNumber}" already exists. Please use a different serial number.`);
        }
      }
      
      const currentUser = await supabase.auth.getUser();
      console.log('👤 Current user:', currentUser.data.user?.id);
      
      const insertData = {
        ...data,
        serial_number: serialNumber,
        user_id: currentUser.data.user?.id
      };
      
      console.log('💾 Inserting batch data:', insertData);
      
      const { data: insertResult, error } = await supabase
        .from('batches')
        .insert([insertData])
        .select();
        
      console.log('💾 Insert result:', { insertResult, error });
      
      if (error) {
        console.error('❌ Insert error:', error);
        if (error.code === '23505') {
          throw new Error(`Serial number "${serialNumber}" already exists. Please use a different serial number.`);
        }
        throw error;
      }
      
      console.log('✅ Batch created successfully:', insertResult);
      return insertResult;
    },
    onSuccess: (result) => {
      console.log('🎉 Batch creation success:', result);
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      toast.success('Batch created successfully');
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      console.error('❌ Batch creation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create batch';
      toast.error(errorMessage);
    }
  });

  const resetForm = () => {
    setFormData({
      batch_name: '',
      serial_number: '',
      admin_name: '',
      username: '',
      max_students: 50
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleAutoGenerateSerial = async () => {
    try {
      const nextSerial = await generateNextSerialNumber();
      setFormData(prev => ({ ...prev, serial_number: nextSerial }));
      toast.success(`Generated serial number: ${nextSerial}`);
    } catch (error) {
      toast.error('Error generating serial number');
    }
  };

  // Auto-generate serial number when dialog opens
  React.useEffect(() => {
    if (open && !formData.serial_number) {
      handleAutoGenerateSerial();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md glass-card border-foreground/10">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-foreground">
            <Plus className="h-5 w-5 text-emerald-green" />
            <span>Create New Batch</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="batch_name" className="text-foreground">Batch Name</Label>
            <Input
              id="batch_name"
              value={formData.batch_name}
              onChange={(e) => setFormData(prev => ({ ...prev, batch_name: e.target.value }))}
              placeholder="Enter batch name"
              required
              disabled={createMutation.isPending}
              className="glass bg-background border-foreground/20 focus:border-electric-blue"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serial_number" className="text-foreground">Serial Number</Label>
            <div className="flex space-x-2">
              <Input
                id="serial_number"
                value={formData.serial_number}
                onChange={(e) => setFormData(prev => ({ ...prev, serial_number: e.target.value }))}
                placeholder="Auto-generated"
                required
                disabled={createMutation.isPending}
                className="glass bg-background border-foreground/20 focus:border-electric-blue"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAutoGenerateSerial}
                disabled={createMutation.isPending}
                className="whitespace-nowrap glass-card"
              >
                Auto
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Serial number will be auto-generated if left empty
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin_name" className="text-foreground">Admin Name</Label>
            <Input
              id="admin_name"
              value={formData.admin_name}
              onChange={(e) => setFormData(prev => ({ ...prev, admin_name: e.target.value }))}
              placeholder="Enter admin name"
              required
              disabled={createMutation.isPending}
              className="glass bg-background border-foreground/20 focus:border-electric-blue"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username" className="text-foreground">Username</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              placeholder="Enter username"
              required
              disabled={createMutation.isPending}
              className="glass bg-background border-foreground/20 focus:border-electric-blue"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_students" className="text-foreground">Max Students</Label>
            <Input
              id="max_students"
              type="number"
              value={formData.max_students}
              onChange={(e) => setFormData(prev => ({ ...prev, max_students: parseInt(e.target.value) || 0 }))}
              placeholder="Enter max students"
              min={1}
              required
              disabled={createMutation.isPending}
              className="glass bg-background border-foreground/20 focus:border-electric-blue"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
              className="glass-card"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-emerald-green hover:bg-emerald-green/90 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {createMutation.isPending ? 'Creating...' : 'Create Batch'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};