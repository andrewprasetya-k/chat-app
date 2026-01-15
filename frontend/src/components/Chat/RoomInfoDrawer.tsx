import React, { useEffect, useState } from "react";
import { X, User, LogOut, Trash2, Calendar } from "lucide-react";
import { chatService } from "@/services/features/chat.service";
import { ChatRoomInfo } from "@/services/types";

interface RoomInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
}

export const RoomInfoDrawer: React.FC<RoomInfoDrawerProps> = ({
  isOpen,
  onClose,
  roomId,
}) => {
  const [roomInfo, setRoomInfo] = useState<ChatRoomInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && roomId) {
      setLoading(true);
      const fetchInfo = async () => {
        try {
          const info = await chatService.getRoomInfo(roomId);
          setRoomInfo(info);
        } catch (error) {
          // console.error("Failed to fetch room info:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchInfo();
    }
  }, [isOpen, roomId]);

  if (!isOpen) return null;

  return (
    <div>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/5 z-40" onClick={onClose} />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white z-50 shadow-xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        } flex flex-col`}
      >
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-900">Room Info</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">
              Loading...
            </div>
          ) : roomInfo ? (
            <div className="flex flex-col">
              {/* Profile Section */}
              <div className="px-6 py-8 flex flex-col items-center border-b border-gray-100">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xl font-medium mb-3">
                  {roomInfo.roomName?.substring(0, 2).toUpperCase()}
                </div>
                <h2 className="text-base font-medium text-gray-900 text-center">
                  {roomInfo.roomName}
                </h2>
                {!roomInfo.isGroup && roomInfo.activeMembers[0] && (
                  <p className="text-xs text-gray-500 mt-1">
                    {roomInfo.activeMembers.find((m) => !m.isMe)?.email || ""}
                  </p>
                )}
              </div>

              {/* General Info */}
              <div className="px-6 py-5 space-y-3 border-b border-gray-100">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Calendar size={16} className="text-gray-400" />
                  <span>
                    Created {new Date(roomInfo.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {roomInfo.isGroup && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <User size={16} className="text-gray-400" />
                    <span>{roomInfo.totalMembers} members</span>
                  </div>
                )}
              </div>

              {/* Members List */}
              {roomInfo.isGroup && (
                <div className="px-6 py-5 border-b border-gray-100">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
                    Members
                  </h4>
                  <div className="space-y-3">
                    {roomInfo.activeMembers.map((member) => (
                      <div
                        key={member.userId}
                        className="flex items-center gap-3"
                      >
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-sm font-medium">
                          {member.name.substring(0, 1).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">
                            {member.name}
                            {member.isMe && (
                              <span className="text-gray-500"> (You)</span>
                            )}
                          </p>
                          {member.role === "admin" && (
                            <p className="text-xs text-blue-500 font-medium">
                              Admin
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="px-6 py-5 space-y-2">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <LogOut size={16} />
                  <span>
                    {roomInfo.isGroup ? "Exit Group" : "Block Contact"}
                  </span>
                </button>
                {/* Hanya Admin yang bisa delete group */}
                {roomInfo.isGroup &&
                  roomInfo.activeMembers.find((m) => m.isMe && m.role === "admin") && (
                    <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={16} />
                      <span>Delete Group</span>
                    </button>
                  )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-gray-400">
              Not found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
