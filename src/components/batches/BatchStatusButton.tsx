import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface BatchStatusButtonProps {
  isEnabled: boolean;
  onClick: () => void;
}

export const BatchStatusButton = ({ isEnabled, onClick }: BatchStatusButtonProps) => {
  return (
    <Button
      variant={isEnabled ? "default" : "destructive"}
      size="sm"
      onClick={onClick}
      className={`transition-colors flex items-center gap-2 ${
        isEnabled ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
      }`}
    >
      {isEnabled ? (
        <>
          <Check className="h-4 w-4" />
          <span>Enabled</span>
        </>
      ) : (
        <>
          <X className="h-4 w-4" />
          <span>Disabled</span>
        </>
      )}
    </Button>
  );
};