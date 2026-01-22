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
  const [contacts, setContacts] = useState<User[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingIds, setAddingIds] = useState<string[]>([]);

  // 1. Fetch Contacts (People I have chatted with)
  useEffect(() => {
    if (isOpen) {
      const fetchContacts = async () => {
        setLoading(true);
        try {
          const rooms = await chatService.getActiveRooms();
          // Filter: Hanya ambil room personal yang bukan "Me"
          const contactList = rooms
            .filter((room) => !room.isGroup && room.otherUserId && room.roomName !== "Me")
            .map((room) => ({
              id: room.otherUserId as string,
              fullName: room.roomName,
              email: "", // Tidak tersedia di list room, biarkan kosong
            } as User));
          
          setContacts(contactList);
          setFilteredContacts(contactList.filter(c => !existingMemberIds.includes(c.id)));
        } catch (error) {
          // console.error("Failed to fetch contacts", error);
        } finally {
          setLoading(false);
        }
      };
      fetchContacts();
    }
  }, [isOpen]);

  // 2. Local Filtering Logic
  useEffect(() => {
    if (!contacts.length) return;

    let result = contacts;

    // Filter by Search Query
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(user => 
        user.fullName.toLowerCase().includes(lowerQuery)
      );
    }

    // Filter out existing members
    result = result.filter(user => !existingMemberIds.includes(user.id));

    setFilteredContacts(result);
  }, [searchQuery, contacts, existingMemberIds]);

  const handleAddMember = async (userId: string) => {
    try {
      setAddingIds(prev => [...prev, userId]);
      await chatService.addMembers(roomId, [userId]);
      onSuccess();
      // Remove from results locally
      setContacts(prev => prev.filter(c => c.id !== userId));
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
          <h3 className="text-lg font-semibold text-gray-900">Add Member from Contacts</h3>
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
              placeholder="Search contacts..."
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
              <span className="text-sm">Loading contacts...</span>
            </div>
          ) : filteredContacts.length > 0 ? (
            <div className="space-y-1">
              {filteredContacts.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                      {user.fullName.substring(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
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
          ) : (
            <div className="text-center py-8 text-sm text-gray-400">
              {searchQuery ? "No contacts found matching your search" : "No contacts available to add"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};