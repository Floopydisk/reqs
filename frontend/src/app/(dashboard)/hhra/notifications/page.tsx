import NotificationsPage from "@/components/NotificationsPage";
import SuspenseFallback from "@/components/SuspenseFallback";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default function PMNotifications() {
  return (
    <Suspense
      fallback={<SuspenseFallback message="Loading notifications..." />}
    >
      <NotificationsPage />
    </Suspense>
  );
}
