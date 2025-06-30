
import { Bell, Trophy, BookOpen, Target, Clock, Star } from 'lucide-react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useNotificationHistory, NotificationItem } from '@/hooks/useNotificationHistory';

const getNotificationIcon = (type: NotificationItem['type']) => {
  switch (type) {
    case 'badge':
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    case 'chapter':
      return <BookOpen className="h-5 w-5 text-blue-500" />;
    case 'lesson':
      return <Target className="h-5 w-5 text-green-500" />;
    case 'streak':
      return <Star className="h-5 w-5 text-orange-500" />;
    case 'progress':
      return <Clock className="h-5 w-5 text-purple-500" />;
    default:
      return <Bell className="h-5 w-5 text-gray-500" />;
  }
};

const formatTime = (date: Date) => {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 60) {
    return `${diffInMinutes}분 전`;
  } else if (diffInMinutes < 1440) {
    return `${Math.floor(diffInMinutes / 60)}시간 전`;
  } else {
    return `${Math.floor(diffInMinutes / 1440)}일 전`;
  }
};

interface NotificationDrawerProps {
  children: React.ReactNode;
}

export const NotificationDrawer = ({ children }: NotificationDrawerProps) => {
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotificationHistory();

  const handleNotificationClick = (notification: NotificationItem) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  return (
    <Drawer>
      <DrawerTrigger asChild>
        {children}
      </DrawerTrigger>
      <DrawerContent className="h-[80vh]">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                알림 내역
              </DrawerTitle>
              <DrawerDescription>
                최근 학습 활동과 성취에 대한 알림을 확인하세요
              </DrawerDescription>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                모두 읽음 처리
              </Button>
            )}
          </div>
        </DrawerHeader>
        
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-gray-500">아직 알림이 없습니다</p>
                <p className="text-sm text-gray-400 mt-1">
                  학습을 시작하면 다양한 알림을 받을 수 있어요!
                </p>
              </div>
            ) : (
              notifications.map((notification, index) => (
                <div key={notification.id}>
                  <div
                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      notification.read 
                        ? 'hover:bg-gray-50' 
                        : 'bg-blue-50 hover:bg-blue-100 border border-blue-200'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-gray-900 text-sm">
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5">
                            새로움
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {notification.description}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-400">
                          {formatTime(notification.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {index < notifications.length - 1 && (
                    <Separator className="my-2" />
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        
        <div className="border-t p-4">
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              닫기
            </Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
};