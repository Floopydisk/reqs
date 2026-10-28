"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import ViewEditRequest from "@/components/Requests/ViewEditRequest/ViewEditRequest";

export default function HOFViewEditRequest() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { requisitionId } = params;

  const [isEditMode, setIsEditMode] = useState(
    searchParams.get("mode") === "edit"
  );

  return (
    <ViewEditRequest
      requisitionId={requisitionId as string}
      userType="hof"
      isEditMode={isEditMode}
      onEditModeChange={setIsEditMode}
    />
  );
}
