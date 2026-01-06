import React, { use, useEffect, useState } from "react";
import { Send, Smile, Paperclip, Phone, Video, Info } from "lucide-react";
import { ChatMessage, ChatRoom } from "@/services/types";
import { chatService } from "@/services/features/chat.service";
import { authService } from "@/services/features/auth.service";

interface ChatWindowProps {
  activeRoom?: ChatRoom | null;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ activeRoom }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [myUserId, setMyUserId] = useState<string>("");
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null); //auto-scroll ke bawah

  //fetch user yang sedang login
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = await authService.getProfile();
        setMyUserId(user.id);
      } catch (error) {
        console.error("Failed to fetch user ID:", error);
      }
    };
    fetchProfile();
  }, []);
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
      setMessages((prevMessages) => [...prevMessages, newMessage]);
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

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 h-18.25 shrink-0 border-b border-gray-200 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
            JD
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 leading-tight">
              John Doe
            </h2>
            <span className="text-xs text-green-500 font-medium">Online</span>
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
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`
                  max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-xl 
                  ${isMe ? "bg-blue-600 text-white" : "bg-white text-gray-900"}
                  shadow
                `}
                >
                  <p className="text-sm">{msg.text}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
            <Paperclip size={22} />
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Type a message..."
              className="w-full pl-4 pr-10 py-3 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600">
              <Smile size={20} />
            </button>
          </div>
          <button className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95">
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
