
import React from 'react';
import { cn } from '@/lib/utils';
import { Check, Circle } from 'lucide-react';

interface StepperProps {
  steps: {
    id: string;
    title: string;
    description?: string;
  }[];
  currentStep: string;
  completedSteps: string[];
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function Stepper({
  steps,
  currentStep,
  completedSteps,
  orientation = 'horizontal',
  className
}: StepperProps) {
  const getStepStatus = (stepId: string) => {
    if (completedSteps.includes(stepId)) return 'completed';
    if (stepId === currentStep) return 'current';
    return 'pending';
  };

  const getStepClasses = (status: 'completed' | 'current' | 'pending') => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 text-white border-green-500';
      case 'current':
        return 'bg-primary text-primary-foreground border-primary';
      case 'pending':
        return 'bg-muted text-muted-foreground border-muted-foreground/30';
    }
  };

  if (orientation === 'vertical') {
    return (
      <div className={cn('space-y-4', className)}>
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          return (
            <div key={step.id} className="flex items-start space-x-4">
              <div className="flex flex-col items-center">
                <div className={cn(
                  'w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all',
                  getStepClasses(status)
                )}>
                  {status === 'completed' ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={cn(
                    'w-0.5 h-12 mt-2',
                    completedSteps.includes(step.id) ? 'bg-green-500' : 'bg-muted'
                  )} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={cn(
                  'text-sm font-medium',
                  status === 'current' && 'text-primary',
                  status === 'completed' && 'text-green-600'
                )}>
                  {step.title}
                </h3>
                {step.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center justify-between', className)}>
      {steps.map((step, index) => {
        const status = getStepStatus(step.id);
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center text-center">
              <div className={cn(
                'w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all mb-2',
                getStepClasses(status)
              )}>
                {status === 'completed' ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              <div className="max-w-24">
                <h3 className={cn(
                  'text-xs font-medium',
                  status === 'current' && 'text-primary',
                  status === 'completed' && 'text-green-600'
                )}>
                  {step.title}
                </h3>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                'flex-1 h-0.5 mx-4',
                completedSteps.includes(step.id) ? 'bg-green-500' : 'bg-muted'
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
