'use client';

import React, { memo } from 'react';
import { Card } from './Card';
import { Notification } from '@/types/domain';

export interface NotificationItemProps {
    notification: Notification;
    onClick: (notif: Notification) => void;
}

/** 알림 1건. 원시 타입 위주라 기본 얕은 비교만으로 메모이제이션. */
export const NotificationItem = memo(function NotificationItem({
    notification,
    onClick
}: NotificationItemProps) {
    const { room, time, content, type } = notification;
    return (
        <Card
            className={`border-l-4 cursor-pointer hover:bg-slate-50 transition-colors ${type === 'meal' ? 'border-l-orange-500' : 'border-l-blue-500'}`}
            onClick={() => onClick(notification)}
        >
            <div className="flex justify-between items-start">
                <span className="font-bold text-slate-700">{room}호</span>
                <span className="text-xs text-slate-400">{time}</span>
            </div>
            <p className="text-sm text-slate-600 mt-1">{content}</p>
        </Card>
    );
});
