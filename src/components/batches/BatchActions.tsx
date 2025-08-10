import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Batch } from '@/types/batch';
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Power, 
  Users, 
  Eye,
  Save,
  X,
  ChevronDown
} from 'lucide-react';

interface BatchActionsProps {
  batch: Batch;
}

export const BatchActions = ({ batch }: BatchActionsProps) => {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [formData, setFormData] = useState({
    batch_name: batch.batch_name,
    serial_number: batch.serial_number,
    admin_name: batch.admin_name,
    username: batch.username,
    max_students: batch.max_students
  });

  const queryClient = useQueryClient();

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('batches')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', batch.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      toast.success('Batch updated successfully');
      setShowEditDialog(false);
    },
    onError: (error) => {
      console.error('Error updating batch:', error);
      toast.error('Failed to update batch');
    }
  });

  // Delete mutation (soft delete by disabling)
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('batches')
        .update({ is_enabled: false })
        .eq('id', batch.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      toast.success('Batch deleted successfully');
      setShowDeleteDialog(false);
    },
    onError: (error) => {
      console.error('Error deleting batch:', error);
      toast.error('Failed to delete batch');
    }
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('batches')
        .update({ 
          is_enabled: !batch.is_enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', batch.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      const action = batch.is_enabled ? 'disabled' : 'enabled';
      toast.success(`Batch "${batch.batch_name}" ${action} successfully`);
    },
    onError: (error) => {
      console.error('Error toggling batch status:', error);
      toast.error('Failed to update batch status');
    }
  });

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleConfirmDelete = () => {
    deleteMutation.mutate();
  };

  const handleToggleStatus = () => {
    toggleStatusMutation.mutate();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="bg-sunset-orange hover:bg-sunset-orange/90 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Action
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-48 bg-background/95 backdrop-blur-sm border border-foreground/10 shadow-xl"
        >
          <DropdownMenuItem 
            onClick={() => setShowDetailsDialog(true)}
            className="cursor-pointer hover:bg-electric-blue/10 text-foreground"
          >
            <Eye className="h-4 w-4 mr-2 text-electric-blue" />
            View Details
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setShowEditDialog(true)}
            className="cursor-pointer hover:bg-vibrant-purple/10 text-foreground"
          >
            <Edit className="h-4 w-4 mr-2 text-vibrant-purple" />
            Edit Batch
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={handleToggleStatus}
            disabled={toggleStatusMutation.isPending}
            className={`cursor-pointer ${
              batch.is_enabled 
                ? 'hover:bg-pink-rose/10 text-pink-rose focus:text-pink-rose' 
                : 'hover:bg-emerald-green/10 text-emerald-green focus:text-emerald-green'
            }`}
          >
            <Power className={`h-4 w-4 mr-2 ${batch.is_enabled ? 'text-pink-rose' : 'text-emerald-green'}`} />
            {toggleStatusMutation.isPending 
              ? (batch.is_enabled ? 'Disabling...' : 'Enabling...') 
              : (batch.is_enabled ? 'Disable Batch' : 'Enable Batch')
            }
          </DropdownMenuItem>
          
          <DropdownMenuSeparator className="bg-foreground/10" />
          
          <DropdownMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            className="cursor-pointer hover:bg-pink-rose/10 text-pink-rose focus:text-pink-rose"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Batch
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* View Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-md glass-card border-foreground/10">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-foreground">
              <Eye className="h-5 w-5 text-electric-blue" />
              <span>Batch Details</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold text-muted-foreground">Serial Number</Label>
                <p className="text-foreground font-mono">{batch.serial_number}</p>
              </div>
              <div>
                <Label className="text-sm font-semibold text-muted-foreground">Status</Label>
                <p className={`font-medium ${batch.is_enabled ? 'text-emerald-green' : 'text-pink-rose'}`}>
                  {batch.is_enabled ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold text-muted-foreground">Batch Name</Label>
              <p className="text-foreground font-medium">{batch.batch_name}</p>
            </div>
            <div>
              <Label className="text-sm font-semibold text-muted-foreground">Admin Name</Label>
              <p className="text-foreground">{batch.admin_name}</p>
            </div>
            <div>
              <Label className="text-sm font-semibold text-muted-foreground">Username</Label>
              <p className="text-foreground">{batch.username}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold text-muted-foreground">Max Students</Label>
                <p className="text-foreground font-medium">{batch.max_students}</p>
              </div>
              <div>
                <Label className="text-sm font-semibold text-muted-foreground">Current Students</Label>
                <p className="text-vibrant-purple font-bold">{(batch as any).student_count || 0}</p>
              </div>
            </div>
            {batch.created_at && (
              <div>
                <Label className="text-sm font-semibold text-muted-foreground">Created At</Label>
                <p className="text-foreground">{new Date(batch.created_at).toLocaleString()}</p>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button 
              onClick={() => setShowDetailsDialog(false)}
              variant="outline"
              className="glass-card"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md glass-card border-foreground/10">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-foreground">
              <Edit className="h-5 w-5 text-vibrant-purple" />
              <span>Edit Batch</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_batch_name" className="text-foreground">Batch Name</Label>
              <Input
                id="edit_batch_name"
                value={formData.batch_name}
                onChange={(e) => setFormData(prev => ({ ...prev, batch_name: e.target.value }))}
                placeholder="Enter batch name"
                required
                disabled={updateMutation.isPending}
                className="glass bg-background border-foreground/20 focus:border-electric-blue"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_serial_number" className="text-foreground">Serial Number</Label>
              <Input
                id="edit_serial_number"
                value={formData.serial_number}
                onChange={(e) => setFormData(prev => ({ ...prev, serial_number: e.target.value }))}
                placeholder="Enter serial number"
                required
                disabled={updateMutation.isPending}
                className="glass bg-background border-foreground/20 focus:border-electric-blue"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_admin_name" className="text-foreground">Admin Name</Label>
              <Input
                id="edit_admin_name"
                value={formData.admin_name}
                onChange={(e) => setFormData(prev => ({ ...prev, admin_name: e.target.value }))}
                placeholder="Enter admin name"
                required
                disabled={updateMutation.isPending}
                className="glass bg-background border-foreground/20 focus:border-electric-blue"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_username" className="text-foreground">Username</Label>
              <Input
                id="edit_username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter username"
                required
                disabled={updateMutation.isPending}
                className="glass bg-background border-foreground/20 focus:border-electric-blue"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_max_students" className="text-foreground">Max Students</Label>
              <Input
                id="edit_max_students"
                type="number"
                value={formData.max_students}
                onChange={(e) => setFormData(prev => ({ ...prev, max_students: parseInt(e.target.value) || 0 }))}
                placeholder="Enter max students"
                min={1}
                required
                disabled={updateMutation.isPending}
                className="glass bg-background border-foreground/20 focus:border-electric-blue"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                disabled={updateMutation.isPending}
                className="glass-card"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="bg-vibrant-purple hover:bg-vibrant-purple/90 text-white"
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
        <AlertDialogContent className="glass-card border-foreground/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2 text-foreground">
              <Trash2 className="h-5 w-5 text-pink-rose" />
              <span>Delete Batch</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete the batch "{batch.batch_name}"? This action will disable the batch and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={deleteMutation.isPending}
              className="glass-card"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-pink-rose hover:bg-pink-rose/90 text-white"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Batch'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};