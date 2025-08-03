
import React from 'react';
import { FingerprintCaptureCard } from './FingerprintCaptureCard';

interface BatchFingerprintCaptureProps {
  fingerNames: string[];
  onCaptureSuccess: (index: number, template: string, image: string, quality: number) => void;
}

export function BatchFingerprintCapture({ fingerNames, onCaptureSuccess }: BatchFingerprintCaptureProps) {
  return (
    <div className="grid grid-cols-5 gap-6">
      {fingerNames.map((fingerName, index) => (
        <FingerprintCaptureCard
          key={index}
          index={index}
          fingerName={fingerName}
          onCaptureSuccess={onCaptureSuccess}
        />
      ))}
    </div>
  );
}
