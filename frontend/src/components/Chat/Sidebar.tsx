import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  MoreVertical,
  MessageSquarePlus,
  UserCircle,
  X,
} from "lucide-react";

import {
  ChatRoom,
  GlobalSearchResults,
  User,
} from "@/services/types";
import { socketClient } from "@/services/api/socket.client";
import { authService } from "@/services/features/auth.service";
import { formatRelativeTime } from "@/utils/date.util";
import { chatService } from "@/services/features/chat.service";
import { CreateGroupModal } from "./CreateGroupModal";

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
  
  // Data Profil & Status Real-time
  const [userInfo, setUserInfo] = useState<User>();
  const [myUserId, setMyUserId] = useState<string>("");
  const [typingStatus, setTypingStatus] = useState<Record<string, string[]>>({});
  const typingTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Unified Search States
  const [globalSearchTerm, setGlobalSearchTerm] = useState<string>("");
  const [globalSearchResults, setGlobalSearchResults] = useState<GlobalSearchResults | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);

  // Timer Heartbeat (Untuk update otomatis tulisan "1m ago", dst)
  const [, setTick] = useState(0);

  // Group Creation State (Modular Modal)
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  // Filter: Ambil daftar user yang sudah pernah diajak chat personal (untuk buat grup)
  const contactUsers = React.useMemo(() => {
    if (!rooms) return [];
    return rooms
      .filter(room => !room.isGroup && room.otherUserId && room.roomName !== "Me")
      .map(room => ({
        id: room.otherUserId as string,
        fullName: room.roomName,
        email: "", // Kita tidak butuh email lengkap di sini, tapi interface butuh placeholder
      } as User));
  }, [rooms]);

  // ==================================================================================
  // 2. EFFECTS (Logic Otomatis)
  // ==================================================================================

  // A. Heartbeat: Trigger re-render setiap 60 detik agar label waktu selalu akurat
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  // B. Inisialisasi: Ambil Profil & Daftar User (untuk saran & grup)
  useEffect(() => {
    const initSidebar = async () => {
      try {
        const user: any = await authService.getProfile();
        const userData = user[0] || user;
        setUserInfo(userData);
        const actualId = Array.isArray(user) ? user[0]?.id : user?.id;
        if (actualId) setMyUserId(actualId);

        const allUsers = await authService.getAllUsers();
        setSuggestedUsers(allUsers.filter((u: User) => u.id !== actualId));
      } catch (error) {
        console.error("Sidebar initialization failed:", error);
      }
    };
    initSidebar();
  }, []);

  // C. Socket Listeners (Typing Indicator)
  useEffect(() => {
    const handleStopTypingStatus = ({ userName, roomId }: { userName: string; roomId: string }) => {
      setTypingStatus((prev) => ({
        ...prev,
        [roomId]: (prev[roomId] || []).filter((name) => name !== userName),
      }));
    };

    const handleTypingStatus = ({ userId, userName, roomId }: { userId: string; userName: string; roomId: string }) => {
      if (userId === myUserId) return;
      setTypingStatus((prev) => {
        const currentTypers = prev[roomId] || [];
        if (!currentTypers.includes(userName)) return { ...prev, [roomId]: [...currentTypers, userName] };
        return prev;
      });
      const timeoutKey = `${roomId}-${userName}`;
      if (typingTimeoutsRef.current[timeoutKey]) clearTimeout(typingTimeoutsRef.current[timeoutKey]);
      typingTimeoutsRef.current[timeoutKey] = setTimeout(() => handleStopTypingStatus({ userName, roomId }), 5000);
    };

    socketClient.on("user_typing", handleTypingStatus);
    socketClient.on("user_stopped_typing", handleStopTypingStatus);
    return () => {
      socketClient.off("user_typing", handleTypingStatus);
      socketClient.off("user_stopped_typing", handleStopTypingStatus);
    };
  }, [myUserId]);

  // D. Search Logic (Debounce 300ms)
  useEffect(() => {
    if (globalSearchTerm.trim() === "") {
      setIsSearching(false);
      setGlobalSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results: any = await chatService.globalSearchQuery(globalSearchTerm);
        setGlobalSearchResults(results);
      } catch (error) {
        console.error("Global search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [globalSearchTerm]);

  // ==================================================================================
  // 3. ACTION HANDLERS (Fungsi Interaksi)
  // ==================================================================================

  // Mulai Chat Personal Baru
  const handleCreatePersonalChat = async (targetUserId: string) => {
    try {
      const newRoom = await chatService.createPersonalChat(targetUserId);
      if (onSelectRoom) onSelectRoom(newRoom.roomId);
      setGlobalSearchTerm("");
      setGlobalSearchResults(null);
      setIsSearchFocused(false);
    } catch (error) {
      console.error("Failed to create personal chat:", error);
    }
  };

  // ==================================================================================
  // 4. HELPER COMPONENTS (Reusable UI)
  // ==================================================================================

  // Komponen Kartu Chat (Inbox Utama & Existing Chats)
  const ChatListItem = ({ chat }: { chat: ChatRoom }) => (
    <div
      key={chat.roomId}
      className={`p-4 flex items-center gap-3 hover:bg-gray-100 cursor-pointer transition-colors border-b border-gray-100 last:border-0 ${
        selectedRoomId === chat.roomId ? "bg-gray-100" : "bg-white"
      }`}
      onClick={() => onSelectRoom && onSelectRoom(chat.roomId)}
    >
      <div className="relative">
        <div className={`w-12 h-12 flex items-center justify-center font-bold text-sm ${
          chat.isGroup ? "rounded-xl bg-indigo-100 text-indigo-600" : "rounded-full bg-gray-100 text-gray-600"
        }`}>
          {chat.roomName.substring(0, 2).toUpperCase()}
        </div>
        {!chat.isGroup && chat.roomName !== "Me" && (
          <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${
            chat.otherUserId && onlineUsers.has(chat.otherUserId) ? "bg-green-500" : "bg-gray-300"
          }`}></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-0.5">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{chat.roomName}</h3>
          <span className="text-[10px] text-gray-500 whitespace-nowrap">
            {chat.lastMessageTime ? formatRelativeTime(chat.lastMessageTime) : ""}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <p className={`text-xs truncate ${chat.lastMessage === "This message was unsent" ? "italic text-gray-400" : "text-gray-500"}`}>
            {typingStatus[chat.roomId]?.length > 0 ? "Typing..." : chat.lastMessage || "Start a conversation"}
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

  // Komponen Kartu User (Hasil Search / Discovery)
  const UserListItem = ({ user, subtext }: { user: User; subtext?: string }) => (
    <div
      key={user.id}
      onClick={() => handleCreatePersonalChat(user.id)}
      className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <div className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm">
        {user.fullName[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{user.fullName}</p>
        <p className="text-[11px] text-gray-500 truncate">{subtext || user.email}</p>
      </div>
    </div>
  );

  // ==================================================================================
  // 5. MAIN RENDER
  // ==================================================================================
  return (
    <div className="w-1/4 h-full border-r border-gray-200 flex flex-col bg-white">
      {/* A. Header Sidebar */}
      <div className="p-4 flex items-center justify-between border-b border-gray-50 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            {userInfo?.fullName?.[0].toUpperCase() || <UserCircle size={20} />}
          </div>
          <span className="font-bold text-gray-800 text-sm tracking-tight">Chats</span>
        </div>
        <div className="flex gap-1 text-gray-400">
          <button 
            onClick={() => setIsGroupModalOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors" 
            title="New Group"
          >
            <MessageSquarePlus size={18} />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors"><MoreVertical size={18} /></button>
        </div>
      </div>

      {/* B. Search Bar */}
      <div className="p-3">
        <div className={`relative flex items-center transition-all duration-200 ${isSearchFocused ? "ring-2 ring-blue-500/20" : ""}`}>
          <Search className={`absolute left-3 transition-colors ${isSearchFocused ? "text-blue-500" : "text-gray-400"}`} size={16} />
          <input
            type="text"
            placeholder="Search messages or people..."
            className="w-full pl-9 pr-9 py-2 bg-gray-100 border-none rounded-xl text-xs focus:bg-white transition-all outline-none"
            value={globalSearchTerm}
            onChange={(e) => setGlobalSearchTerm(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
          />
          {(globalSearchTerm || isSearchFocused) && (
            <button 
              onClick={() => { setGlobalSearchTerm(""); setIsSearchFocused(false); }}
              className="absolute right-3 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* C. List Area (Normal vs Search Mode) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isSearchFocused && !globalSearchTerm ? (
          // MODE 1: Discovery (Klik Search tapi belum ngetik)
          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
            <h3 className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Suggested People</h3>
            {suggestedUsers.length > 0 ? (
              suggestedUsers.map(user => <UserListItem key={user.id} user={user} subtext="Available to chat" />)
            ) : (
              <p className="px-4 text-xs text-gray-400 italic">No suggestions yet</p>
            )}
          </div>
        ) : globalSearchTerm ? (
          // MODE 2: Search Results (Lagi ngetik)
          <div>
            {isSearching ? (
              <div className="p-8 text-center text-gray-400 text-xs italic">Searching...</div>
            ) : (
              <>
                {/* 1. Chats (Existing) */}
                {globalSearchResults?.rooms && globalSearchResults.rooms.length > 0 && (
                  <div className="mb-2">
                    <h3 className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50">Existing Chats</h3>
                    {globalSearchResults.rooms.map(chat => <ChatListItem key={chat.roomId} chat={chat} />)}
                  </div>
                )}
                {/* 2. People (Global) */}
                {globalSearchResults?.users && globalSearchResults.users.length > 0 && (
                  <div className="mb-2">
                    <h3 className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50">Global Search</h3>
                    {globalSearchResults.users.map(user => <UserListItem key={user.id} user={user} />)}
                  </div>
                )}
                {!globalSearchResults?.rooms?.length && !globalSearchResults?.users?.length && (
                  <div className="p-8 text-center text-gray-400 text-xs italic">No results found</div>
                )}
              </>
            )}
          </div>
        ) : (
          // MODE 3: Normal (Daftar Chat Inbox)
          rooms?.length ? (
            rooms.map(chat => <ChatListItem key={chat.roomId} chat={chat} />)
          ) : (
            <div className="p-8 text-center text-gray-400 text-xs italic mt-10">No chats yet.</div>
          )
        )}
      </div>

      {/* D. Modular Create Group Modal */}
      <CreateGroupModal 
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        users={contactUsers}
        onGroupCreated={(roomId) => onSelectRoom && onSelectRoom(roomId)}
      />
    </div>
  );
};