import React from "react";
import StatusBadge from "@/components/StatusBadge";

export function formatStatus(status: string): React.ReactNode {
  return <StatusBadge status={status} />;
}
