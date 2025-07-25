
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { supabase } from '@/integrations/supabase/client';
import { Batch } from '@/types';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';

interface BatchCRUDProps {
  batches: Batch[];
}

export function BatchCRUD({ batches }: BatchCRUDProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [formData, setFormData] = useState({
    batch_name: '',
    serial_number: '',
    admin_name: '',
    username: '',
    max_students: 50
  });

  const queryClient = useQueryClient();

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      console.log('Creating batch:', data);
      const { error } = await supabase
        .from('batches')
        .insert([{
          ...data,
          user_id: (await supabase.auth.getUser()).data.user?.id
        }]);
      if (error) {
        console.error('Create error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      toast.success('Batch created successfully');
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Error creating batch:', error);
      toast.error('Failed to create batch');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      console.log('Updating batch:', id, data);
      const { error } = await supabase
        .from('batches')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      if (error) {
        console.error('Update error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      toast.success('Batch updated successfully');
      setShowEditDialog(false);
      setSelectedBatch(null);
      resetForm();
    },
    onError: (error) => {
      console.error('Error updating batch:', error);
      toast.error('Failed to update batch');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('Deleting batch:', id);
      const { error } = await supabase
        .from('batches')
        .update({ is_enabled: false })
        .eq('id', id);
      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      toast.success('Batch deleted successfully');
      setShowDeleteDialog(false);
      setSelectedBatch(null);
    },
    onError: (error) => {
      console.error('Error deleting batch:', error);
      toast.error('Failed to delete batch');
    }
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      console.log('Toggling batch status:', id, is_enabled);
      const { error } = await supabase
        .from('batches')
        .update({ 
          is_enabled: !is_enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      if (error) {
        console.error('Toggle status error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      toast.success('Batch status updated successfully');
    },
    onError: (error) => {
      console.error('Error toggling batch status:', error);
      toast.error('Failed to update batch status');
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

  const handleCreate = () => {
    setShowCreateDialog(true);
    resetForm();
  };

  const handleEdit = (batch: Batch) => {
    console.log('Edit batch:', batch);
    setSelectedBatch(batch);
    setFormData({
      batch_name: batch.batch_name,
      serial_number: batch.serial_number,
      admin_name: batch.admin_name,
      username: batch.username,
      max_students: batch.max_students
    });
    setShowEditDialog(true);
  };

  const handleDelete = (batch: Batch) => {
    console.log('Delete batch:', batch);
    setSelectedBatch(batch);
    setShowDeleteDialog(true);
  };

  const handleStatusToggle = (batch: Batch) => {
    console.log('Toggle status for batch:', batch);
    toggleStatusMutation.mutate({
      id: batch.id,
      is_enabled: batch.is_enabled
    });
  };

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBatch) {
      updateMutation.mutate({
        id: selectedBatch.id,
        data: formData
      });
    }
  };

  const handleConfirmDelete = () => {
    if (selectedBatch) {
      deleteMutation.mutate(selectedBatch.id);
    }
  };

  return (
    <>
      {/* Create Button */}
      <Button
        onClick={handleCreate}
        className="bg-gradient-to-r from-emerald-green to-lime-green hover:scale-105 transition-all duration-300 shadow-green-glow"
      >
        <Plus className="h-4 w-4 mr-2" />
        Create Batch
      </Button>

      {/* Batch Action Buttons for each batch */}
      <div className="space-y-4">
        {batches.map((batch) => (
          <div key={batch.id} className="flex items-center justify-end space-x-2 p-4 bg-surface-dark rounded-lg">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusToggle(batch)}
              className={`glass ${
                batch.is_enabled 
                  ? 'border-emerald-green/30 text-emerald-green hover:bg-emerald-green/10' 
                  : 'border-pink-rose/30 text-pink-rose hover:bg-pink-rose/10'
              }`}
            >
              {batch.is_enabled ? 'Disable' : 'Enable'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleEdit(batch)}
              className="glass border-electric-blue/30 text-electric-blue hover:bg-electric-blue/10"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDelete(batch)}
              className="glass border-pink-rose/30 text-pink-rose hover:bg-pink-rose/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>Create New Batch</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="batch_name">Batch Name</Label>
              <Input
                id="batch_name"
                value={formData.batch_name}
                onChange={(e) => setFormData(prev => ({ ...prev, batch_name: e.target.value }))}
                placeholder="Enter batch name"
                required
                disabled={createMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serial_number">Serial Number</Label>
              <Input
                id="serial_number"
                value={formData.serial_number}
                onChange={(e) => setFormData(prev => ({ ...prev, serial_number: e.target.value }))}
                placeholder="Enter serial number"
                required
                disabled={createMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin_name">Admin Name</Label>
              <Input
                id="admin_name"
                value={formData.admin_name}
                onChange={(e) => setFormData(prev => ({ ...prev, admin_name: e.target.value }))}
                placeholder="Enter admin name"
                required
                disabled={createMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter username"
                required
                disabled={createMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_students">Max Students</Label>
              <Input
                id="max_students"
                type="number"
                value={formData.max_students}
                onChange={(e) => setFormData(prev => ({ ...prev, max_students: parseInt(e.target.value) || 0 }))}
                placeholder="Enter max students"
                min={1}
                required
                disabled={createMutation.isPending}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                disabled={createMutation.isPending}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {createMutation.isPending ? 'Creating...' : 'Create Batch'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Edit className="h-5 w-5" />
              <span>Edit Batch</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_batch_name">Batch Name</Label>
              <Input
                id="edit_batch_name"
                value={formData.batch_name}
                onChange={(e) => setFormData(prev => ({ ...prev, batch_name: e.target.value }))}
                placeholder="Enter batch name"
                required
                disabled={updateMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_serial_number">Serial Number</Label>
              <Input
                id="edit_serial_number"
                value={formData.serial_number}
                onChange={(e) => setFormData(prev => ({ ...prev, serial_number: e.target.value }))}
                placeholder="Enter serial number"
                required
                disabled={updateMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_admin_name">Admin Name</Label>
              <Input
                id="edit_admin_name"
                value={formData.admin_name}
                onChange={(e) => setFormData(prev => ({ ...prev, admin_name: e.target.value }))}
                placeholder="Enter admin name"
                required
                disabled={updateMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_username">Username</Label>
              <Input
                id="edit_username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter username"
                required
                disabled={updateMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_max_students">Max Students</Label>
              <Input
                id="edit_max_students"
                type="number"
                value={formData.max_students}
                onChange={(e) => setFormData(prev => ({ ...prev, max_students: parseInt(e.target.value) || 0 }))}
                placeholder="Enter max students"
                min={1}
                required
                disabled={updateMutation.isPending}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                disabled={updateMutation.isPending}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will disable the batch "{selectedBatch?.batch_name}". 
              All students in this batch will remain but the batch will be inactive.
              You can re-enable it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Batch'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
