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

export const ChatWindow: React.FC<ChatWindowProps> = ({ activeRoom }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [myUserId, setMyUserId] = useState<string>("");
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeout = React.useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null); //auto-scroll ke bawah

  //fetch user yang sedang login
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user: any = await authService.getProfile();
        // Jika data yang datang adalah array [user], ambil elemen pertamanya
        const actualId = Array.isArray(user) ? user[0]?.id : user?.id;

        if (actualId) {
          console.log("My User ID:", actualId); // Debug ID saya
          setMyUserId(actualId);
        }
      } catch (error) {
        console.error("Failed to fetch user ID:", error);
      }
    };
    fetchProfile();
  }, []);

  //web scocket connection
  useEffect(() => {
    const handleTypingStart = ({
      userId,
      userName,
      roomId,
    }: {
      userId: string;
      userName: string;
      roomId: string;
    }) => {
      // Pastikan event untuk room yang aktif dan bukan diri sendiri
      if (roomId !== activeRoom?.roomId || userId === myUserId) {
        return;
      }
      setTypingUsers((prev) => {
        // Cek berdasarkan userId agar unik
        if (!prev.find((u) => u.userId === userId)) {
          return [...prev, { userId, userName: userName || "Someone" }];
        }
        return prev;
      });
    };

    const handleTypingStop = ({
      userId,
      roomId,
    }: {
      userId: string;
      roomId: string;
    }) => {
      if (roomId !== activeRoom?.roomId) return;
      // Filter berdasarkan properti userId di dalam object
      setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
    };

    socketClient.on("user_typing", handleTypingStart);
    socketClient.on("user_stopped_typing", handleTypingStop);

    // --- Pemisahan logic Join Room ---
    if (activeRoom) {
      setTypingUsers([]); // Reset list saat ganti room
      socketClient.emit("join_room", activeRoom.roomId);
    }

    //dengarkan event pesan baru
    const handleNewMessage = (newMessage: ChatMessage) => {
      if (activeRoom && newMessage.roomId !== activeRoom.roomId) {
        return;
      }

      setMessages((prevMessages) => {
        const isMessageExist = prevMessages.some(
          (msg) => msg.textId === newMessage.textId
        );
        if (isMessageExist) {
          return prevMessages;
        }
        return [...prevMessages, newMessage];
      });
    };
    socketClient.on("new_message", handleNewMessage);

    return () => {
      socketClient.off("new_message", handleNewMessage);
      socketClient.off("user_typing", handleTypingStart);
      socketClient.off("user_stopped_typing", handleTypingStop);
    };
  }, [activeRoom, myUserId]); // Tambahkan myUserId ke dependency agar perbandingan isMe akurat

  //fetch messages ketika activeRoom berubah
  useEffect(() => {
    // Fetch messages when activeRoom changes
    const fetchMessages = async () => {
      if (!activeRoom) return;
      setLoading(true);
      try {
        const fetchedMessages = await chatService.getMessages(
          activeRoom.roomId
        );
        setMessages(fetchedMessages);
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [activeRoom]);

  // Auto-scroll ke bawah ketika messages berubah
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputText(value);

    // Handle typing indicator
    if (!activeRoom) return;
    socketClient.emit("typing_start", activeRoom.roomId);

    // Reset timeout
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }

    typingTimeout.current = setTimeout(() => {
      socketClient.emit("typing_stop", activeRoom.roomId);
    }, 500);
  };

  //handle kirim chat
  const handleSendMessage = async () => {
    if (!activeRoom || inputText.trim() === "") return;
    try {
      const temptText = inputText;
      setInputText("");
      const newMessage = await chatService.sendMessage(
        activeRoom.roomId,
        temptText
      );
      setMessages((prevMessages) => {
        const isMessageExist = prevMessages.some(
          (msg) => msg.textId === newMessage.textId
        );
        if (isMessageExist) {
          return prevMessages; // Jangan tambahkan pesan duplikat
        }
        return [...prevMessages, newMessage];
      });
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  //kirim chat ketika tekan enter
  const handleInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!activeRoom) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-white">
        <p className="text-gray-500">Select a chat room to start messaging</p>
      </div>
    );
  }
  // helper typing indicator
  const renderTypingText = () => {
    if (typingUsers.length === 0) return null;
    if (typingUsers.length === 1)
      return `${typingUsers[0].userName} is typing...`;
    if (typingUsers.length >= 2)
      return `${typingUsers.map((u) => u.userName)} are typing...`;
    return `${typingUsers[0].userName} and others are typing...`;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 h-18.25 shrink-0  border-gray-200 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold uppercase">
            {activeRoom.roomName ? activeRoom.roomName.substring(0, 2) : "??"}
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {loading ? (
          <div className="text-center text-gray-400 mt-10">
            Loading messages..
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender?.senderId === myUserId;
            return (
              <div
                key={msg.textId}
                className={`flex ${
                  isMe ? "justify-end" : "justify-start"
                } space-y-0`}
                style={{ marginBottom: "12px" }} // tambahkan jarak antar bubble lebih kecil
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
                    className={`text-[10px] mt-1 block  ${
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
          {/* <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
            <Paperclip size={22} />
          </button> */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Type a message..."
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyPress}
              className="w-full pl-4 pr-10 py-2 bg-gray-100 border-none rounded-xl wrap-break-word text-sm focus:ring-1 focus:ring-blue-500 transition-all"
            />
            {/* <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600">
              <Smile size={20} />
            </button> */}
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
