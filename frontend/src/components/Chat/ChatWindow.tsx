import React, { act, use, useEffect, useState } from "react";
import {
  Send,
  Smile,
  Paperclip,
  Phone,
  Video,
  Info,
  Check,
  CheckCheck,
  Trash,
  CircleAlert,
  SendHorizonal,
  Reply,
} from "lucide-react";
import { ChatMessage, ChatRoom } from "@/services/types";
import { chatService } from "@/services/features/chat.service";
import { authService } from "@/services/features/auth.service";
import { socketClient } from "@/services/api/socket.client";
import { formatRelativeTime } from "@/utils/date.util";
import { RoomInfoDrawer } from "./RoomInfoDrawer";

interface ChatWindowProps {
  activeRoom?: ChatRoom | null;
  onlineUsers: Set<string>;
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
export const ChatWindow: React.FC<ChatWindowProps> = ({
  activeRoom,
  onlineUsers,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [myUserId, setMyUserId] = useState<string>("");
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const isOtherUserOnline = React.useMemo(() => {
    if (!activeRoom || activeRoom.isGroup || !activeRoom.otherUserId)
      return false;
    return onlineUsers.has(activeRoom.otherUserId);
  }, [activeRoom, onlineUsers]);
  const [isMeMyId, setIsMyId] = useState<boolean>(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(
    null,
  );
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null);

  const typingTimeout = React.useRef<NodeJS.Timeout | null>(null); //jeda antara ketikan terakhir dan pengiriman event stop typing
  const typingTimeoutsRef = React.useRef<Record<string, NodeJS.Timeout>>({}); // Fail-safe timeouts
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);

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
        // console.error("Initialization failed:", error);
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
    setHasMore(true); // Reset hasMore saat pindah room

    // --- A. Fetch Messages ---
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const fetched = await chatService.getMessages(roomId, { limit: 20 });
        setMessages(fetched);
        if (fetched.length < 20) setHasMore(false);

        // Mark all messages as read in the backend (to clear zombie unread counts)
        await chatService.markAllAsRead(roomId);
      } catch (err) {
        // console.error("Load messages failed:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();

    //Handle reatltime read receipt
    const handleReadMessageRealtime = (data: {
      roomId: string;
      readerId: string;
      readerName: string;
      messageIds: string[];
    }) => {
      //cek kalau roomId sesuai dengan room yang sedang aktif
      if (data.roomId != activeRoom.roomId) {
        return;
      }
      //update state messages untuk menandai pesan sudah dibaca
      setMessages((prevMessages) =>
        prevMessages.map((msg) => {
          if (data.messageIds.includes(msg.textId)) {
            //cek apakah readerId sudah ada di readBy
            const alreadyRead = msg.readBy.some(
              (reader) => reader.userId === data.readerId,
            );
            if (alreadyRead) {
              return msg; //tidak perlu diupdate
            }
            return {
              ...msg,
              readBy: [
                ...msg.readBy,
                { userId: data.readerId, userName: data.readerName },
              ],
            };
          }
          return msg;
        }),
      );
    };

    // --- B. WebSocket Event Handlers ---
    const handleNewMessage = (msg: ChatMessage) => {
      // Filter: Hanya terima pesan untuk room yang sedang aktif
      if (msg.roomId !== roomId) return;

      setMessages((prev) => {
        if (prev.some((m) => m.textId === msg.textId)) return prev;
        return [...prev, msg];
      });
    };
    setLastSeen(formatRelativeTime(activeRoom.lastSeen) || null);
    if (activeRoom.roomName === "Me") {
      setIsMyId(true);
    }

    // --- C. Typing Handlers ---
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

    // --- D. Register Listeners & Join ---
    socketClient.on("messages_read_update", handleReadMessageRealtime);
    socketClient.emit("join_room", roomId);
    socketClient.on("new_message", handleNewMessage);
    socketClient.on("user_typing", handleTypingStart);
    socketClient.on("user_stopped_typing", handleTypingStop);

    //handle unsend message realtime
    const handleUnsendMessage = (data: {
      messageId: string;
      roomId: string;
    }) => {
      if (data.roomId !== roomId) return;
      setMessages((prevMessages) =>
        prevMessages.map((msg) => {
          if (msg.textId === data.messageId) {
            return {
              ...msg,
              text: "This message was unsent", // Hardcoded to match backend DB update
            };
          }
          return msg;
        }),
      );
    };
    socketClient.on("message_unsent", handleUnsendMessage);

    // --- E. Cleanup ---
    return () => {
      setMessages([]); // Reset messages UI
      setTypingUsers([]); // Reset typing indicator
      socketClient.off("message_unsent", handleUnsendMessage);
      socketClient.off("messages_read_update", handleReadMessageRealtime);
      socketClient.off("new_message", handleNewMessage);
      socketClient.off("user_typing", handleTypingStart);
      socketClient.off("user_stopped_typing", handleTypingStop);
      socketClient.emit("leave_room", roomId);
    };
  }, [activeRoom, myUserId]);

  /**
   * EFFECT 3: Smart Auto-scroll
   * Menangani perpindahan layar ke pesan terbaru dengan mempertimbangkan konteks:
   * 1. Jika pindah room: Paksa scroll ke paling bawah secara instan.
   * 2. Jika ada pesan baru & user di posisi bawah: Scroll halus (smooth) mengikuti pesan.
   * 3. Jika ada pesan baru tapi user sedang scroll di atas: Diam (jangan ganggu user membaca).
   */
  const prevRoomId = React.useRef<string | null>(null);

  useEffect(() => {
    // Jangan scroll jika data sedang dimuat (initial load/pagination)
    if (messages.length === 0 || loadingMore || loading) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    // Deteksi apakah ini perpindahan room baru atau hanya penambahan pesan
    const isRoomChange = prevRoomId.current !== activeRoom?.roomId;

    // Cek apakah user sedang berada di "area aktif" pesan terbaru (threshold 150px dari bawah)
    const isAtBottom =
      container.scrollHeight - container.scrollTop <=
      container.clientHeight + 150;

    if (isRoomChange || isAtBottom) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: isRoomChange ? "auto" : "smooth",
        });
      }, 50);
    }

    prevRoomId.current = activeRoom?.roomId || null;
  }, [messages.length, activeRoom?.roomId, loading, loadingMore]);

  /**
   * LOGIC: Infinite Scroll (Pagination ke Atas)
   * Terpicu saat user melakukan scroll pada container pesan.
   */
  const handleScroll = async () => {
    if (
      !scrollContainerRef.current ||
      loadingMore ||
      !hasMore ||
      !activeRoom ||
      loading
    )
      return;

    const { scrollTop, scrollHeight } = scrollContainerRef.current;

    /**
     * THRESHOLD TRIGGER (100px):
     * Kita memicu loading saat user hampir menyentuh atas (sisa 100px),
     * bukan saat benar-benar mentok (0), agar transisi terasa lebih seamless.
     */
    if (scrollTop < 100) {
      setLoadingMore(true);

      // KURSOR: Menggunakan timestamp pesan tertua sebagai referensi pengambilan data berikutnya
      const oldestMessage = messages[0];
      if (!oldestMessage) {
        setLoadingMore(false);
        return;
      }

      const beforeAt = oldestMessage.createdAt;

      try {
        const moreMessages = await chatService.getMessages(activeRoom.roomId, {
          limit: 20,
          beforeAt: beforeAt,
        });

        if (moreMessages.length < 20) {
          setHasMore(false); // Sinyal bahwa tidak ada pesan lagi yang bisa dimuat
        }

        if (moreMessages.length > 0) {
          /**
           * ANTI-JUMP LOGIC (Scroll Anchoring):
           * Saat data baru dimasukkan ke awal array (prepend), tinggi container akan bertambah.
           * Tanpa logic ini, layar akan tetap di posisi scrollTop 0 (menampilkan pesan paling lama).
           * Kita menghitung selisih tinggi baru vs lama, lalu mengembalikan posisi scroll
           * agar user tetap melihat pesan yang sama sebelum loading.
           */
          const prevScrollHeight = scrollContainerRef.current.scrollHeight;
          const prevScrollTop = scrollContainerRef.current.scrollTop;

          setMessages((prev) => [...moreMessages, ...prev]);

          requestAnimationFrame(() => {
            if (scrollContainerRef.current) {
              const newScrollHeight = scrollContainerRef.current.scrollHeight;
              const heightDifference = newScrollHeight - prevScrollHeight;
              // Kembalikan posisi scroll relatif terhadap data yang baru masuk
              scrollContainerRef.current.scrollTop =
                prevScrollTop + heightDifference;
            }
          });
        }
      } catch (error) {
        // console.error("Load more messages failed:", error);
      } finally {
        setLoadingMore(false);
      }
    }
  };

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

  //effect 4: auto-mark as read messages
  useEffect(() => {
    // pastikan room aktif dan ada pesan
    if (!activeRoom || messages.length === 0 || !myUserId) return;

    // cari pesan yang belum dibaca dan bukan dari diri sendiri
    const unreadMessageIds = messages.filter((msg) => {
      const isMyMessage = msg.sender?.senderId === myUserId; //pesan dari diri sendiri

      // Log detail untuk pesan orang lain

      const isReadByMe = msg.readBy.some(
        (reader) => reader.userId === myUserId,
      ); //sudah dibaca oleh diri sendiri

      return !isMyMessage && !isReadByMe;
    });

    //kalau tidak ada pesan yang belum dibaca, hentikan proses
    if (unreadMessageIds.length === 0) return;

    // ambil ID pesan saja
    const unreadMessageIdsStrings = unreadMessageIds.map((msg) => msg.textId);

    // panggil API mark as read
    chatService
      .markAsRead(activeRoom.roomId, unreadMessageIdsStrings)
      .then(() => {})
      .catch((err) => {});

    // update state lokal untuk menandai pesan sudah dibaca
    setMessages((prevMessages) => {
      return prevMessages.map((msg) => {
        if (unreadMessageIdsStrings.includes(msg.textId)) {
          return {
            ...msg,
            readBy: [...msg.readBy, { userId: myUserId, userName: "Me" }],
          };
        }
        return msg;
      });
    });
  }, [messages, activeRoom?.roomId, myUserId]);

  /**
   * Mengirim pesan baru ke server via HTTP.
   * Respon akan otomatis ditambahkan ke UI lewat state lokal (atau via socket nantinya).
   */
  const handleSendMessage = async () => {
    if (!activeRoom || !inputText.trim()) return;

    try {
      const text = inputText;
      setInputText(""); // Clear input segera (Optimistic UI)
      const currentReply = replyToMessage; // Simpan referensi sebelum reset
      setReplyToMessage(null); // Reset mode reply segera

      const newMessage = await chatService.sendMessage(
        activeRoom.roomId,
        text,
        currentReply?.textId, // Kirim ID pesan yang dibalas
      );

      // Manual Injection untuk UI (jika backend response belum lengkap relasinya)
      if (currentReply && !newMessage.replyTo) {
        newMessage.replyTo = {
          id: currentReply.textId,
          text: currentReply.text,
          senderName: currentReply.sender?.senderName || "Unknown",
        };
      }

      // Tambahkan ke state jika belum ada (antisipasi broadcast socket)
      setMessages((prev) => {
        if (prev.some((m) => m.textId === newMessage.textId)) return prev;
        return [...prev, newMessage];
      });
    } catch (error) {
      // console.error("Send failed:", error);
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
      return `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing...`;
    return `${typingUsers[0].userName} and ${typingUsers.length - 1} others are typing...`;
  };

  if (!activeRoom) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-white text-gray-500">
        Select a chat room to start messaging!!
      </div>
    );
  }

  const renderRoomStatus = () => {
    if (typingUsers.length > 0) {
      return (
        <span className="text-xs text-blue-500 font-medium animate-pulse">
          {renderTypingText()}
        </span>
      );
    }
    if (activeRoom.isGroup) {
      return (
        <span className="text-xs text-gray-500">Click for group info</span>
      );
    } else {
      return (
        <span
          className={`text-xs ${
            isOtherUserOnline ? "text-blue-500 font-medium" : "text-gray-500"
          }`}
        >
          {isOtherUserOnline
            ? "Online"
            : lastSeen
              ? `Last seen ${lastSeen}`
              : "Offline"}
        </span>
      );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">
      {/* Header */}
      <div className="p-4 h-18.25 shrink-0  flex items-center justify-between bg-white sticky top-0 z-10">
        <div
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setIsDrawerOpen(true)}
        >
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold uppercase">
            {activeRoom.roomName?.substring(0, 2) || "??"}
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 leading-tight">
              {activeRoom.roomName || "Unknown Room"}
            </h2>
            {renderRoomStatus()}
          </div>
        </div>
        <div className="flex items-center gap-1 text-gray-400">
          {/* <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Phone size={20} />
          </button> */}
          {/* <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Video size={20} />
          </button> */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-blue-600"
          >
            <Info size={20} />
          </button>
        </div>
      </div>

      {/* Messages List */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
      >
        {loadingMore && (
          <div className="flex justify-center py-2">
            <div className="text-[10px] text-blue-500 font-medium animate-pulse bg-blue-50 px-3 py-1 rounded-full shadow-sm">
              Loading older messages...
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-400 mt-10">
            Loading messages...
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender?.senderId === myUserId;
            const isSystem = msg.type === "system";

            // --- 1. RENDER PESAN SISTEM (Timeline Event) ---
            if (isSystem) {
              return (
                <div key={msg.textId} className="flex justify-center my-2">
                  <div className="bg-gray-200/50 text-gray-500 text-[10px] px-3 py-1 rounded-full font-medium uppercase tracking-tight">
                    {msg.text}
                  </div>
                </div>
              );
            }

            // --- 2. RENDER BUBBLE CHAT BIASA ---
            return (
              <div
                key={msg.textId}
                id={`msg-${msg.textId}`}
                className={`flex group items-end gap-2 mb-3 ${
                  isMe ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Avatar Lawan Bicara ( bisa untuk grup) */}
                {/* {!isMe && activeRoom.isGroup && (
                  <div className="w-6 h-6 rounded-full bg-gray-300 shrink-0 flex items-center justify-center text-[10px] font-bold text-gray-600 mb-1">
                    {msg.sender?.senderName?.[0] || "?"}
                  </div>
                )} */}

                <div
                  className={`max-w-xs md:max-w-3/4 lg:max-w-lg flex flex-col ${
                    isMe ? "items-end" : "items-start"
                  }`}
                >
                  {/* Nama Pengirim di Grup */}
                  {activeRoom.isGroup && !isMe && msg.sender?.senderName && (
                    <span className="ml-1 mb-0.5 text-[10px] font-bold text-gray-500">
                      {msg.sender.senderName}
                    </span>
                  )}

                  <div
                    className={`relative px-3 py-2 rounded-2xl text-sm transition-all duration-500 ${
                      highlightedMessageId === msg.textId
                        ? "ring-1 ring-yellow-400 scale-[1.02] z-10"
                        : ""
                    } ${
                      isMe
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-white text-gray-900 border border-gray-100 rounded-bl-none"
                    }`}
                  >
                    {/* --- QUOTED MESSAGE (REPLY) --- */}
                    {msg.replyTo && (
                      <div
                        className={`mb-2 p-2 rounded-lg text-xs cursor-pointer border-l-4 ${
                          isMe
                            ? "bg-white-700/50 border-blue-300 text-blue-50"
                            : "bg-gray-100 border-indigo-400 text-gray-600"
                        }`}
                        onClick={() => {
                          const targetId = msg.replyTo?.id;
                          if (!targetId) return;

                          setHighlightedMessageId(targetId);
                          setTimeout(() => setHighlightedMessageId(null), 2000);

                          const el = document.getElementById(`msg-${targetId}`);
                          if (el)
                            el.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            });
                        }}
                      >
                        <span className="block font-bold mb-0.5 opacity-90">
                          {msg.replyTo.senderName}
                        </span>
                        <p className="truncate opacity-80">
                          {msg.replyTo.text}
                        </p>
                      </div>
                    )}

                    {/* --- MAIN MESSAGE TEXT --- */}
                    {msg.text === "This message was unsent" ||
                    msg.text === "[This message was unsent]" ? (
                      <p className="italic opacity-70 flex items-center gap-1.5 text-xs">
                        <CircleAlert size={12} />
                        Message unsent
                      </p>
                    ) : (
                      <p className="wrap-break-word leading-snug">{msg.text}</p>
                    )}

                    {/* --- TIMESTAMP & READ STATUS --- */}
                    <div
                      className={`text-[9px] mt-1 flex items-center justify-end gap-1 ${
                        isMe ? "text-blue-100" : "text-gray-400"
                      }`}
                    >
                      <span>
                        {msg.createdAt
                          ? new Date(
                              msg.createdAt.endsWith("Z") ||
                                msg.createdAt.includes("+")
                                ? msg.createdAt
                                : msg.createdAt + "Z",
                            ).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })
                          : ""}
                      </span>
                      {isMe && (
                        <span>
                          {msg.readBy.length > 0 ? (
                            <CheckCheck size={12} strokeWidth={3} />
                          ) : (
                            <Check size={12} strokeWidth={3} />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ACTION BUTTONS (Hidden by default, visible on hover) */}
                <div
                  className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                    isMe ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Reply Button */}
                  <button
                    onClick={() => setReplyToMessage(msg)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors"
                    title="Reply"
                  >
                    <Reply size={14} />
                  </button>

                  {/* Unsend Button (Only for Me) */}
                  {isMe &&
                    msg.text !== "This message was unsent" &&
                    msg.text !== "[This message was unsent]" && (
                      <button
                        onClick={() => {
                          if (window.confirm("Unsend this message?")) {
                            chatService.unsendMessage(
                              msg.textId,
                              activeRoom.roomId,
                            );
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        title="Unsend"
                      >
                        <Trash size={14} />
                      </button>
                    )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 pt-2">
        {/* Reply Preview Panel */}
        {replyToMessage && (
          <div className="flex items-center justify-between bg-gray-50 border-l-4 border-blue-500 p-2 mb-2 rounded-r-lg animate-in slide-in-from-bottom-2 fade-in duration-200">
            <div className="overflow-hidden">
              <span className="block text-xs font-bold text-blue-600 mb-0.5">
                Replying to{" "}
                {replyToMessage.sender?.senderId === myUserId
                  ? "Yourself"
                  : replyToMessage.sender?.senderName || "Someone"}
              </span>
              <p className="text-xs text-gray-500 truncate max-w-xs md:max-w-md">
                {replyToMessage.text}
              </p>
            </div>
            <button
              onClick={() => setReplyToMessage(null)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
            >
              <Trash size={14} className="rotate-45" />{" "}
              {/* Using Trash rotated as X */}
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 mx-auto">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Type a message..."
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyPress}
              className="w-full pl-4 pr-10 py-2 border-b border-gray-300 focus:ring-0 focus:outline-none focus:border-blue-500 text-sm transition-all"
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <SendHorizonal size={20} />
          </button>
        </div>
      </div>

      {/* Room Info Drawer */}
      <RoomInfoDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        roomId={activeRoom.roomId}
      />
    </div>
  );
};
