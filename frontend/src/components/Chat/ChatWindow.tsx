import React, { act, use, useEffect, useState } from "react";
import { Send, Smile, Paperclip, Phone, Video, Info } from "lucide-react";
import { ChatMessage, ChatRoom } from "@/services/types";
import { chatService } from "@/services/features/chat.service";
import { authService } from "@/services/features/auth.service";
import { socketClient } from "@/services/api/socket.client";

interface ChatWindowProps {
  activeRoom?: ChatRoom | null;
}

interface TypingUser {
  userId: string;
  userName: string;
}

/**
 * ChatWindow Component
 * -------------------
 * Menampilkan jendela percakapan aktif, menangani pengiriman pesan,
 * memuat riwayat pesan, dan mengelola indikator real-time (typing).
 */
export const ChatWindow: React.FC<ChatWindowProps> = ({ activeRoom }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [myUserId, setMyUserId] = useState<string>("");
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  const typingTimeout = React.useRef<NodeJS.Timeout | null>(null); //jeda antara ketikan terakhir dan pengiriman event stop typing
  const typingTimeoutsRef = React.useRef<Record<string, NodeJS.Timeout>>({}); // Fail-safe timeouts
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);

  /**
   * EFFECT 1: Initial Setup
   * Berjalan sekali saat komponen dimount untuk mengambil profil user yang login.
   */
  useEffect(() => {
    const initProfile = async () => {
      try {
        const user: any = await authService.getProfile();
        const actualId = Array.isArray(user) ? user[0]?.id : user?.id;
        if (actualId) setMyUserId(actualId);
      } catch (error) {
        console.error("Initialization failed:", error);
      }
    };
    initProfile();
  }, []);

  /**
   * EFFECT 2: Room Lifecycle (Data & WebSocket)
   * Mengatur semua kebutuhan saat pindah room:
   * 1. Ambil riwayat pesan (HTTP)
   * 2. Join room WebSocket
   * 3. Pasang listeners (New Message, Typing)
   * 4. Cleanup saat pindah room/unmount
   */
  useEffect(() => {
    if (!activeRoom) return;

    const roomId = activeRoom.roomId;

    // --- A. Fetch Messages ---
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const fetched = await chatService.getMessages(roomId);
        setMessages(fetched);
      } catch (err) {
        console.error("Load messages failed:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();

    // --- B. WebSocket Event Handlers ---
    const handleNewMessage = (msg: ChatMessage) => {
      // Filter: Hanya terima pesan untuk room yang sedang aktif
      if (msg.roomId !== roomId) return;

      setMessages((prev) => {
        if (prev.some((m) => m.textId === msg.textId)) return prev;
        return [...prev, msg];
      });
    };

    const handleTypingStart = (data: {
      userId: string;
      userName: string;
      roomId: string;
    }) => {
      if (data.roomId !== roomId || data.userId === myUserId) return;
      setTypingUsers((prev) => {
        if (prev.find((u) => u.userId === data.userId)) return prev;
        return [
          ...prev,
          { userId: data.userId, userName: data.userName || "Someone" },
        ];
      });

      // Fail-safe Timeout: Hapus user dari daftar jika tidak ada update selama 5 detik
      if (typingTimeoutsRef.current[data.userId]) {
        clearTimeout(typingTimeoutsRef.current[data.userId]);
      }
      typingTimeoutsRef.current[data.userId] = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
      }, 5000);
    };

    const handleTypingStop = (data: { userId: string; roomId: string }) => {
      if (data.roomId !== roomId) return;
      setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));

      if (typingTimeoutsRef.current[data.userId]) {
        clearTimeout(typingTimeoutsRef.current[data.userId]);
        delete typingTimeoutsRef.current[data.userId];
      }
    };

    // --- C. Register Listeners & Join ---
    socketClient.emit("join_room", roomId);
    socketClient.on("new_message", handleNewMessage);
    socketClient.on("user_typing", handleTypingStart);
    socketClient.on("user_stopped_typing", handleTypingStop);

    // --- D. Cleanup ---
    return () => {
      setMessages([]); // Reset messages UI
      setTypingUsers([]); // Reset typing indicator
      socketClient.off("new_message", handleNewMessage);
      socketClient.off("user_typing", handleTypingStart);
      socketClient.off("user_stopped_typing", handleTypingStop);
    };
  }, [activeRoom, myUserId]);

  /**
   * EFFECT 3: Auto-scroll
   * Memastikan window selalu scroll ke bawah setiap ada pesan baru.
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /**
   * Menangani perubahan input teks dan mengirim sinyal typing ke server.
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputText(value);

    if (!activeRoom) return;

    // Emit typing signal
    socketClient.emit("typing_start", activeRoom.roomId);

    // Debounce: Kirim typing_stop jika tidak ada aktivitas selama 2 detik
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socketClient.emit("typing_stop", activeRoom.roomId);
    }, 1000);
  };

  /**
   * Mengirim pesan baru ke server via HTTP.
   * Respon akan otomatis ditambahkan ke UI lewat state lokal (atau via socket nantinya).
   */
  const handleSendMessage = async () => {
    if (!activeRoom || !inputText.trim()) return;

    try {
      const text = inputText;
      setInputText(""); // Clear input segera (Optimistic UI)

      const newMessage = await chatService.sendMessage(activeRoom.roomId, text);

      // Tambahkan ke state jika belum ada (antisipasi broadcast socket)
      setMessages((prev) => {
        if (prev.some((m) => m.textId === newMessage.textId)) return prev;
        return [...prev, newMessage];
      });
    } catch (error) {
      console.error("Send failed:", error);
    }
  };

  const handleInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderTypingText = () => {
    if (typingUsers.length === 0) return null;
    if (typingUsers.length === 1)
      return `${typingUsers[0].userName} is typing...`;
    if (typingUsers.length === 2)
      return `${typingUsers.map((u) => u.userName.split(","))} are typing...`;
    return `${typingUsers[0].userName} and others are typing...`;
  };

  if (!activeRoom) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-white text-gray-500">
        Select a chat room to start messaging
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 h-18.25 shrink-0 border-gray-200 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold uppercase">
            {activeRoom.roomName?.substring(0, 2) || "??"}
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 leading-tight">
              {activeRoom.roomName || "Unknown Room"}
            </h2>
            {typingUsers.length > 0 ? (
              <span className="text-xs text-blue-500 font-medium animate-pulse">
                {renderTypingText()}
              </span>
            ) : (
              <span className="text-xs text-green-500 font-medium">Online</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-gray-400">
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Phone size={20} />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Video size={20} />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Info size={20} />
          </button>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {loading ? (
          <div className="text-center text-gray-400 mt-10">
            Loading messages...
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender?.senderId === myUserId;
            return (
              <div
                key={msg.textId}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                style={{ marginBottom: "12px" }}
              >
                <div
                  className={`max-w-xs md:max-w-3/4 lg:max-w-lg w-fit ${
                    isMe ? "ml-auto" : "mr-auto"
                  }`}
                >
                  {activeRoom.isGroup && !isMe && msg.sender?.senderName && (
                    <span className="ml-2 text-xs font-light opacity-70">
                      {msg.sender.senderName}
                    </span>
                  )}
                  <div
                    className={`px-4 py-2 rounded-lg relative shadow text-[14px] ${
                      isMe ? "bg-blue-500 text-white" : "bg-white text-gray-900"
                    }`}
                  >
                    <p className="text-sm wrap-break-word">{msg.text}</p>
                  </div>
                  <span
                    className={`text-[10px] mt-1 block ${
                      isMe
                        ? "text-blue-800 text-right"
                        : "text-gray-800 text-left"
                    }`}
                  >
                    {msg.createdAt
                      ? new Date(msg.createdAt).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })
                      : ""}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4">
        <div className="flex items-center gap-2 mx-auto">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Type a message..."
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyPress}
              className="w-full pl-4 pr-10 py-2 bg-gray-100 border-none rounded-xl text-sm focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
