import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  BellOff, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Info,
  Shield,
  Clock,
  X
} from 'lucide-react';
import { usePWANotifications } from '@/hooks/usePWANotifications';
import { formatDistanceToNow } from 'date-fns';

export function PWANotificationCenter() {
  const {
    notifications,
    permission,
    isSupported,
    requestPermission,
    clearNotification,
    markAsRead,
    clearAllNotifications,
    getUnreadCount,
    getNotificationsByPriority
  } = usePWANotifications();

  const [activeTab, setActiveTab] = useState('all');

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'normal': return <Info className="h-4 w-4 text-blue-500" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'normal': return 'border-blue-200 bg-blue-50';
      case 'low': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getPermissionStatus = () => {
    if (!isSupported) return { text: 'Not Supported', color: 'destructive' };
    if (permission === 'granted') return { text: 'Enabled', color: 'default' };
    if (permission === 'denied') return { text: 'Denied', color: 'destructive' };
    return { text: 'Not Requested', color: 'secondary' };
  };

  const permissionStatus = getPermissionStatus();

  const filteredNotifications = () => {
    switch (activeTab) {
      case 'unread': return notifications.filter(n => !n.read);
      case 'high': return getNotificationsByPriority('high');
      case 'normal': return getNotificationsByPriority('normal');
      case 'low': return getNotificationsByPriority('low');
      default: return notifications;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notification Center</h2>
          <p className="text-muted-foreground">Manage your PWA notifications</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={permissionStatus.color as any}>
            {permissionStatus.text}
          </Badge>
          {getUnreadCount() > 0 && (
            <Badge variant="destructive">
              {getUnreadCount()} unread
            </Badge>
          )}
        </div>
      </div>

      {/* Permission Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            Configure notification permissions and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Browser Notifications</p>
              <p className="text-sm text-muted-foreground">
                Receive notifications even when the app is closed
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={permissionStatus.color as any}>
                {permissionStatus.text}
              </Badge>
              {permission !== 'granted' && isSupported && (
                <Button onClick={requestPermission} size="sm">
                  Enable
                </Button>
              )}
            </div>
          </div>
          
          {!isSupported && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <p className="text-sm text-yellow-700">
                Notifications are not supported in this browser
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Recent Notifications
            </CardTitle>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <Button 
                  onClick={clearAllNotifications} 
                  variant="outline" 
                  size="sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">
                All ({notifications.length})
              </TabsTrigger>
              <TabsTrigger value="unread">
                Unread ({getUnreadCount()})
              </TabsTrigger>
              <TabsTrigger value="high">
                High ({getNotificationsByPriority('high').length})
              </TabsTrigger>
              <TabsTrigger value="normal">
                Normal ({getNotificationsByPriority('normal').length})
              </TabsTrigger>
              <TabsTrigger value="low">
                Low ({getNotificationsByPriority('low').length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <ScrollArea className="h-[400px]">
                {filteredNotifications().length === 0 ? (
                  <div className="text-center py-8">
                    <BellOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredNotifications().map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 rounded-lg border transition-all duration-200 ${
                          notification.read 
                            ? 'bg-gray-50 border-gray-200' 
                            : getPriorityColor(notification.priority)
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            {getPriorityIcon(notification.priority)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-sm">
                                  {notification.title}
                                </h4>
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                )}
                              </div>
                              {notification.body && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  {notification.body}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                                </span>
                                {notification.tag && (
                                  <Badge variant="outline" className="text-xs">
                                    {notification.tag}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            {!notification.read && (
                              <Button
                                onClick={() => markAsRead(notification.id)}
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              onClick={() => clearNotification(notification.id)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{getNotificationsByPriority('high').length}</p>
                <p className="text-sm text-muted-foreground">High Priority</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{getNotificationsByPriority('normal').length}</p>
                <p className="text-sm text-muted-foreground">Normal Priority</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{getNotificationsByPriority('low').length}</p>
                <p className="text-sm text-muted-foreground">Low Priority</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}