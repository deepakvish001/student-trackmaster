import React from 'react';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Fingerprint } from "lucide-react";

interface FixedHeaderProps {
  showSidebarTrigger?: boolean;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export default function FixedHeader({ 
  showSidebarTrigger = true, 
  title = "BiometricHub",
  subtitle = "Enterprise Platform",
  children
}: FixedHeaderProps) {

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {children}
          {showSidebarTrigger && (
            <SidebarTrigger className="p-2 hover:bg-muted rounded-lg transition-colors hidden lg:flex" />
          )}
          
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Fingerprint className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{title}</h1>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>
        </div>

        {/* Right Section - Empty for now, logout handled in sidebar */}
        <div className="flex items-center">
          {/* Logout functionality moved to sidebar footer */}
        </div>
      </div>
    </header>
  );
}