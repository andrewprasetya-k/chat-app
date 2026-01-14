import React, { useEffect, useState } from "react";
import { X, User, LogOut, Trash2, Calendar } from "lucide-react";
import { ChatRoomInfo } from "@/services/types";
import { chatService } from "@/services/features/chat.service";

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
      const fetchInfo = async () => {
        setLoading(true);
        try {
          const data = await chatService.getRoomInfo(roomId);
          setRoomInfo(data);
        } catch (err) {
          console.error("Failed to load room info:", err);
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
      <div className="fixed inset-0 bg-black/10 z-40 backdrop-blur" onClick={onClose} />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-3/4 bg-white z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        } flex flex-col`}
      >
        {/* Header */}
        <div className="p-6 flex items-end justify-end">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-50 rounded transition-colors"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-12 text-center text-sm text-gray-400">
              Loading...
            </div>
          ) : roomInfo ? (
            <div className="flex flex-col">
              {/* Profile Section */}
              <div className="p-8 flex flex-row items-center border-gray-100">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-2xl font-normal my-auto">
                  {roomInfo.roomName?.substring(0, 2).toUpperCase()}
                </div>
                <h2 className="text-lg font-medium text-gray-900 my-auto ml-10">
                  {roomInfo.roomName}
                </h2>
                {!roomInfo.isGroup && roomInfo.activeMembers[0] && (
                  <p className="text-sm text-gray-400 mt-1">
                    {roomInfo.activeMembers.find((m) => !m.isMe)?.email || ""}
                  </p>
                )}
              </div>

              {/* General Info */}
              <div className="px-6 py-5 space-y-3 border-gray-100">
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <Calendar size={16} className="text-gray-300" />
                  <span>
                    {new Date(roomInfo.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {roomInfo.isGroup && (
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <User size={16} className="text-gray-300" />
                    <span>{roomInfo.totalMembers} members</span>
                  </div>
                )}
              </div>

              {/* Members List (Only for Groups) */}
              {roomInfo.isGroup && (
                <div className="px-6 py-5 border-gray-100">
                  <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">
                    Members
                  </h4>
                  <div className="space-y-3">
                    {roomInfo.activeMembers.map((member) => (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 text-xs">
                            {member.name.substring(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm text-gray-700">
                              {member.name} {member.isMe && "(You)"}
                            </p>
                            {member.role === "admin" && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                Admin
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="px-6 py-5 space-y-1">
                <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50/50 rounded transition-colors">
                  <LogOut size={16} />
                  {roomInfo.isGroup ? "Exit Group" : "Block Contact"}
                </button>
                {roomInfo.isGroup && (
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50/50 rounded transition-colors">
                    <Trash2 size={16} />
                    Delete Group
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-sm text-gray-400">
              Not found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
