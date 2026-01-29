import React from "react";

export const MessageSkeleton: React.FC = () => {
  return (
    <div className="flex items-end gap-2 mb-3 animate-pulse">
      <div className="w-6 h-6 rounded-full bg-slate-200"></div>
      <div className="max-w-xs flex flex-col">
        <div className="bg-slate-200 rounded-2xl rounded-bl-none p-3">
          <div className="h-4 bg-slate-300 rounded mb-2"></div>
          <div className="h-4 bg-slate-300 rounded w-3/4"></div>
        </div>
      </div>
    </div>
  );
};

export const MyMessageSkeleton: React.FC = () => {
  return (
    <div className="flex items-end gap-2 mb-3 flex-row-reverse animate-pulse">
      <div className="max-w-xs flex flex-col items-end">
        <div className="bg-blue-200 rounded-2xl rounded-br-none p-3">
          <div className="h-4 bg-blue-300 rounded mb-2"></div>
          <div className="h-4 bg-blue-300 rounded w-2/3"></div>
        </div>
      </div>
    </div>
  );
};

export const ChatListSkeleton: React.FC = () => {
  return (
    <div className="p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-slate-200"></div>
        <div className="flex-1">
          <div className="h-4 bg-slate-200 rounded mb-2"></div>
          <div className="h-4 bg-slate-200 rounded w-3/4"></div>
        </div>
        <div className="h-4 bg-slate-200 rounded w-8"></div>
      </div>
    </div>
  );
};

export const SidebarSkeleton: React.FC = () => {
  return (
    <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
      {/* Header Skeleton */}
      <div className="p-4 border-b border-slate-100 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-slate-200 rounded w-20"></div>
          <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
        </div>
        <div className="h-10 bg-slate-200 rounded-full"></div>
      </div>

      {/* Chat List Skeleton */}
      <div className="flex-1 overflow-y-auto">
        {Array.from({ length: 8 }).map((_, i) => (
          <ChatListSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};
