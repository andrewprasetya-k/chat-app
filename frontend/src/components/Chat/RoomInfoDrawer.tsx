import React, { useEffect, useState } from "react";
import { X, User, LogOut, Trash2, Calendar, MoreVertical, UserPlus, ShieldCheck, ShieldAlert, UserMinus } from "lucide-react";
import { chatService } from "@/services/features/chat.service";
import { ChatRoomInfo } from "@/services/types";
import { AddMemberModal } from "./AddMemberModal";

interface RoomInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
}

export const RoomInfoDrawer: React.FC<RoomInfoDrawerProps> = ({
  isOpen,
  onClose,
  roomId,
}) => {
  const [roomInfo, setRoomInfo] = useState<ChatRoomInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchInfo = async () => {
    try {
      setLoading(true);
      const info = await chatService.getRoomInfo(roomId);
      setRoomInfo(info);
    } catch (error) {
      // console.error("Failed to fetch room info:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && roomId) {
      fetchInfo();
    }
  }, [isOpen, roomId]);

  const handleLeaveGroup = async () => {
    if (!window.confirm("Are you sure you want to leave this group?")) return;
    try {
      setActionLoading(true);
      await chatService.leaveGroup(roomId);
      onClose();
      window.location.reload(); 
    } catch (error) {
      alert("Failed to leave group");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm("Are you sure you want to delete this group? This action cannot be undone.")) return;
    try {
      setActionLoading(true);
      await chatService.deleteGroup(roomId);
      onClose();
      window.location.reload();
    } catch (error) {
      alert("Failed to delete group");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMemberAction = async (action: string, targetUserId: string) => {
    try {
      setActionLoading(true);
      if (action === "promote") await chatService.promoteMember(roomId, targetUserId);
      else if (action === "demote") await chatService.demoteMember(roomId, targetUserId);
      else if (action === "remove") {
        if (!window.confirm("Remove this member?")) return;
        await chatService.removeMembers(roomId, [targetUserId]);
      }
      setActiveMenu(null);
      await fetchInfo();
    } catch (error) {
      alert(`Action ${action} failed`);
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  const isAdmin = roomInfo?.isGroup && roomInfo.activeMembers.find((m) => m.isMe && m.role === "admin");

  return (
    <>
      <div>
        {/* Overlay */}
        <div className="fixed inset-0 bg-black/5 z-40" onClick={onClose} />

        {/* Drawer */}
        <div
          className={`fixed top-0 right-0 h-full w-80 bg-white z-50 shadow-xl transform transition-transform duration-300 ease-in-out ${
            isOpen ? "translate-x-0" : "translate-x-full"
          } flex flex-col`}
        >
          {/* Header */}
          <div className="px-6 py-5 flex items-center justify-between border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-900">Room Info</h3>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={16} className="text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading && !roomInfo ? (
              <div className="p-8 text-center text-sm text-gray-400">
                Loading...
              </div>
            ) : roomInfo ? (
              <div className="flex flex-col">
                {/* Profile Section */}
                <div className="px-6 py-8 flex flex-col items-center border-b border-gray-100">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xl font-medium mb-3">
                    {roomInfo.roomName?.substring(0, 2).toUpperCase()}
                  </div>
                  <h2 className="text-base font-medium text-gray-900 text-center">
                    {roomInfo.roomName}
                  </h2>
                  {!roomInfo.isGroup && roomInfo.activeMembers[0] && (
                    <p className="text-xs text-gray-500 mt-1">
                      {roomInfo.activeMembers.find((m) => !m.isMe)?.email || ""}
                    </p>
                  )}
                </div>

                {/* General Info */}
                <div className="px-6 py-5 space-y-3 border-b border-gray-100">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Calendar size={16} className="text-gray-400" />
                    <span>
                      Created {new Date(roomInfo.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {roomInfo.isGroup && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <User size={16} className="text-gray-400" />
                        <span>{roomInfo.totalMembers} members</span>
                      </div>
                      {isAdmin && (
                        <button 
                          onClick={() => setIsAddModalOpen(true)}
                          className="p-1 hover:bg-gray-100 rounded text-blue-600 transition-colors"
                          title="Add Member"
                        >
                          <UserPlus size={18} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Members List */}
                {roomInfo.isGroup && (
                  <div className="px-6 py-5 border-b border-gray-100">
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
                      Members
                    </h4>
                    <div className="space-y-3">
                      {roomInfo.activeMembers.map((member) => (
                        <div
                          key={member.userId}
                          className="flex items-center gap-3 group relative"
                        >
                          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-sm font-medium">
                            {member.name.substring(0, 1).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 truncate">
                              {member.name}
                              {member.isMe && (
                                <span className="text-gray-500"> (You)</span>
                              )}
                            </p>
                            {member.role === "admin" && (
                              <p className="text-xs text-blue-500 font-medium">
                                Admin
                              </p>
                            )}
                          </div>

                          {/* Member Actions Menu */}
                          {isAdmin && !member.isMe && (
                            <div className="relative">
                              <button
                                onClick={() => setActiveMenu(activeMenu === member.userId ? null : member.userId)}
                                className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
                              >
                                <MoreVertical size={16} />
                              </button>
                              
                              {activeMenu === member.userId && (
                                <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-100 rounded-lg shadow-lg z-60 py-1">
                                  {member.role === "admin" ? (
                                    <button
                                      onClick={() => handleMemberAction("demote", member.userId)}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                                    >
                                      <ShieldAlert size={14} /> Demote to Member
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleMemberAction("promote", member.userId)}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                                    >
                                      <ShieldCheck size={14} /> Promote to Admin
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleMemberAction("remove", member.userId)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                                  >
                                    <UserMinus size={14} /> Remove from Group
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="px-6 py-5 space-y-2">
                  {roomInfo.isGroup && (
                    <button 
                      onClick={handleLeaveGroup}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <LogOut size={16} />
                      <span>Exit Group</span>
                    </button>
                  )}
                  {!roomInfo.isGroup && (
                    <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <LogOut size={16} />
                      <span>Block Contact</span>
                    </button>
                  )}
                  
                  {isAdmin && (
                    <button 
                      onClick={handleDeleteGroup}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                      <span>Delete Group</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-gray-400">
                Not found
              </div>
            )}
          </div>
        </div>
      </div>

      <AddMemberModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        roomId={roomId}
        existingMemberIds={roomInfo?.activeMembers.map(m => m.userId) || []}
        onSuccess={() => {
          fetchInfo();
        }}
      />
    </>
  );
};