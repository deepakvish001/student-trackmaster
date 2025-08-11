import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Database } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ConflictData {
  table: string;
  record_id: string;
  local_data: any;
  remote_data: any;
  field_conflicts: string[];
}

interface ConflictResolutionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: ConflictData[];
  onResolve: (conflicts: ConflictData[], resolution: 'local' | 'remote' | 'merge') => void;
}

export function ConflictResolutionDialog({
  isOpen,
  onClose,
  conflicts,
  onResolve
}: ConflictResolutionDialogProps) {
  const [selectedResolution, setSelectedResolution] = useState<'local' | 'remote' | 'merge'>('local');

  const handleResolve = () => {
    onResolve(conflicts, selectedResolution);
    onClose();
  };

  if (conflicts.length === 0) return null;

  const conflict = conflicts[0]; // Show first conflict for now

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-orange-500" />
            Data Conflict Detected
          </DialogTitle>
          <DialogDescription>
            The same record has been modified both locally and remotely. Choose how to resolve this conflict.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Conflict Summary */}
          <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
            <h3 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
              Conflict in {conflict.table}
            </h3>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Record ID: <code className="px-1 py-0.5 bg-orange-100 dark:bg-orange-900/40 rounded">{conflict.record_id}</code>
            </p>
            <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
              Conflicting fields: {conflict.field_conflicts.join(', ')}
            </p>
          </div>

          {/* Side-by-side comparison */}
          <div className="grid grid-cols-2 gap-6">
            {/* Local Version */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-blue-500" />
                <h4 className="font-semibold text-blue-700 dark:text-blue-300">Your Changes (Local)</h4>
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDistanceToNow(new Date(conflict.local_data.updated_at))} ago
                </Badge>
              </div>
              
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg space-y-2">
                {conflict.field_conflicts.map(field => (
                  <div key={`local-${field}`} className="text-sm">
                    <span className="font-medium text-blue-800 dark:text-blue-200">{field}:</span>
                    <div className="mt-1 p-2 bg-white dark:bg-blue-900/40 rounded border">
                      {String(conflict.local_data[field] || 'null')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Remote Version */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-green-500" />
                <h4 className="font-semibold text-green-700 dark:text-green-300">Server Changes (Remote)</h4>
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDistanceToNow(new Date(conflict.remote_data.updated_at))} ago
                </Badge>
              </div>
              
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg space-y-2">
                {conflict.field_conflicts.map(field => (
                  <div key={`remote-${field}`} className="text-sm">
                    <span className="font-medium text-green-800 dark:text-green-200">{field}:</span>
                    <div className="mt-1 p-2 bg-white dark:bg-green-900/40 rounded border">
                      {String(conflict.remote_data[field] || 'null')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Resolution Options */}
          <div className="space-y-4">
            <h4 className="font-semibold">Choose Resolution Strategy:</h4>
            
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                <input
                  type="radio"
                  name="resolution"
                  value="local"
                  checked={selectedResolution === 'local'}
                  onChange={(e) => setSelectedResolution(e.target.value as any)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-blue-700 dark:text-blue-300">Keep Your Changes</div>
                  <div className="text-sm text-muted-foreground">
                    Overwrite the server version with your local changes
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                <input
                  type="radio"
                  name="resolution"
                  value="remote"
                  checked={selectedResolution === 'remote'}
                  onChange={(e) => setSelectedResolution(e.target.value as any)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-green-700 dark:text-green-300">Accept Server Changes</div>
                  <div className="text-sm text-muted-foreground">
                    Discard your local changes and use the server version
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                <input
                  type="radio"
                  name="resolution"
                  value="merge"
                  checked={selectedResolution === 'merge'}
                  onChange={(e) => setSelectedResolution(e.target.value as any)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-purple-700 dark:text-purple-300">Smart Merge</div>
                  <div className="text-sm text-muted-foreground">
                    Automatically merge non-conflicting fields (latest timestamp wins for conflicts)
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Resolve Later
          </Button>
          <Button onClick={handleResolve}>
            Resolve Conflict
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}