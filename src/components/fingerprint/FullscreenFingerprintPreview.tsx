import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, RotateCcw, Download, ZoomIn, ZoomOut } from "lucide-react";
import React, { useState } from "react";

interface FullscreenFingerprintPreviewProps {
  isOpen: boolean;
  fingerName: string;
  imageData: string;
  quality: number;
  onClose: () => void;
  onRecapture?: () => void;
}

export function FullscreenFingerprintPreview({
  isOpen,
  fingerName,
  imageData,
  quality,
  onClose,
  onRecapture
}: FullscreenFingerprintPreviewProps) {
  const [zoom, setZoom] = useState(1);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageData;
    link.download = `${fingerName.replace(/\s+/g, '_')}_fingerprint.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 0.5));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-full h-[95vh] bg-background border-border">
        <DialogHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-foreground">
              {fingerName} - Ultra High Quality Preview
            </DialogTitle>
            <div className="flex items-center space-x-3">
              <Badge variant="default" className="text-lg px-4 py-2 bg-emerald-green text-white">
                Quality: {quality}%
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="text-xs"
              >
                <ZoomOut className="h-4 w-4 mr-1" />
                Zoom Out
              </Button>
              <span className="text-sm text-muted-foreground font-medium">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 5}
                className="text-xs"
              >
                <ZoomIn className="h-4 w-4 mr-1" />
                Zoom In
              </Button>
            </div>
            
            <div className="flex space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="text-xs"
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              {onRecapture && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRecapture}
                  className="text-xs"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Recapture
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-muted/20 rounded-xl border border-border/50 p-4">
          <div className="flex items-center justify-center min-h-full">
            <div 
              className="transition-transform duration-300 ease-in-out"
              style={{ transform: `scale(${zoom})` }}
            >
              <img
                src={imageData}
                alt={`${fingerName} ultra high quality preview`}
                className="max-w-none border border-border/50 rounded-lg shadow-2xl bg-background p-4"
                style={{
                  filter: 'contrast(1.3) brightness(1.15) saturate(1.1)',
                  imageRendering: 'crisp-edges',
                  width: 'auto',
                  height: 'auto',
                  maxWidth: 'none',
                  maxHeight: 'none'
                }}
              />
            </div>
          </div>
        </div>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Complete fingerprint image captured at ultra-high resolution
          </p>
          <p className="text-xs text-muted-foreground">
            Use zoom controls to inspect fine details • No cropping applied • Full image preserved
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}