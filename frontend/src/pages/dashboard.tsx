import Head from "next/head";
import { DashboardLayout } from "../components/Layout/DashboardLayout";
import { Sidebar } from "../components/Chat/Sidebar";
import { ChatWindow } from "../components/Chat/ChatWindow";

import { useState, useEffect, useRef } from "react";
import { chatService } from "@/services/features/chat.service";
import { ChatRoom } from "@/services/types";

import { socketClient } from "@/services/api/socket.client";
import { authService } from "@/services/features/auth.service";

export default function DashboardPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [isMeMyId, setIsMyId] = useState<string>("");

  // Refs untuk mengatasi stale closure di dalam socket listeners
  const activeRoomRef = useRef<ChatRoom | null>(null);
  const myIdRef = useRef<string>("");
  const roomsRef = useRef<ChatRoom[]>(rooms);

  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

  useEffect(() => {
    myIdRef.current = isMeMyId;
  }, [isMeMyId]);

  // Anticipate browser sleep mode & keep connection alive
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Bangunkan socket jika terputus saat tab tidak aktif
        console.log("Tab is visible, ensuring socket connection...");
        socketClient.connect();
      }
      // Kita tidak memanggil disconnect() saat hidden agar pesan tetap bisa masuk 
      // di background selama diizinkan oleh browser.
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Connect to web socket & Listeners
  useEffect(() => {
    socketClient.connect();
    socketClient.on("connect", () => {
      console.log("Reconnected with socket ID, rejoining rooms...");
      roomsRef.current.forEach((room) => {
        socketClient.emit("join_room", room.roomId);
      });
      console.log("Rejoined all rooms after reconnecting: ", roomsRef.current);
    });

    // Handler: User Online
    const handleUserOnline = (data: { userId: string }) => {
      setOnlineUsers((prev) => new Set(prev).add(data.userId));
      setRooms((prevRooms) =>
        prevRooms.map((room) =>
          room.otherUserId === data.userId ? { ...room, isOnline: true } : room
        )
      );
    };

    // Handler: User Offline
    const handleUserOffline = (data: { userId: string; lastSeen: string }) => {
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        updated.delete(data.userId);
        return updated;
      });

      setRooms((prevRooms) =>
        prevRooms.map((room) =>
          room.otherUserId === data.userId
            ? { ...room, isOnline: false, lastSeen: data.lastSeen }
            : room
        )
      );
    };

    const handleNewRoom = (newRoom: ChatRoom) => {
      // Cek jika room sudah ada
      setRooms((prevRooms) => {
        if (prevRooms.find((room) => room.roomId === newRoom.roomId)) {
          return prevRooms;
        }
        // Tambah room baru di paling atas
        return [newRoom, ...prevRooms];
      });
      // Otomatis join room baru
      socketClient.emit("join_room", newRoom.roomId);
    };

    socketClient.on("new_room_created", handleNewRoom);

    // Handler: New Message (Update Sidebar & Unread Count)
    const handleNewMessageSidebar = (msg: any) => {
      setRooms((prevRooms) => {
        const updatedRooms = prevRooms.map((room) => {
          if (room.roomId === msg.roomId) {
            // Gunakan Ref untuk data terbaru
            const isCurrentActiveRoom =
              activeRoomRef.current?.roomId === room.roomId;
            const isSenderMe = msg.sender?.senderId === myIdRef.current;

            let newCount = room.unreadCount || 0;
            // Tambah unread count jika: BUKAN room aktif DAN BUKAN saya pengirimnya
            if (!isCurrentActiveRoom && !isSenderMe) {
              newCount += 1;
            }

            return {
              ...room,
              lastMessage: msg.text,
              lastMessageTime: msg.createdAt,
              senderName: msg.sender?.senderName || null,
              isLastMessageRead: false,
              unreadCount: newCount,
            };
          }
          return room;
        });

        // Sort ulang: Room dengan pesan terbaru naik ke paling atas
        return [...updatedRooms].sort((a, b) => {
          const timeA = a.lastMessageTime
            ? new Date(a.lastMessageTime).getTime()
            : 0;
          const timeB = b.lastMessageTime
            ? new Date(b.lastMessageTime).getTime()
            : 0;
          return timeB - timeA;
        });
      });
    };

    // Handler: Read Receipt (Reset Unread Count)
    const handleReadMessage = (data: { roomId: string; readerId: string }) => {
      // Jika SAYA yang membaca, reset count jadi 0
      if (data.readerId === myIdRef.current) {
        setRooms((prevRooms) =>
          prevRooms.map((room) => {
            if (room.roomId === data.roomId) {
              return {
                ...room,
                unreadCount: 0,
              };
            }
            return room;
          })
        );
      }
    };

    // Handler: Unsend Message Sidebar
    const handleUnsentMessageSidebar = (data: {
      roomId: string;
      messageId: string;
    }) => {
      setRooms((prevRooms) =>
        prevRooms.map((room) => {
          if (room.roomId === data.roomId) {
            return {
              ...room,
              lastMessage: "This message was unsent",
            };
          }
          return room;
        })
      );
    };

    // Register Listeners
    socketClient.on("new_message", handleNewMessageSidebar);
    socketClient.on("message_unsent", handleUnsentMessageSidebar);
    socketClient.on("messages_read_update", handleReadMessage);
    socketClient.on("user_online", handleUserOnline);
    socketClient.on("user_offline", handleUserOffline);

    // Cleanup
    return () => {
      socketClient.off("new_room_created", handleNewRoom);
      socketClient.off("connect");
      socketClient.off("new_message", handleNewMessageSidebar);
      socketClient.off("message_unsent", handleUnsentMessageSidebar);
      socketClient.off("messages_read_update", handleReadMessage);
      socketClient.off("user_online", handleUserOnline);
      socketClient.off("user_offline", handleUserOffline);
      socketClient.disconnect();
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
        //mengisi
        setOnlineUsers((prevOnline) => {
          const initialOnline = new Set<string>();
          activeRoom.forEach((room) => {
            if (room.isOnline && room.otherUserId) {
              initialOnline.add(room.otherUserId);
            }
          });
          return initialOnline;
        });
      } catch (error: any) {
        console.error("Failed to fetch chat rooms:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, []);

  //fetch profile untuk mengetahui apakah itu saya
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user: any = await authService.getProfile();
        const myId = Array.isArray(user) ? user[0]?.id : user?.id;
        if (myId) {
          setIsMyId(myId);
        }
      } catch (error) {
        console.error("Failed to fetch profile in dashboard:", error);
      }
    };

    fetchProfile();
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
        onlineUsers={onlineUsers}
      />

      {/* Main Chat Window - Right Section */}
      <ChatWindow activeRoom={activeRoom} onlineUsers={onlineUsers} />
    </DashboardLayout>
  );
}
