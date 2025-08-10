import { useState, useEffect } from 'react';
import { UserRole } from '@/hooks/useUserProfile';

interface CreateUserForm {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  batch_access: string[]; // Array of batch IDs
  max_batches_allowed: number; // Maximum batches user can create
}

interface UserManagementState {
  isCreateDialogOpen: boolean;
  isPasswordDialogOpen: boolean;
  selectedUserId: string;
  newPassword: string;
  createUserForm: CreateUserForm;
}

const STORAGE_KEY = 'userManagementState';

export function useUserManagementState() {
  const [state, setState] = useState<UserManagementState>(() => {
    // Restore state from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          isCreateDialogOpen: false, // Always start with dialogs closed
          isPasswordDialogOpen: false,
          selectedUserId: '',
          newPassword: '',
          createUserForm: parsed.createUserForm || {
            email: '',
            password: '',
            full_name: '',
            role: 'user' as UserRole,
            batch_access: [],
            max_batches_allowed: 1
          }
        };
      }
    } catch (error) {
      console.warn('Failed to restore user management state:', error);
    }
    
    return {
      isCreateDialogOpen: false,
      isPasswordDialogOpen: false,
      selectedUserId: '',
      newPassword: '',
      createUserForm: {
        email: '',
        password: '',
        full_name: '',
        role: 'user' as UserRole,
        batch_access: [],
        max_batches_allowed: 1
      }
    };
  });

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    try {
      const stateToSave = {
        createUserForm: state.createUserForm
        // Don't persist dialog states or sensitive data
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.warn('Failed to persist user management state:', error);
    }
  }, [state]);

  const updateState = (updates: Partial<UserManagementState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const resetCreateForm = () => {
    updateState({
      createUserForm: {
        email: '',
        password: '',
        full_name: '',
        role: 'user' as UserRole,
        batch_access: [],
        max_batches_allowed: 1
      }
    });
  };

  return {
    state,
    updateState,
    resetCreateForm
  };
}