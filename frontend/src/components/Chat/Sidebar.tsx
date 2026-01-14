import React, { use } from "react";
import {
  Search,
  MoreVertical,
  MessageSquarePlus,
  UserCircle,
  CheckCheckIcon,
} from "lucide-react";

import { useState, useEffect } from "react";

import {
  ChatMessage,
  ChatRoom,
  GlobalSearchResults,
  User,
} from "@/services/types";
import { socketClient } from "@/services/api/socket.client";
import { authService } from "@/services/features/auth.service";
import { formatRelativeTime } from "@/utils/date.util";
import { chatService } from "@/services/features/chat.service";

interface SidebarProps {
  rooms?: ChatRoom[];
  selectedRoomId?: string | null;
  onSelectRoom?: (roomId: string) => void;
  onlineUsers: Set<string>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  rooms,
  selectedRoomId,
  onSelectRoom,
  onlineUsers,
}) => {
  // ==================================================================================
  // 1. STATE & CONFIGURATION
  // ==================================================================================
  
  // Data User & Typing
  const [userInfo, setUserInfo] = useState<User>();
  const [myUserId, setMyUserId] = useState<string>("");
  const [typingStatus, setTypingStatus] = useState<Record<string, string[]>>({});
  const typingTimeoutsRef = React.useRef<Record<string, NodeJS.Timeout>>({});

  // Data Search (Unified Search)
  const [globalSearchTerm, setGlobalSearchTerm] = useState<string>("");
  const [globalSearchResults, setGlobalSearchResults] = useState<GlobalSearchResults | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // ==================================================================================
  // 2. EFFECTS (Logic Otomatis)
  // ==================================================================================

  // A. Fetch Profile saat mount (untuk tahu 'Siapa Saya')
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user: any = await authService.getProfile();
        setUserInfo(user[0] || user);
        const actualId = Array.isArray(user) ? user[0]?.id : user?.id;
        if (actualId) setMyUserId(actualId);
      } catch (error) {
        console.error("Failed to fetch profile in sidebar:", error);
      }
    };
    fetchProfile();
  }, []);

  // B. Socket Listeners (Typing Indicator)
  useEffect(() => {
    // Fungsi untuk menghapus status typing
    const handleStopTypingStatus = ({ userName, roomId }: { userName: string; roomId: string }) => {
      setTypingStatus((prev) => ({
        ...prev,
        [roomId]: (prev[roomId] || []).filter((name) => name !== userName),
      }));
    };

    // Fungsi saat ada yang mengetik
    const handleTypingStatus = ({ userId, userName, roomId }: { userId: string; userName: string; roomId: string }) => {
      if (userId === myUserId) return; // Hiraukan diri sendiri

      setTypingStatus((prev) => {
        const currentTypers = prev[roomId] || [];
        if (!currentTypers.includes(userName)) {
          return { ...prev, [roomId]: [...currentTypers, userName] };
        }
        return prev;
      });

      // Auto-remove status typing setelah 5 detik (Fail-safe)
      const timeoutKey = `${roomId}-${userName}`;
      if (typingTimeoutsRef.current[timeoutKey]) clearTimeout(typingTimeoutsRef.current[timeoutKey]);
      
      typingTimeoutsRef.current[timeoutKey] = setTimeout(() => {
        handleStopTypingStatus({ userName, roomId });
      }, 5000);
    };

    socketClient.on("user_typing", handleTypingStatus);
    socketClient.on("user_stopped_typing", handleStopTypingStatus);

    return () => {
      socketClient.off("user_typing", handleTypingStatus);
      socketClient.off("user_stopped_typing", handleStopTypingStatus);
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
    };
  }, [myUserId]);

  // C. Search Logic (Debounce)
  // Menunggu 300ms setelah user berhenti mengetik sebelum memanggil API
  useEffect(() => {
    if (globalSearchTerm.trim() === "") {
      setIsSearching(false);
      setGlobalSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Panggil endpoint gabungan (Rooms + Users + Messages)
        const results: any = await chatService.globalSearchQuery(globalSearchTerm);
        setGlobalSearchResults(results);
      } catch (error) {
        console.error("Global search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer); // Cleanup timer sebelumnya jika user mengetik lagi
  }, [globalSearchTerm]);

  // ==================================================================================
  // 3. ACTION HANDLERS (Fungsi Interaksi)
  // ==================================================================================

  /**
   * Menangani klik pada hasil search "People".
   * Membuat room baru (atau membuka yang lama) secara otomatis.
   */
  const handleCreatePersonalChat = async (targetUserId: string) => {
    try {
      // Backend akan otomatis cek: jika chat sudah ada, return ID lama. Jika belum, buat baru.
      const newRoom = await chatService.createPersonalChat(targetUserId);
      
      // Pindah ke room tersebut
      if (onSelectRoom) {
        onSelectRoom(newRoom.roomId);
      }

      // Reset tampilan search ke normal
      setGlobalSearchTerm("");
      setGlobalSearchResults(null);
    } catch (error) {
      console.error("Failed to create personal chat:", error);
    }
  };

  // ==================================================================================
  // 4. HELPER COMPONENTS (Sub-komponen untuk tampilan berulang)
  // ==================================================================================

  /**
   * Card Component untuk menampilkan item chat.
   * Dipakai di mode normal DAN mode search (Existing Chats).
   */
  const ChatListItem = ({ chat }: { chat: ChatRoom }) => (
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
        {/* Avatar Logic: Kotak untuk Group, Bulat untuk Personal */}
        <div
          className={`w-12 h-12 flex items-center justify-center font-bold ${
            chat.isGroup
              ? "rounded-xl bg-indigo-100 text-indigo-600" 
              : "rounded-full bg-gray-200 text-gray-600"
          }`}
        >
          {chat.roomName.split(" ").length > 1
            ? `${chat.roomName.split(" ")[0][0]}${
                chat.roomName.split(" ").slice(-1)[0][0]
              }`.toUpperCase()
            : chat.roomName.substring(0, 2).toUpperCase()}
        </div>
        
        {/* Indikator Online (Dot Hijau) */}
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
            {chat.isGroup && chat.memberCount && (
              <span className="ml-2 text-[10px] font-normal text-gray-400">
                ({chat.memberCount})
              </span>
            )}
          </h3>
          <span className="text-xs text-gray-500">
            {chat.lastMessageTime
              ? formatRelativeTime(chat.lastMessageTime)
              : ""}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-xs text-gray-500 truncate">
            {/* Tampilkan status typing JIKA ada, kalau tidak tampilkan last message */}
            {typingStatus[chat.roomId] && typingStatus[chat.roomId].length > 0
              ? `${typingStatus[chat.roomId].join(", ")} is typing...`
              : chat.lastMessage || "No messages yet."}
          </p>
          {(chat.unreadCount ?? 0) > 0 && (
            <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {chat.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  // ==================================================================================
  // 5. MAIN RENDER
  // ==================================================================================
  return (
    <div className="w-1/4 h-full border-gray-200 flex flex-col bg-gray-50">
      {/* A. Header Sidebar (User Info & Actions) */}
      <div className="p-4 h-18.25 shrink-0 bg-white border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
            {userInfo?.fullName ? (
              userInfo.fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase()
            ) : (
              <UserCircle size={24} />
            )}
          </div>
          <span className="font-semibold text-gray-800">
            {userInfo?.fullName}
          </span>
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

      {/* B. Search Input */}
      <div className="p-4 bg-white">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search messages or people..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
            value={globalSearchTerm}
            onChange={(e) => setGlobalSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* C. Content List (Scrollable) */}
      <div className="flex-1 overflow-y-auto">
        {globalSearchTerm ? (
          // --- MODE 1: SEARCH RESULTS ---
          <div className="pb-4">
            {isSearching ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                Searching...
              </div>
            ) : (
              <>
                {/* 1. Kategori: Existing Chats (Room yang sudah ada) */}
                {globalSearchResults?.rooms && globalSearchResults.rooms.length > 0 && (
                    <div className="mb-2">
                      <h3 className="px-4 py-2 mt-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Existing Chats
                      </h3>
                      {globalSearchResults.rooms.map((chat) => (
                        <ChatListItem key={chat.roomId} chat={chat} />
                      ))}
                    </div>
                  )}

                {/* 2. Kategori: People (User baru dari database) */}
                {globalSearchResults?.users && globalSearchResults.users.length > 0 && (
                    <div className="mb-2">
                      <h3 className="px-4 py-2 mt-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        People
                      </h3>
                      {globalSearchResults.users.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => handleCreatePersonalChat(user.id)}
                          className="px-4 py-3 flex items-center gap-3 hover:bg-gray-100 cursor-pointer transition-colors"
                        >
                          <div className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold">
                            {user.fullName ? user.fullName[0].toUpperCase() : "?"}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {user.fullName}
                            </p>
                            <p className="text-xs text-gray-500">
                              Click to start chat
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                {/* Empty State: Jika tidak ada hasil sama sekali */}
                {(!globalSearchResults?.rooms?.length && !globalSearchResults?.users?.length) && (
                  <div className="p-8 text-center text-gray-400 text-sm">
                    No results found for "{globalSearchTerm}"
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          // --- MODE 2: NORMAL CHAT LIST (Inbox) ---
          rooms?.map((chat) => <ChatListItem key={chat.roomId} chat={chat} />)
        )}
      </div>
    </div>
  );
};
