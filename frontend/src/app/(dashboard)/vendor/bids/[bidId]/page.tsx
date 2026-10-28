"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import ViewEditRequest from "@/components/Requests/ViewEditRequest/ViewEditRequest";

export default function UserViewEditRequest() {
  const params = useParams<{ bidId: string }>();
  const searchParams = useSearchParams();
  const bidId = params?.bidId ?? "";

  const [isEditMode, setIsEditMode] = useState(
    searchParams?.get("mode") === "edit"
  );

  return (
    <ViewEditRequest
      requisitionId={bidId as string}
      userType="vendor"
      isEditMode={isEditMode}
      onEditModeChange={setIsEditMode}
    />
  );
}
