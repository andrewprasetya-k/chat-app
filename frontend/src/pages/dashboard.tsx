import Head from "next/head";
import { DashboardLayout } from "../components/Layout/DashboardLayout";
import { Sidebar } from "../components/Chat/Sidebar";
import { ChatWindow } from "../components/Chat/ChatWindow";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <Head>
        <title>Dashboard | ChatApp</title>
      </Head>
      
      {/* Sidebar - Left Section */}
      <Sidebar />

      {/* Main Chat Window - Right Section */}
      <ChatWindow />
    </DashboardLayout>
  );
}
