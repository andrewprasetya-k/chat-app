import Head from "next/head";
import { DashboardLayout } from "../components/Layout/DashboardLayout";
import { Sidebar } from "../components/Chat/Sidebar";
import { ChatWindow } from "../components/Chat/ChatWindow";

import { useState, useEffect } from "react";
import { chatService } from "@/services/features/chat.service";
import { ChatRoom } from "@/services/types";

export default function DashboardPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<ChatRoom | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch active chat rooms on component mount
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const activeRooms = await chatService.getActiveRooms();
        setRooms(activeRooms);
        if (activeRooms.length > 0) {
          setSelectedRoomId(activeRooms[0]);
        }
      } catch (error) {
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
      <Sidebar />

      {/* Main Chat Window - Right Section */}
      <ChatWindow />
    </DashboardLayout>
  );
}
