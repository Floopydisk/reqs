import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface RequestHeaderProps {
  backPath: string;
  isEditMode: boolean;
  requisitionNumber: string;
}

export default function RequestHeader({
  backPath,
  isEditMode,
  requisitionNumber,
}: RequestHeaderProps) {
  return (
    <>
      <div className="w-full flex items-center mb-12">
        <Link
          href={backPath}
          className="flex items-center gap-2 text-[#0d1b5e] hover:underline border rounded-full p-3"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>

      <h1 className="text-2xl lg:text-3xl font-bold text-[#0F1E7A] mb-6">
        {isEditMode ? "Update Request" : "View Request"} - {requisitionNumber}
      </h1>
    </>
  );
}
