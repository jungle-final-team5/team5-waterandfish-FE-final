
import { useState } from 'react';

export interface NotificationItem {
  id: string;
  type: 'badge' | 'chapter' | 'lesson' | 'streak' | 'progress';
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
}

export const useNotificationHistory = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: '1',
      type: 'badge',
      title: '🏆 새로운 뱃지 획득!',
      description: '"첫 학습 완료" 뱃지를 획득했습니다!',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30분 전
      read: false
    },
    {
      id: '2',
      type: 'chapter',
      title: '📚 챕터 완료!',
      description: '"기본 인사" 카테고리의 "인사말" 챕터를 완료했습니다!',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2시간 전
      read: true
    },
    {
      id: '3',
      type: 'lesson',
      title: '✅ 학습 완료!',
      description: '"안녕하세요" 학습을 완료했습니다!',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5시간 전
      read: true
    },
    {
      id: '4',
      type: 'streak',
      title: '🔥 연속 학습 달성!',
      description: '7일 연속 학습을 달성했습니다! 계속 화이팅!',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1일 전
      read: true
    },
    {
      id: '5',
      type: 'badge',
      title: '🏆 새로운 뱃지 획득!',
      description: '"일주일 연속 학습" 뱃지를 획득했습니다!',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2일 전
      read: true
    }
  ]);

  const addNotification = (notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: NotificationItem = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    unreadCount
  };
};