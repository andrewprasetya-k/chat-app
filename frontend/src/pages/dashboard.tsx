import Head from "next/head";
import { DashboardLayout } from "../components/Layout/DashboardLayout";
import { Sidebar } from "../components/Chat/Sidebar";
import { ChatWindow } from "../components/Chat/ChatWindow";

import { useState, useEffect, use } from "react";
import { chatService } from "@/services/features/chat.service";
import { ChatRoom } from "@/services/types";

import { socketClient } from "@/services/api/socket.client";

export default function DashboardPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  //connect to web socket
  useEffect(() => {
    socketClient.connect();

    // DENGARKAN PESAN BARU UNTUK SIDEBAR (REAL-TIME)
    const handleNewMessageSidebar = (msg: any) => {
      setRooms((prevRooms) => {
        // 1. Update data room yang menerima pesan
        const updatedRooms = prevRooms.map((room) => {
          if (room.roomId === msg.roomId) {
            return {
              ...room,
              lastMessage: msg.text,
              lastMessageTime: msg.createdAt,
              senderName: msg.sender?.senderName || null,
              isLastMessageRead: false,
            };
          }
          return room;
        });

        // 2. Sort ulang: Room dengan pesan terbaru naik ke paling atas
        return [...updatedRooms].sort((a, b) => {
          const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return timeB - timeA;
        });
      });
    };

    socketClient.on("new_message", handleNewMessageSidebar);

    return () => {
      socketClient.off("new_message", handleNewMessageSidebar);
      socketClient.disconnect(); //disconnect ketika pindah halaman
    };
  }, []);

  // Fetch active chat rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const activeRoom = await chatService.getActiveRooms();
        setRooms(activeRoom); //ini ambil semua room yang aktif
        if (activeRoom.length > 0) {
          setActiveRoom(activeRoom[0]); //ini set room pertama sebagai room aktif
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
        selectedRoomId={activeRoom?.roomId} //mengirim roomId yang sedang aktif
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
