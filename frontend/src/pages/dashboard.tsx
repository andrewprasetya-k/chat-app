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
  const [roomType, setRoomType] = useState<"active" | "inactive">("active");

  // Refs untuk mengatasi stale closure di dalam socket listeners
  const activeRoomRef = useRef<ChatRoom | null>(null);
  const myIdRef = useRef<string>("");
  const roomsRef = useRef<ChatRoom[]>(rooms);
  const roomTypeRef = useRef<"active" | "inactive">(roomType);

  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

  useEffect(() => {
    myIdRef.current = isMeMyId;
  }, [isMeMyId]);

  useEffect(() => {
    roomTypeRef.current = roomType;
  }, [roomType]);

  // Fetch active or inactive chat rooms
  const fetchRooms = async () => {
    setLoading(true);
    try {
      const data =
        roomType === "active"
          ? await chatService.getActiveRooms()
          : await chatService.getDeactivatedRooms();
      setRooms(data);
      if (data.length > 0 && !activeRoom) {
        setActiveRoom(data[0]);
      }

      if (roomType === "active") {
        setOnlineUsers(() => {
          const initialOnline = new Set<string>();
          data.forEach((room) => {
            if (room.isOnline && room.otherUserId) {
              initialOnline.add(room.otherUserId);
            }
          });
          return initialOnline;
        });
      }
    } catch (error: any) {
      console.error("Failed to fetch chat rooms:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [roomType]);

  // Anticipate browser sleep mode & keep connection alive
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Bangunkan socket jika terputus saat tab tidak aktif
        // console.log("Tab is visible, ensuring socket connection...");
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
      // console.log("Reconnected with socket ID, rejoining rooms...");
      roomsRef.current.forEach((room) => {
        socketClient.emit("join_room", room.roomId);
      });
      // console.log("Rejoined all rooms after reconnecting: ", roomsRef.current);
    });

    // Handler: User Online
    const handleUserOnline = (data: { userId: string }) => {
      setOnlineUsers((prev) => new Set(prev).add(data.userId));
      setRooms((prevRooms) =>
        prevRooms.map((room) =>
          room.otherUserId === data.userId ? { ...room, isOnline: true } : room,
        ),
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
            : room,
        ),
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
        const roomToUpdate = prevRooms.find((r) => r.roomId === msg.roomId);
        if (
          roomToUpdate?.isDeactivated ||
          roomToUpdate?.leaveAt ||
          roomToUpdate?.deletedAt
        )
          return prevRooms;

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
              lastMessageId: msg.textId,
              lastMessage: msg.text,
              lastMessageTime: msg.createdAt,
              senderId: msg.sender?.senderId || null,
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

    // Handler: Read Receipt (Reset Unread Count & Update Status)
    const handleReadMessage = (data: {
      roomId: string;
      readerId: string;
      messageIds: string[];
    }) => {
      setRooms((prevRooms) => {
        const roomToUpdate = prevRooms.find((r) => r.roomId === data.roomId);
        if (
          roomToUpdate?.isDeactivated ||
          roomToUpdate?.leaveAt ||
          roomToUpdate?.deletedAt
        )
          return prevRooms;

        return prevRooms.map((room) => {
          if (room.roomId === data.roomId) {
            const isMeReading = data.readerId === myIdRef.current;

            // Status pesan terakhir hanya berubah jadi READ jika:
            // 1. Yang baca BUKAN saya
            // 2. ID pesan terakhir ada di dalam daftar pesan yang baru dibaca (data.messageIds)
            // 3. ATAU statusnya memang sudah 'Read' sebelumnya (jangan diubah jadi false)

            let shouldMarkAsRead = room.isLastMessageRead;
            // Jika ORANG LAIN yang baca, tandai pesan terakhir SAYA sudah dibaca
            if (
              !isMeReading &&
              room.lastMessageId &&
              data.messageIds?.includes(room.lastMessageId)
            ) {
              shouldMarkAsRead = true;
            }

            return {
              ...room,
              // Jika SAYA yang baca, reset unread count jadi 0
              unreadCount: isMeReading ? 0 : room.unreadCount,
              // Jika ORANG LAIN yang baca, tandai pesan terakhir SAYA sudah dibaca
              isLastMessageRead: shouldMarkAsRead,
            };
          }
          return room;
        });
      });
    };

    // Handler: Unsend Message Sidebar
    const handleUnsentMessageSidebar = (data: {
      roomId: string;
      messageId: string;
    }) => {
      setRooms((prevRooms) => {
        const roomToUpdate = prevRooms.find((r) => r.roomId === data.roomId);
        if (
          roomToUpdate?.isDeactivated ||
          roomToUpdate?.leaveAt ||
          roomToUpdate?.deletedAt
        )
          return prevRooms;

        return prevRooms.map((room) => {
          if (room.roomId === data.roomId) {
            return {
              ...room,
              lastMessage: "This message was unsent",
            };
          }
          return room;
        });
      });
    };

    // Handler: Room Deleted
    const handleRoomDeleted = (data: { roomId: string }) => {
      if (roomTypeRef.current === "active") {
        setRooms((prev) => prev.filter((r) => r.roomId !== data.roomId));
      }
    };

    // Handler: Member Left
    const handleMemberLeft = (data: { roomId: string; userId: string }) => {
      if (data.userId === myIdRef.current && roomTypeRef.current === "active") {
        setRooms((prev) => prev.filter((r) => r.roomId !== data.roomId));
      }
    };

    // Register Listeners
    socketClient.on("new_message", handleNewMessageSidebar);
    socketClient.on("message_unsent", handleUnsentMessageSidebar);
    socketClient.on("messages_read_update", handleReadMessage);
    socketClient.on("user_online", handleUserOnline);
    socketClient.on("user_offline", handleUserOffline);
    socketClient.on("room_deleted", handleRoomDeleted);
    socketClient.on("member_left", handleMemberLeft);

    // Cleanup
    return () => {
      socketClient.off("new_room_created", handleNewRoom);
      socketClient.off("connect");
      socketClient.off("message_unsent", handleUnsentMessageSidebar);
      socketClient.off("messages_read_update", handleReadMessage);
      socketClient.off("user_online", handleUserOnline);
      socketClient.off("user_offline", handleUserOffline);
      socketClient.off("new_message", handleNewMessageSidebar);
      socketClient.off("room_deleted", handleRoomDeleted);
      socketClient.off("member_left", handleMemberLeft);
      socketClient.disconnect();
    };
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
        roomType={roomType}
        onRoomTypeChange={setRoomType}
        onSelectRoom={(roomId) => {
          const selectedRoom = rooms.find((room) => room.roomId === roomId);
          if (selectedRoom) {
            setActiveRoom(selectedRoom);
            // Optimistic Update: Reset unread count immediately
            setRooms((prev) =>
              prev.map((r) =>
                r.roomId === roomId ? { ...r, unreadCount: 0 } : r,
              ),
            );
          }
        }}
        onlineUsers={onlineUsers}
        isLoading={loading}
      />

      {/* Main Chat Window - Right Section */}
      <ChatWindow activeRoom={activeRoom} onlineUsers={onlineUsers} />
    </DashboardLayout>
  );
}
