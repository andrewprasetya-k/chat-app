import React from "react";
import { Send, Smile, Paperclip, Phone, Video, Info } from "lucide-react";

const MOCK_MESSAGES = [
  {
    id: 1,
    sender: "John Doe",
    text: "Hey! How's the project going?",
    time: "9:00 AM",
    isMe: false,
  },
  {
    id: 2,
    sender: "Me",
    text: "Pretty good! Just finished the UI design.",
    time: "9:05 AM",
    isMe: true,
  },
  {
    id: 3,
    sender: "John Doe",
    text: "Awesome! Can't wait to see it.",
    time: "9:10 AM",
    isMe: false,
  },
  {
    id: 4,
    sender: "Me",
    text: "I'll share the preview in a bit. Just polishing some components.",
    time: "9:12 AM",
    isMe: true,
  },
];

export const ChatWindow = () => {
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
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
        {MOCK_MESSAGES.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] px-4 py-2 rounded-2xl shadow-sm ${
                msg.isMe
                  ? "bg-blue-600 text-white rounded-br-none"
                  : "bg-white text-gray-800 rounded-bl-none border border-gray-100"
              }`}
            >
              {!msg.isMe && (
                <p className="text-[10px] font-bold opacity-60 mb-1">
                  {msg.sender}
                </p>
              )}
              <p className="text-sm">{msg.text}</p>
              <p
                className={`text-[10px] mt-1 text-right ${
                  msg.isMe ? "text-blue-100" : "text-gray-400"
                }`}
              >
                {msg.time}
              </p>
            </div>
          </div>
        ))}
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
