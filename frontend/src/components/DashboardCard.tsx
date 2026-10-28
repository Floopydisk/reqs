import React from "react";

interface DashboardCardProps {
  children: React.ReactNode;
}

export default function DashboardCard({ children }: DashboardCardProps) {
  return (
    <div className="w-auto h-[115px] lg:h-[150px] bg-white flex items-center justify-center rounded-lg shadow-md">
      {children}
    </div>
  );
}
