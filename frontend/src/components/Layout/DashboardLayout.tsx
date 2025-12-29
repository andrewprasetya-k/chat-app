import React, { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Container for the entire dashboard */}
      <div className="flex w-full h-full max-w-480 mx-auto bg-white shadow-xl overflow-hidden relative">
        {children}
      </div>
    </div>
  );
};
