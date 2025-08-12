import React from 'react';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { QuickStatus } from "@/components/QuickStatus";
import { Fingerprint } from "lucide-react";
import { MobileNav } from './MobileNav';

interface FixedHeaderProps {
  showSidebarTrigger?: boolean;
  title?: string;
  subtitle?: string;
}

export default function FixedHeader({ 
  showSidebarTrigger = true, 
  title = "BiometricHub",
  subtitle = "Enterprise Platform"
}: FixedHeaderProps) {

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border shadow-sm safe-area-inset-top">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
        {/* Left Section */}
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
          {/* Mobile Navigation - Only show on small screens */}
          <div className="lg:hidden">
            <MobileNav />
          </div>
          
          {/* Desktop Sidebar Trigger - Always visible on desktop */}
          {showSidebarTrigger && (
            <div className="hidden lg:flex">
              <SidebarTrigger className="p-2 hover:bg-muted rounded-lg transition-colors border border-border/40 hover:border-border" />
            </div>
          )}
          
          {/* Logo and Title */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-lg sm:rounded-xl flex items-center justify-center">
              <Fingerprint className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base sm:text-lg font-semibold text-foreground">{title}</h1>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>
        </div>

        {/* Right Section - Quick Status */}
        <div className="flex items-center">
          <QuickStatus compact={true} showSync={true} />
        </div>
      </div>
    </header>
  );
}