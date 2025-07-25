
import React, { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EnhancedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
  showPasswordToggle?: boolean;
}

export const EnhancedInput = forwardRef<HTMLInputElement, EnhancedInputProps>(
  ({ 
    label, 
    error, 
    success, 
    hint, 
    leftIcon, 
    rightIcon, 
    isLoading,
    showPasswordToggle,
    className, 
    type,
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const inputType = showPasswordToggle ? (showPassword ? 'text' : 'password') : type;

    const inputClasses = cn(
      'transition-all duration-200',
      leftIcon && 'pl-10',
      (rightIcon || showPasswordToggle || isLoading) && 'pr-10',
      error && 'border-red-500 focus-visible:ring-red-500',
      success && 'border-green-500 focus-visible:ring-green-500',
      className
    );

    return (
      <div className="space-y-2">
        {label && (
          <Label className={cn(
            'text-sm font-medium',
            error && 'text-red-600',
            success && 'text-green-600'
          )}>
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}
          
          <Input
            ref={ref}
            type={inputType}
            className={inputClasses}
            {...props}
          />
          
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
            {isLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            )}
            
            {showPasswordToggle && !isLoading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            )}
            
            {rightIcon && !isLoading && !showPasswordToggle && rightIcon}
            
            {error && !isLoading && (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            
            {success && !error && !isLoading && (
              <Check className="h-4 w-4 text-green-500" />
            )}
          </div>
        </div>
        
        {(error || success || hint) && (
          <div className="space-y-1">
            {error && (
              <p className="text-sm text-red-600 flex items-center space-x-1">
                <AlertCircle className="h-3 w-3" />
                <span>{error}</span>
              </p>
            )}
            {success && !error && (
              <p className="text-sm text-green-600 flex items-center space-x-1">
                <Check className="h-3 w-3" />
                <span>{success}</span>
              </p>
            )}
            {hint && !error && !success && (
              <p className="text-sm text-muted-foreground">{hint}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

EnhancedInput.displayName = 'EnhancedInput';
