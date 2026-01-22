import React, { useState, useEffect } from "react";
import { X, User, Mail, Save, Loader2, Edit2 } from "lucide-react";
import { authService } from "@/services/features/auth.service";
import { User as UserType } from "@/services/types";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType | null;
  onUpdate: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setEmail(user.email);
    }
  }, [user]);

  const handleSave = async () => {
    try {
      setLoading(true);
      await authService.updateProfile(fullName, email);
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      alert("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="text-lg font-semibold text-gray-900">My Profile</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center">
          {/* Avatar Placeholder */}
          <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-3xl font-bold mb-6 ring-4 ring-white shadow-lg">
            {user.fullName.substring(0, 1).toUpperCase()}
          </div>

          <div className="w-full space-y-4">
            {/* Name Field */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={!isEditing}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all ${
                    isEditing 
                      ? "bg-white border-blue-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-400" 
                      : "bg-gray-50 border-transparent text-gray-600 cursor-default"
                  }`}
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isEditing}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all ${
                    isEditing 
                      ? "bg-white border-blue-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-400" 
                      : "bg-gray-50 border-transparent text-gray-600 cursor-default"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 w-full flex gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm shadow-blue-200"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Save Changes
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Edit2 size={16} />
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
