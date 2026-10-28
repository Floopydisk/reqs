"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import ViewEditRequest from "@/components/Requests/ViewEditRequest/ViewEditRequest";

export default function UserViewEditRequest() {
  const params = useParams<{ requisitionId: string }>();
  const searchParams = useSearchParams();
  const requisitionId = params?.requisitionId ?? "";

  const [isEditMode, setIsEditMode] = useState(
    searchParams?.get("mode") === "edit"
  );

  return (
    <ViewEditRequest
      requisitionId={requisitionId as string}
      userType="user"
      isEditMode={isEditMode}
      onEditModeChange={setIsEditMode}
    />
  );
}
