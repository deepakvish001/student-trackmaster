import { useCallback } from 'react';
import { UseFormReset } from 'react-hook-form';
import { toast } from 'sonner';

/**
 * Hook for auto-resetting forms after successful submissions
 * Optimized for rapid data entry workflows
 */
export function useAutoFormReset() {
  
  const resetFormForNextEntry = useCallback((
    formReset: UseFormReset<any>,
    preserveFields: Record<string, any> = {},
    options: {
      focusField?: string;
      successMessage?: string;
      showToast?: boolean;
      delay?: number;
    } = {}
  ) => {
    const {
      focusField = 'name',
      successMessage = 'Data saved successfully! Ready for next entry.',
      showToast = true,
      delay = 200
    } = options;

    // Reset form with preserved values
    formReset({
      name: '',
      mobile: '',
      email: '',
      address: '',
      ...preserveFields
    });

    // Show success message
    if (showToast) {
      toast.success(successMessage, {
        duration: 3000
      });
    }

    // Auto-focus for next entry
    setTimeout(() => {
      const input = document.querySelector(`input[name="${focusField}"]`) as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, delay);

    console.log('✅ Form reset complete - ready for next entry');
  }, []);

  const resetFingerprintCapture = useCallback(() => {
    // Reset fingerprint capture components
    const fingerprintGrid = document.querySelector('[data-fingerprint-grid]');
    if (fingerprintGrid) {
      (fingerprintGrid as any).reset?.();
    }

    // Reset any other capture interfaces
    const captureButtons = document.querySelectorAll('[data-capture-reset]');
    captureButtons.forEach(button => {
      (button as any).click?.();
    });

    console.log('🔄 Fingerprint capture interfaces reset');
  }, []);

  const performCompleteReset = useCallback((
    formReset: UseFormReset<any>,
    setStates: (() => void)[],
    preserveFields: Record<string, any> = {},
    successMessage: string = 'Entry complete! Ready for next.'
  ) => {
    // Reset form
    resetFormForNextEntry(formReset, preserveFields, {
      successMessage,
      showToast: true
    });

    // Reset fingerprint interfaces
    resetFingerprintCapture();

    // Execute custom state resets
    setStates.forEach(resetFn => {
      try {
        resetFn();
      } catch (error) {
        console.warn('State reset function failed:', error);
      }
    });

    console.log('🎯 Complete form reset executed - optimized for rapid entry');
  }, [resetFormForNextEntry, resetFingerprintCapture]);

  return {
    resetFormForNextEntry,
    resetFingerprintCapture,
    performCompleteReset
  };
}