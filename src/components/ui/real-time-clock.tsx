
import React, { useState, useEffect } from 'react';
import { Clock, Calendar } from 'lucide-react';

interface RealTimeClockProps {
  showDate?: boolean;
  showSeconds?: boolean;
  className?: string;
  format?: '12h' | '24h';
}

export function RealTimeClock({ 
  showDate = true, 
  showSeconds = true, 
  className = "", 
  format = '12h' 
}: RealTimeClockProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      ...(showSeconds && { second: '2-digit' }),
      hour12: format === '12h'
    };
    return date.toLocaleTimeString('en-US', options);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className="flex items-center space-x-2 text-primary">
        <Clock className="h-4 w-4 animate-pulse" />
        <span className="font-mono font-semibold text-lg">
          {formatTime(currentTime)}
        </span>
      </div>
      {showDate && (
        <div className="flex items-center space-x-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="font-medium text-sm">
            {formatDate(currentTime)}
          </span>
        </div>
      )}
    </div>
  );
}
