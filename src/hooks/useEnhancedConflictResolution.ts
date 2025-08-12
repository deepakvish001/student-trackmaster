import { useState, useCallback, useMemo } from 'react';
import { offlineDb } from '@/lib/offlineDatabase';
import { toast } from 'sonner';

export interface ConflictField {
  field: string;
  localValue: any;
  remoteValue: any;
  isResolved: boolean;
  selectedValue?: 'local' | 'remote' | 'custom';
  customValue?: any;
}

export interface EnhancedConflict {
  id: string;
  table: string;
  recordId: string;
  conflictFields: ConflictField[];
  priority: 'high' | 'medium' | 'low';
  timestamp: string;
  localRecord: any;
  remoteRecord: any;
  autoResolutionSuggested?: 'local' | 'remote' | 'merge';
  semanticDifference: number; // 0-1 scale
}

interface ConflictResolutionStrategy {
  biometricData: 'local_wins' | 'remote_wins' | 'manual';
  metadata: 'merge' | 'newest_wins' | 'manual';
  criticalFields: 'manual' | 'local_wins';
}

export function useEnhancedConflictResolution() {
  const [conflicts, setConflicts] = useState<EnhancedConflict[]>([]);
  const [resolutionStrategy, setResolutionStrategy] = useState<ConflictResolutionStrategy>({
    biometricData: 'manual',
    metadata: 'newest_wins',
    criticalFields: 'manual'
  });
  const [isResolving, setIsResolving] = useState(false);

  const analyzeSemanticDifference = useCallback((local: any, remote: any): number => {
    if (!local || !remote) return 1;
    
    const localKeys = Object.keys(local);
    const remoteKeys = Object.keys(remote);
    const allKeys = new Set([...localKeys, ...remoteKeys]);
    
    let differences = 0;
    let totalFields = allKeys.size;
    
    for (const key of allKeys) {
      if (local[key] !== remote[key]) {
        // Weight biometric fields higher
        if (key.includes('finger') || key.includes('biometric')) {
          differences += 2;
          totalFields += 1; // Increase weight
        } else {
          differences += 1;
        }
      }
    }
    
    return Math.min(differences / totalFields, 1);
  }, []);

  const detectConflicts = useCallback(async (localData: any, remoteData: any, table: string) => {
    const conflictFields: ConflictField[] = [];
    const localKeys = Object.keys(localData);
    const remoteKeys = Object.keys(remoteData);
    const allKeys = new Set([...localKeys, ...remoteKeys]);

    for (const key of allKeys) {
      if (key === 'updated_at' || key === 'created_at') continue;
      
      if (localData[key] !== remoteData[key]) {
        conflictFields.push({
          field: key,
          localValue: localData[key],
          remoteValue: remoteData[key],
          isResolved: false
        });
      }
    }

    if (conflictFields.length === 0) return null;

    const semanticDiff = analyzeSemanticDifference(localData, remoteData);
    const priority = semanticDiff > 0.7 ? 'high' : semanticDiff > 0.3 ? 'medium' : 'low';
    
    const conflict: EnhancedConflict = {
      id: `${table}_${localData.id}_${Date.now()}`,
      table,
      recordId: localData.id,
      conflictFields,
      priority,
      timestamp: new Date().toISOString(),
      localRecord: localData,
      remoteRecord: remoteData,
      semanticDifference: semanticDiff,
      autoResolutionSuggested: suggestAutoResolution(conflictFields, table)
    };

    return conflict;
  }, [analyzeSemanticDifference]);

  const suggestAutoResolution = useCallback((fields: ConflictField[], table: string): 'local' | 'remote' | 'merge' => {
    const hasBiometricData = fields.some(f => f.field.includes('finger') || f.field.includes('biometric'));
    const hasTimestampConflict = fields.some(f => f.field.includes('updated_at'));
    
    if (hasBiometricData) return 'local'; // Prefer local for biometric data
    if (hasTimestampConflict && !hasBiometricData) return 'remote'; // Prefer newer for metadata
    if (fields.length <= 2) return 'merge'; // Auto-merge simple conflicts
    
    return 'local'; // Default to local
  }, []);

  const resolveConflictField = useCallback((conflictId: string, fieldName: string, resolution: 'local' | 'remote' | 'custom', customValue?: any) => {
    setConflicts(prev => prev.map(conflict => {
      if (conflict.id !== conflictId) return conflict;
      
      return {
        ...conflict,
        conflictFields: conflict.conflictFields.map(field => {
          if (field.field !== fieldName) return field;
          
          return {
            ...field,
            isResolved: true,
            selectedValue: resolution,
            customValue: resolution === 'custom' ? customValue : undefined
          };
        })
      };
    }));
  }, []);

  const resolveConflictAutomatically = useCallback(async (conflict: EnhancedConflict) => {
    const { table, autoResolutionSuggested } = conflict;
    
    if (!autoResolutionSuggested) return null;
    
    const resolvedData = { ...conflict.localRecord };
    
    for (const field of conflict.conflictFields) {
      const strategy = getFieldStrategy(field.field, table);
      
      switch (strategy) {
        case 'local_wins':
          resolvedData[field.field] = field.localValue;
          break;
        case 'remote_wins':
          resolvedData[field.field] = field.remoteValue;
          break;
        case 'merge':
          // Simple merge strategy - could be enhanced
          resolvedData[field.field] = field.remoteValue || field.localValue;
          break;
      }
    }
    
    return resolvedData;
  }, []);

  const getFieldStrategy = useCallback((fieldName: string, table: string): 'local_wins' | 'remote_wins' | 'merge' => {
    if (fieldName.includes('finger') || fieldName.includes('biometric')) {
      return resolutionStrategy.biometricData === 'local_wins' ? 'local_wins' : 'remote_wins';
    }
    
    if (fieldName.includes('name') || fieldName.includes('id')) {
      return resolutionStrategy.criticalFields === 'local_wins' ? 'local_wins' : 'remote_wins';
    }
    
    return resolutionStrategy.metadata === 'newest_wins' ? 'remote_wins' : 'merge';
  }, [resolutionStrategy]);

  const batchResolveConflicts = useCallback(async (conflictIds: string[], strategy: 'auto' | 'prefer_local' | 'prefer_remote') => {
    setIsResolving(true);
    
    try {
      const resolvedCount = conflictIds.length;
      
      for (const conflictId of conflictIds) {
        const conflict = conflicts.find(c => c.id === conflictId);
        if (!conflict) continue;
        
        let resolvedData;
        
        switch (strategy) {
          case 'auto':
            resolvedData = await resolveConflictAutomatically(conflict);
            break;
          case 'prefer_local':
            resolvedData = conflict.localRecord;
            break;
          case 'prefer_remote':
            resolvedData = conflict.remoteRecord;
            break;
        }
        
        if (resolvedData) {
          // Update the local database with resolved data
          await offlineDb.table(conflict.table).put(resolvedData);
        }
      }
      
      // Remove resolved conflicts
      setConflicts(prev => prev.filter(c => !conflictIds.includes(c.id)));
      
      toast.success(`Resolved ${resolvedCount} conflicts successfully`);
    } catch (error) {
      console.error('Error resolving conflicts:', error);
      toast.error('Failed to resolve some conflicts');
    } finally {
      setIsResolving(false);
    }
  }, [conflicts, resolveConflictAutomatically]);

  const getConflictStats = useMemo(() => {
    const total = conflicts.length;
    const high = conflicts.filter(c => c.priority === 'high').length;
    const medium = conflicts.filter(c => c.priority === 'medium').length;
    const low = conflicts.filter(c => c.priority === 'low').length;
    const autoResolvable = conflicts.filter(c => c.autoResolutionSuggested).length;
    
    return { total, high, medium, low, autoResolvable };
  }, [conflicts]);

  return {
    conflicts,
    conflictStats: getConflictStats,
    resolutionStrategy,
    isResolving,
    detectConflicts,
    resolveConflictField,
    resolveConflictAutomatically,
    batchResolveConflicts,
    setResolutionStrategy,
    analyzeSemanticDifference
  };
}