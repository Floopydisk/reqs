import { ChevronRight } from "lucide-react";

const breadcrumbOptions = ["Requests", "RFQs", "POs"];

export default function RFQBreadcrumb({
  currentStep = 0,
}: {
  currentStep?: number;
}) {
  return (
    <div className="flex items-center gap-4">
      {breadcrumbOptions.map((option, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <p
            className={`${
              index === currentStep
                ? "text-[var(--primary-color)] underline font-bold"
                : "text-gray-600"
            } ${index === 0 ? "cursor-pointer" : ""}`}
          >
            {option}
          </p>
          {index !== breadcrumbOptions.length - 1 && (
            <ChevronRight size={20} className="!text-sm" />
          )}
        </div>
      ))}
    </div>
  );
}
