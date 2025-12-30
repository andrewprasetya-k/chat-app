import React from "react";
import {
  Search,
  MoreVertical,
  MessageSquarePlus,
  UserCircle,
} from "lucide-react";

const MOCK_CHATS = [
  {
    id: 1,
    name: "Project X Team",
    lastMessage: "Let's meet at 10",
    time: "10:30 AM",
    unread: 3,
    isGroup: true,
  },
  {
    id: 2,
    name: "John Doe",
    lastMessage: "Did you see the latest update?",
    time: "9:15 AM",
    unread: 0,
    isGroup: false,
  },
  {
    id: 3,
    name: "Design System",
    lastMessage: "New icons are ready",
    time: "Yesterday",
    unread: 0,
    isGroup: true,
  },
  {
    id: 4,
    name: "Alice Smith",
    lastMessage: "Thanks!",
    time: "Yesterday",
    unread: 1,
    isGroup: false,
  },
];

export const Sidebar = () => {
  return (
    <div className="w-80 h-full border-r border-gray-200 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-4 h-18.25 shrink-0 bg-white border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
            AP
          </div>
          <span className="font-semibold text-gray-800">Me</span>
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
        {MOCK_CHATS.map((chat) => (
          <div
            key={chat.id}
            className="p-4 flex items-center gap-3 hover:bg-white cursor-pointer transition-colors border-b border-gray-100 last:border-0 group"
          >
            <div className="relative">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                  chat.isGroup
                    ? "bg-indigo-100 text-indigo-600"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {chat.name.substring(0, 2).toUpperCase()}
              </div>
              {!chat.isGroup && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {chat.name}
                </h3>
                <span className="text-xs text-gray-500">{chat.time}</span>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500 truncate">
                  {chat.lastMessage}
                </p>
                {chat.unread > 0 && (
                  <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {chat.unread}
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
