
import React from 'react';
import { toast as sonnerToast } from 'sonner';
import { 
  CheckCircle, 
  AlertCircle, 
  Info, 
  AlertTriangle,
  X,
  Loader2
} from 'lucide-react';

interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  cancel?: {
    label: string;
    onClick?: () => void;
  };
}

const createToast = (
  type: 'success' | 'error' | 'info' | 'warning' | 'loading',
  message: string,
  options: ToastOptions = {}
) => {
  const { title, description, duration, action, cancel } = options;

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-600" />,
    error: <AlertCircle className="h-5 w-5 text-red-600" />,
    info: <Info className="h-5 w-5 text-blue-600" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
    loading: <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
  };

  const colors = {
    success: 'border-l-green-500',
    error: 'border-l-red-500',
    info: 'border-l-blue-500',
    warning: 'border-l-yellow-500',
    loading: 'border-l-blue-500'
  };

  return sonnerToast.custom(
    (t) => (
      <div className={`bg-white border border-border border-l-4 ${colors[type]} rounded-lg shadow-lg p-4 max-w-md`}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            {icons[type]}
          </div>
          
          <div className="flex-1 min-w-0">
            {title && (
              <h4 className="text-sm font-semibold text-foreground mb-1">
                {title}
              </h4>
            )}
            <p className="text-sm text-muted-foreground">
              {message}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">
                {description}
              </p>
            )}
            
            {(action || cancel) && (
              <div className="flex items-center space-x-2 mt-3">
                {action && (
                  <button
                    onClick={() => {
                      action.onClick();
                      sonnerToast.dismiss(t);
                    }}
                    className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors"
                  >
                    {action.label}
                  </button>
                )}
                {cancel && (
                  <button
                    onClick={() => {
                      cancel.onClick?.();
                      sonnerToast.dismiss(t);
                    }}
                    className="text-xs bg-muted text-muted-foreground px-3 py-1.5 rounded-md hover:bg-muted/80 transition-colors"
                  >
                    {cancel.label}
                  </button>
                )}
              </div>
            )}
          </div>
          
          <button
            onClick={() => sonnerToast.dismiss(t)}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    ),
    {
      duration: duration || (type === 'loading' ? Infinity : 4000),
    }
  );
};

export const enhancedToast = {
  success: (message: string, options?: ToastOptions) => 
    createToast('success', message, options),
    
  error: (message: string, options?: ToastOptions) => 
    createToast('error', message, options),
    
  info: (message: string, options?: ToastOptions) => 
    createToast('info', message, options),
    
  warning: (message: string, options?: ToastOptions) => 
    createToast('warning', message, options),
    
  loading: (message: string, options?: ToastOptions) => 
    createToast('loading', message, options),

  promise: <T,>(
    promise: Promise<T>,
    {
      loading,
      success,
      error
    }: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return sonnerToast.promise(promise, {
      loading,
      success,
      error
    });
  }
};
