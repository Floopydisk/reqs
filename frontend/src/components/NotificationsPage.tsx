"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Clock, X, FileText, MessageCircle } from "lucide-react";
import { getToken } from "@/lib/auth";
import clsx from "clsx";
import { API_BASE_URL } from "@/lib/config";

interface Notification {
  _id: string;
  type: string;
  metadata: {
    title?: string;
    notificationTitle?: string;
    message?: string;
    resourceNumber?: string;
    text?: string;
    newStatus?: string;
  };
  actor: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  resource?: {
    kind: string;
    id: string;
    commentId?: string;
  };
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

const filterTabs = ["All", "Status Changed", "Comment Replied"];

const getFilterValue = (tab: string) => {
  switch (tab) {
    case "Status Changed":
      return "requisition_status_changed";
    case "Comment Replied":
      return "comment_replied";
    default:
      return "All";
  }
};

const getNotificationTypeDisplay = (type: string) => {
  switch (type) {
    case "requisition_status_changed":
      return {
        label: "Status Changed",
        icon: FileText,
        color: "bg-blue-600"
      };
    case "comment_replied":
      return {
        label: "Comment Reply",
        icon: MessageCircle,
        color: "bg-green-600"
      };
    default:
      return {
        label: type.replace("_", " "),
        icon: FileText,
        color: "bg-gray-600"
      };
  }
};

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState("All");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [notificationId, setNotificationId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNotificationId(params.get("id"));
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      const token = getToken();
      if (!token) return;

      try {
        const response = await fetch(`${API_BASE_URL}/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.success) {
          setNotifications(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (notificationId && notifications.length > 0) {
      const notification = notifications.find(n => n._id === notificationId);
      if (notification) {
        setSelectedNotification(notification);
        if (!notification.isRead) {
          markAsRead(notification._id);
        }
      }
    }
  }, [notificationId, notifications]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedNotification(null);
      }
    };
    
    if (selectedNotification) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [selectedNotification]);

  const markAsRead = async (notificationId: string) => {
    const token = getToken();
    if (!token) return;

    try {
      await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredNotifications = notifications.filter((n) => {
    const filterValue = getFilterValue(activeTab);
    return filterValue === "All" ? true : n.type === filterValue;
  });

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-[#F6F7FB] to-white px-4 sm:px-8 py-8 sm:py-20">
      <h1 className="text-xl sm:text-2xl font-bold text-[#0A1A6B] mb-4 sm:mb-6 uppercase">
        Notifications
      </h1>

      <div className="flex flex-wrap gap-2 sm:gap-4 mb-6 sm:mb-8">
        {filterTabs.map((tab) => (
          <Button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              "rounded-xl px-4 sm:px-8 py-3 sm:py-6 font-medium text-sm sm:text-base",
              activeTab === tab
                ? "bg-[#0A1A6B] text-white shadow"
                : "bg-white text-[#0A1A6B] hover:bg-[#E9ECFF]"
            )}
          >
            {tab}
          </Button>
        ))}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">Loading notifications...</div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No notifications found
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <Card
              key={notif._id}
              className={clsx(
                "border-none shadow-sm bg-white hover:bg-[#F8F8F8] transition-colors cursor-pointer",
                !notif.isRead && "border-l-4 border-l-blue-500"
              )}
              onClick={() => {
                setSelectedNotification(notif);
                if (!notif.isRead) {
                  markAsRead(notif._id);
                }
              }}
            >
              <CardContent className="flex flex-col sm:flex-row sm:justify-between sm:items-start p-4 sm:p-5 gap-3 sm:gap-0">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const typeDisplay = getNotificationTypeDisplay(notif.type);
                      const Icon = typeDisplay.icon;
                      return (
                        <span className={`inline-flex items-center gap-1 text-xs font-medium text-white px-2 py-1 rounded-md ${typeDisplay.color}`}>
                          <Icon size={12} />
                          {typeDisplay.label}
                        </span>
                      );
                    })()}
                    {notif.metadata.resourceNumber && (
                      <span className="text-xs text-gray-500">
                        {notif.metadata.resourceNumber}
                      </span>
                    )}
                  </div>

                  <h2 className="text-sm sm:text-base font-semibold text-gray-900">
                    {notif.metadata.title ||
                      notif.metadata.notificationTitle ||
                      "Notification"}
                  </h2>

                  <p className="text-xs sm:text-sm text-gray-500 pr-0 sm:pr-4">
                    {notif.metadata.message || notif.metadata.text}
                  </p>
                  
                  <p className="text-xs text-gray-400">
                    From: {notif.actor.firstName} {notif.actor.lastName}
                  </p>

                  {!notif.isRead && (
                    <span className="text-xs text-blue-600 font-medium">
                      New
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 sm:whitespace-nowrap">
                  <Clock size={14} className="sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm">
                    {formatDate(notif.createdAt)}
                  </span>
                </div>
              </CardContent>
              <Separator />
            </Card>
          ))
        )}
      </div>

      {/* Modal */}
      {selectedNotification && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedNotification(null)}
        >
          <div 
            className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                Notification Details
              </h2>
              <button
                onClick={() => setSelectedNotification(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                {(() => {
                  const typeDisplay = getNotificationTypeDisplay(selectedNotification.type);
                  const Icon = typeDisplay.icon;
                  return (
                    <span className={`inline-flex items-center gap-1 text-xs font-medium text-white px-2 py-1 rounded-md ${typeDisplay.color} mb-2`}>
                      <Icon size={12} />
                      {typeDisplay.label}
                    </span>
                  );
                })()}
                
                {selectedNotification.metadata.resourceNumber && (
                  <p className="text-sm text-gray-600 mb-2">
                    Reference: {selectedNotification.metadata.resourceNumber}
                  </p>
                )}
              </div>
              
              <div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">
                  {selectedNotification.metadata.title ||
                    selectedNotification.metadata.notificationTitle ||
                    "Notification"}
                </h3>
                
                <p className="text-gray-700 mb-4">
                  {selectedNotification.metadata.message || selectedNotification.metadata.text}
                </p>
              </div>
              
              <div className="border-t pt-4">
                <p className="text-sm text-gray-600 mb-2">
                  From: {selectedNotification.actor.firstName} {selectedNotification.actor.lastName}
                </p>
                
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock size={16} />
                  <span>{formatDate(selectedNotification.createdAt)}</span>
                </div>
                
                {selectedNotification.metadata.newStatus && (
                  <p className="text-sm text-gray-600 mt-2">
                    Status: <span className="font-medium">{selectedNotification.metadata.newStatus}</span>
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex justify-between p-6 border-t">
              {selectedNotification.resource && (
                <Button
                  onClick={() => {
                    setSelectedNotification(null);
                    window.location.href = `/user/requisition/${selectedNotification.resource!.id}`;
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Go to Request
                </Button>
              )}
              <Button
                onClick={() => setSelectedNotification(null)}
                className="bg-[#0A1A6B] hover:bg-[#0A1A6B]/90 text-white ml-auto"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
