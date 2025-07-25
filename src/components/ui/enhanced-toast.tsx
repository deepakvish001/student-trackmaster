
import React from 'react';
import { toast as sonnerToast } from 'sonner';
import { 
  CheckCircle, 
  AlertCircle, 
  Info, 
  AlertTriangle,
  X,
  Loader2,
  Zap
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
    success: <CheckCircle className="h-5 w-5 text-emerald-600" />,
    error: <AlertCircle className="h-5 w-5 text-red-600" />,
    info: <Info className="h-5 w-5 text-blue-600" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-600" />,
    loading: <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
  };

  const colors = {
    success: 'border-l-emerald-500 bg-emerald-50/90',
    error: 'border-l-red-500 bg-red-50/90',
    info: 'border-l-blue-500 bg-blue-50/90',
    warning: 'border-l-amber-500 bg-amber-50/90',
    loading: 'border-l-blue-500 bg-blue-50/90'
  };

  const glowColors = {
    success: 'shadow-emerald-200/50',
    error: 'shadow-red-200/50',
    info: 'shadow-blue-200/50',
    warning: 'shadow-amber-200/50',
    loading: 'shadow-blue-200/50'
  };

  return sonnerToast.custom(
    (t) => (
      <div className={`
        ${colors[type]} ${glowColors[type]}
        border border-gray-200 border-l-4 rounded-lg shadow-xl backdrop-blur-sm
        p-4 max-w-md animate-slide-up hover-lift
      `}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            {icons[type]}
          </div>
          
          <div className="flex-1 min-w-0">
            {title && (
              <h4 className="text-sm font-bold text-gray-900 mb-1">
                {title}
              </h4>
            )}
            <p className="text-sm text-gray-800 font-medium">
              {message}
            </p>
            {description && (
              <p className="text-xs text-gray-600 mt-1">
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
                    className="text-xs bg-primary text-white px-3 py-1.5 rounded-md 
                      hover:bg-primary/90 transition-all duration-200 font-semibold
                      shadow-md hover:shadow-lg"
                  >
                    <Zap className="h-3 w-3 mr-1 inline" />
                    {action.label}
                  </button>
                )}
                {cancel && (
                  <button
                    onClick={() => {
                      cancel.onClick?.();
                      sonnerToast.dismiss(t);
                    }}
                    className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md 
                      hover:bg-gray-200 transition-all duration-200 font-medium"
                  >
                    {cancel.label}
                  </button>
                )}
              </div>
            )}
          </div>
          
          <button
            onClick={() => sonnerToast.dismiss(t)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors
              p-1 hover:bg-gray-100 rounded-full"
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
