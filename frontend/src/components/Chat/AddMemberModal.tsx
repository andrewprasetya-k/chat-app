import React, { useState, useEffect } from "react";
import { X, Search, UserPlus, Loader2 } from "lucide-react";
import { chatService } from "@/services/features/chat.service";
import { User } from "@/services/types";

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  existingMemberIds: string[];
  onSuccess: () => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  roomId,
  existingMemberIds,
  onSuccess,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingIds, setAddingIds] = useState<string[]>([]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setLoading(true);
        try {
          const users = await chatService.globalSearchUser(searchQuery);
          // Filter out users who are already members
          const filteredUsers = users.filter(u => !existingMemberIds.includes(u.id));
          setSearchResults(filteredUsers);
        } catch (error) {
          // console.error("Search failed:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, existingMemberIds]);

  const handleAddMember = async (userId: string) => {
    try {
      setAddingIds(prev => [...prev, userId]);
      await chatService.addMembers(roomId, [userId]);
      onSuccess();
      // Remove from results after adding
      setSearchResults(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      alert("Failed to add member");
    } finally {
      setAddingIds(prev => prev.filter(id => id !== userId));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Add Member</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2 min-h-50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <Loader2 className="animate-spin mb-2" size={24} />
              <span className="text-sm">Searching users...</span>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-1">
              {searchResults.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                      {user.fullName.substring(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddMember(user.id)}
                    disabled={addingIds.includes(user.id)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {addingIds.includes(user.id) ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <UserPlus size={18} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : searchQuery.length >= 2 ? (
            <div className="text-center py-8 text-sm text-gray-400">
              No users found
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-gray-400">
              Type at least 2 characters to search
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
