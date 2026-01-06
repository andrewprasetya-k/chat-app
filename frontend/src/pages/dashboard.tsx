import Head from "next/head";
import { DashboardLayout } from "../components/Layout/DashboardLayout";
import { Sidebar } from "../components/Chat/Sidebar";
import { ChatWindow } from "../components/Chat/ChatWindow";

import { useState, useEffect } from "react";
import { chatService } from "@/services/features/chat.service";
import { ChatRoom } from "@/services/types";

export default function DashboardPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch active chat rooms on component mount
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const activeRoom = await chatService.getActiveRooms();
        setRooms(activeRoom);
        if (activeRoom.length > 0) {
          setActiveRoom(activeRoom[0]);
        }
      } catch (error: any) {
        console.error("Failed to fetch chat rooms:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, []);

  return (
    <DashboardLayout>
      <Head>
        <title>ChatApp</title>
      </Head>

      {/* Sidebar - Left Section */}
      <Sidebar
        rooms={rooms}
        selectedRoomId={activeRoom?.roomId}
        onSelectRoom={(roomId) => {
          const selectedRoomId = rooms.find((room) => room.roomId === roomId);
          if (selectedRoomId) {
            setActiveRoom(selectedRoomId);
          }
        }}
      />

      {/* Main Chat Window - Right Section */}
      <ChatWindow activeRoom={activeRoom} />
    </DashboardLayout>
  );
}
