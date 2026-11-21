import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Clock, ShieldAlert, Sparkles } from 'lucide-react';
import { useComplaints } from '../../context/ComplaintContext';
import { formatRelativeTime } from '../../utils/formatters';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';
import { AppNotification } from '../../types/notification';

export const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [liveNotifications, setLiveNotifications] = useState<AppNotification[]>([]);
  const { complaints } = useComplaints();
  const { user, isAdmin, isOfficer } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Real-time Firestore notification subscription
  useEffect(() => {
    if (!user) {
      setLiveNotifications([]);
      return;
    }

    const unsub = notificationService.subscribeUserNotifications(
      user.uid,
      isAdmin,
      (notifs) => {
        setLiveNotifications(notifs);
      }
    );

    return () => {
      unsub();
    };
  }, [user, isAdmin]);

  // If live notifications exist in Firestore, use them; otherwise synthesize from recent complaint events
  const displayedNotifications =
    liveNotifications.length > 0
      ? liveNotifications.slice(0, 6)
      : complaints.slice(0, 4).map((c) => ({
          id: c.id,
          recipientUid: user?.uid || '',
          type: 'status_update' as const,
          title: `${c.id}: ${c.status}`,
          message: c.title,
          complaintId: c.id,
          createdAt: c.updatedAt,
          isUrgent: c.priority === 'Critical',
          read: false,
          link: isOfficer
            ? `/department/complaints/${c.id}`
            : isAdmin
            ? `/admin/complaints`
            : `/citizen/complaints/${c.id}`,
        }));

  const unreadCount = liveNotifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    const unreadIds = liveNotifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length > 0) {
      await notificationService.markAllAsRead(unreadIds);
    }
  };

  const handleNotificationClick = async (notif: AppNotification | { id: string; read?: boolean; link: string }) => {
    setIsOpen(false);
    if ('read' in notif && !notif.read && notif.id && !notif.id.startsWith('CR-')) {
      await notificationService.markAsRead(notif.id);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors focus-ring touch-target flex items-center justify-center"
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500 ring-2 ring-[#0D1B2E]" />
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#0D1B2E] rounded-2xl shadow-2xl border border-slate-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-[#10243B]/80">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs tracking-wider uppercase text-slate-200">
                Civic Dispatch Feed
              </span>
              <span className="bg-teal-950 text-teal-300 border border-teal-800/80 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                {unreadCount > 0 ? `${unreadCount} New` : 'Live'}
              </span>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-semibold text-slate-400 hover:text-teal-400 flex items-center space-x-1 transition-colors"
              >
                <Check className="w-3.5 h-3.5 mr-0.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80 scrollbar-thin">
            {displayedNotifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No recent notifications
              </div>
            ) : (
              displayedNotifications.map((item) => (
                <Link
                  key={item.id}
                  to={item.link}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 block hover:bg-[#10243B]/60 transition-colors ${
                    !item.read ? 'bg-[#10243B]/30' : ''
                  }`}
                >
                  <div className="flex items-start space-x-2.5">
                    <div
                      className={`p-2 rounded-xl mt-0.5 flex-shrink-0 ${
                        item.isUrgent
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-800/80'
                          : 'bg-teal-950/80 text-teal-300 border border-teal-800/80'
                      }`}
                    >
                      {item.isUrgent ? (
                        <ShieldAlert className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-white truncate">
                          {item.title}
                        </p>
                        {!item.read && (
                          <span className="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0 ml-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">
                        {item.message}
                      </p>
                      <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          <div className="p-2.5 border-t border-slate-800 bg-[#071426] text-center">
            <span className="text-[11px] text-slate-500 font-medium flex items-center justify-center space-x-1">
              <Sparkles className="w-3 h-3 text-teal-400" />
              <span>Real-time in-app civic notifications</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
