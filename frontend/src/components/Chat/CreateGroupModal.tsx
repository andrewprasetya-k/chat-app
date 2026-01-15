import React, { useState } from "react";
import { X, Check } from "lucide-react";
import { User } from "@/services/types";
import { chatService } from "@/services/features/chat.service";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onGroupCreated: (roomId: string) => void;
}

/**
 * CreateGroupModal Component
 * -------------------------
 * Modal modular untuk membuat grup chat baru.
 * Menangani input nama grup dan seleksi anggota.
 */
export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  users,
  onGroupCreated,
}) => {
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  // Toggle seleksi member (Tambah/Hapus dari array)
  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // Kirim data ke API
  const handleCreate = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;
    
    setIsLoading(true);
    try {
      const newRoom = await chatService.createGroupChat(groupName, selectedMembers);
      onGroupCreated(newRoom.roomId);
      
      // Reset & Close
      setGroupName("");
      setSelectedMembers([]);
      onClose();
    } catch (error) {
      // console.error("Failed to create group:", error);
      alert("Failed to create group. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800">New Group</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>
        
        {/* Input Nama Grup */}
        <div className="p-4">
          <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">Group Name</label>
          <input 
            type="text" 
            placeholder="Enter group name..."
            className="w-full p-2.5 bg-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {/* List Pemilihan Anggota */}
        <div className="px-4 pb-2">
          <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">
            Select Members ({selectedMembers.length})
          </label>
          <div className="max-h-60 overflow-y-auto space-y-1 rounded-xl border border-gray-100 p-1">
            {users.map((user) => (
              <div
                key={user.id}
                onClick={() => toggleMember(user.id)}
                className={`px-3 py-2.5 flex items-center gap-3 hover:bg-gray-50 cursor-pointer rounded-lg transition-colors ${
                  selectedMembers.includes(user.id) ? "bg-blue-50" : ""
                }`}
              >
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-xs">
                    {user.fullName[0].toUpperCase()}
                  </div>
                  {selectedMembers.includes(user.id) && (
                    <div className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white animate-in zoom-in duration-200">
                      <Check size={10} className="text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.fullName}</p>
                  <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 flex gap-3">
          <button 
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button 
            disabled={!groupName.trim() || selectedMembers.length === 0 || isLoading}
            onClick={handleCreate}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-blue-500/30 transition-all"
          >
            {isLoading ? "Creating..." : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
};
