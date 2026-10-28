import { AlertTriangle, Clock, Zap } from "lucide-react";
import React from "react";

export interface UrgencyFormatResult {
  text: string;
  color: string;
  icon: React.ReactNode;
}

export function formatUrgencyText(
  urgency: string | number | undefined | null
): UrgencyFormatResult {
  if (urgency === undefined || urgency === null) {
    return { text: "Unknown", color: "text-gray-500", icon: <Clock className="w-4 h-4" /> };
  }
  const urgencyValue =
    typeof urgency === "number" ? urgency : urgency.toLowerCase();

  switch (urgencyValue) {
    case 0:
    case "low":
      return {
        text: "Low",
        color: "text-green-600",
        icon: <Clock className="w-4 h-4" />,
      };
    case 1:
    case "medium":
      return {
        text: "Medium",
        color: "text-yellow-600",
        icon: <AlertTriangle className="w-4 h-4" />,
      };
    case 2:
    case "high":
      return {
        text: "High",
        color: "text-red-600",
        icon: <Zap className="w-4 h-4" />,
      };
    default:
      return {
        text: "Unknown",
        color: "text-gray-500",
        icon: <Clock className="w-4 h-4" />,
      };
  }
}

export function UrgencyDisplay({ urgency }: { urgency: string | number | undefined | null }) {
  const { text, color, icon } = formatUrgencyText(urgency);

  return (
    <div className={`flex items-center gap-1 ${color}`}>
      {icon}
      <span>{text}</span>
    </div>
  );
}
