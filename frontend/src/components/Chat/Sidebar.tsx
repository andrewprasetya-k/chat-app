import React, { use } from "react";
import {
  Search,
  MoreVertical,
  MessageSquarePlus,
  UserCircle,
} from "lucide-react";

import { useState, useEffect } from "react";

import { ChatRoom } from "@/services/types";
import { socketClient } from "@/services/api/socket.client";
import { authService } from "@/services/features/auth.service";
import { formatRelativeTime } from "@/utils/date.util";

interface SidebarProps {
  rooms?: ChatRoom[];
  selectedRoomId?: string | null;
  onSelectRoom?: (roomId: string) => void;
}
interface UserInfo {
  id?: string;
  fullName?: string;
  [key: string]: any;
}

export const Sidebar: React.FC<SidebarProps> = ({
  rooms,
  selectedRoomId,
  onSelectRoom,
}) => {
  // Format: { "id_room_1": ["Nama A", "Nama B"], "id_room_2": ["Nama C"] }
  const [typingStatus, setTypingStatus] = useState<Record<string, string[]>>(
    {}
  );
  const [myUserId, setMyUserId] = useState<string>("");
  const [userInfo, setUserInfo] = useState<UserInfo>({});
  const typingTimeoutsRef = React.useRef<Record<string, NodeJS.Timeout>>({});

  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  // Ambil profil user untuk mendapatkan ID sendiri agar bisa memfilter di sidebar
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user: any = await authService.getProfile();
        setUserInfo(user[0] || user); // Sesuaikan dengan struktur data yang diterima
        const actualId = Array.isArray(user) ? user[0]?.id : user?.id;
        if (actualId) setMyUserId(actualId);
      } catch (error) {
        console.error("Failed to fetch profile in sidebar:", error);
      }
    };

    // Handler untuk user online, tambah ke set
    const handleOnlineUsers = (data: { userId: string }) => {
      setOnlineUsers((prev) => new Set(prev).add(data.userId));
    };

    // Handler untuk user offline, hapus dari set
    const handleOfflineUsers = (data: { userId: string }) => {
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        updated.delete(data.userId);
        return updated;
      });
    };
    socketClient.on("user_online", handleOnlineUsers);
    socketClient.on("user_offline", handleOfflineUsers);
    fetchProfile();

    return () => {
      socketClient.off("user_online", handleOnlineUsers);
      socketClient.off("user_offline", handleOfflineUsers);
    };
  }, []);

  useEffect(() => {
    if (rooms) {
      const initialOnline = new Set<string>();
      rooms.forEach((user) => {
        // Cek apakah user ini adalah chat personal (bukan grup)
        if (user.isOnline && user.otherUserId) {
          initialOnline.add(user.otherUserId);
        }
      });
      setOnlineUsers(initialOnline);
    }
  }, [rooms]);

  // Dengarkan event typing dan stop typing
  useEffect(() => {
    const handleStopTypingStatus = ({
      userId,
      userName,
      roomId,
    }: {
      userId: string;
      userName: string;
      roomId: string;
    }) => {
      setTypingStatus((prevStatus) => {
        const currentTypers = prevStatus[roomId] || [];
        return {
          ...prevStatus,
          [roomId]: currentTypers.filter((name) => name !== userName),
        };
      });
    };

    const handleTypingStatus = ({
      userId,
      userName,
      roomId,
    }: {
      userId: string;
      userName: string;
      roomId: string;
    }) => {
      // JANGAN tampilkan jika yang mengetik adalah DIRI SENDIRI
      if (userId === myUserId) return;

      setTypingStatus((prevStatus) => {
        const currentTypers = prevStatus[roomId] || [];
        if (!currentTypers.includes(userName)) {
          return {
            ...prevStatus,
            [roomId]: [...currentTypers, userName],
          };
        }
        return prevStatus;
      });

      // --- Logic Timeout Otomatis ---
      const timeoutKey = `${roomId}-${userName}`;
      if (typingTimeoutsRef.current[timeoutKey]) {
        clearTimeout(typingTimeoutsRef.current[timeoutKey]);
      }

      typingTimeoutsRef.current[timeoutKey] = setTimeout(() => {
        handleStopTypingStatus({ userId, userName, roomId });
      }, 5000);
    };

    socketClient.on("user_typing", handleTypingStatus);
    socketClient.on("user_stopped_typing", handleStopTypingStatus);

    return () => {
      socketClient.off("user_typing", handleTypingStatus);
      socketClient.off("user_stopped_typing", handleStopTypingStatus);
      // Cleanup all timeouts on unmount
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
    };
  }, [myUserId]); // Tambahkan myUserId ke dependensi agar filter berfungsi logicnya

  return (
    <div className="w-80 h-full border-gray-200 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-4 h-18.25 shrink-0 bg-white border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
            {userInfo.fullName ? (
              userInfo.fullName
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()
            ) : (
              <UserCircle size={24} />
            )}
          </div>
          <span className="font-semibold text-gray-800">{userInfo.fullName}</span>
        </div>
        <div className="flex gap-2 text-gray-500">
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <MessageSquarePlus size={20} />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 bg-white">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search messages..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {rooms?.map((chat) => (
          <div
            key={chat.roomId}
            className={`p-4 flex items-center gap-3 hover:bg-gray-100 cursor-pointer transition-colors border-b border-gray-100 last:border-0 group ${
              onSelectRoom && selectedRoomId === chat.roomId
                ? "bg-gray-100"
                : "bg-gray-50"
            }`}
            onClick={() =>
              selectedRoomId && onSelectRoom && onSelectRoom(chat.roomId)
            }
          >
            <div className="relative">
              <div
                className={`w-12 h-12 flex items-center justify-center font-bold ${
                  chat.isGroup
                    ? "rounded-xl bg-indigo-100 text-indigo-600" // Group: Rounded Square
                    : "rounded-full bg-gray-200 text-gray-600" // Personal: Circle
                }`}
              >
                {chat.roomName.split(" ").length > 1
                  ? `${chat.roomName.split(" ")[0][0]}${
                      chat.roomName.split(" ").slice(-1)[0][0]
                    }`.toUpperCase()
                  : chat.roomName.substring(0, 2).toUpperCase()}
              </div>
              {/* Indikator Online (Hanya untuk personal chat dan bukan room "Me") */}
              {!chat.isGroup && chat.roomName !== "Me" && (
                <div
                  className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${
                    chat.otherUserId && onlineUsers.has(chat.otherUserId)
                      ? "bg-green-500" // Online
                      : "bg-gray-400" // Offline
                  }`}
                ></div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {chat.roomName}
                </h3>
                <span className="text-xs text-gray-500">
                  {chat.lastMessageTime
                    ? formatRelativeTime(chat.lastMessageTime)
                    : ""}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500 truncate">
                  {typingStatus[chat.roomId] &&
                  typingStatus[chat.roomId].length > 0
                    ? `${typingStatus[chat.roomId].join(", ")} is typing...`
                    : chat.lastMessage || "No messages yet."}
                </p>
                {chat.unreadCount && (
                  <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {chat.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
