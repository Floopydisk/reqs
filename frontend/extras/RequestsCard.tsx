// import { AlarmClock } from "lucide-react";
// import Image from "next/image";
// import React from "react";
// import { Badge } from "../ui/badge";
// import { Button } from "../ui/button";
// import { Card } from "../ui/card";

// const RequestsCard = () => {
//   return (
//     <>
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//         <Card className="flex flex-row w-full items-center bg-white gap-6 py-6 px-6 shadow-md">
//           <div className="">
//             <Image
//               src="/product.png"
//               alt="product"
//               width={200}
//               height={200}
//               className="object-contain items-center"
//             />
//           </div>
//           <div className="flex flex-col gap-1">
//             <p className="text-base text-[#0F1E7A] font-medium">Alienware</p>
//             <p className="text-sm text-[#0F1E7A] font-thin">
//               Alienware Aurora R12 RTX{" "}
//             </p>
//             <p className="text-sm text-[#0F1E7A] font-medium">20 Units</p>
//             <div className="flex items-center gap-2">
//               <div className="w-[10px] h-[10px] rounded-full bg-[#F6B40E]" />
//               <p className="text-base text-[#0F1E7A] font-medium">
//                 Active Bids
//               </p>
//             </div>
//             <div className="flex items-center gap-2">
//               <Badge className="bg-[#0F1E7A80] text-white">IT Dept</Badge>
//               <Badge className="bg-[#0F1E7A80] text-white">General</Badge>
//             </div>
//             <div className="flex items-center gap-3 my-2">
//               <AlarmClock color="#0F1E7A" />
//               <p className="text-base text-[#0F1E7A] font-normal">Ending in <span className="font-semibold">10</span> days</p>
//             </div>
//             <Button className="bg-white border border-[#0F1E7A] text-lg text-[#0F1E7A] font-medium">Place Bid</Button>
//           </div>
//         </Card>
//         <Card className="flex flex-row w-full items-center bg-white gap-6 py-6 px-6 shadow-md">
//           <div className="">
//             <Image
//               src="/product.png"
//               alt="product"
//               width={200}
//               height={200}
//               className="object-contain items-center"
//             />
//           </div>
//           <div className="flex flex-col gap-1">
//             <p className="text-base text-[#0F1E7A] font-medium">Alienware</p>
//             <p className="text-sm text-[#0F1E7A] font-thin">
//               Alienware Aurora R12 RTX{" "}
//             </p>
//             <p className="text-sm text-[#0F1E7A] font-medium">20 Units</p>
//             <div className="flex items-center gap-2">
//               <div className="w-[10px] h-[10px] rounded-full bg-[#F6B40E]" />
//               <p className="text-base text-[#0F1E7A] font-medium">
//                 Active Bids
//               </p>
//             </div>
//             <div className="flex items-center gap-2">
//               <Badge className="bg-[#0F1E7A80] text-white">IT Dept</Badge>
//               <Badge className="bg-[#0F1E7A80] text-white">General</Badge>
//             </div>
//             <div className="flex items-center gap-3 my-2">
//               <AlarmClock color="#0F1E7A" />
//               <p className="text-base text-[#0F1E7A] font-normal">Ended Already!</p>
//             </div>
//             <p className="text-base text-[#0F1E7A] font-semibold">Bid Completed</p>
//           </div>
//         </Card>
//       </div>
//     </>
//   );
// };

// export default RequestsCard;

"use client";

import React, { useState } from "react";
import { AlarmClock, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { VendorRequestData } from "@/data/mock/tableData";

// Mock Badge component
const Badge = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <span
    className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium ${className}`}
  >
    {children}
  </span>
);

// Mock Button component
const Button = ({
  className,
  children,
  ...props
}: {
  className?: string;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    className={`px-4 py-2 rounded-md transition-colors ${className}`}
    {...props}
  >
    {children}
  </button>
);

// Mock Card component
const Card = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => <div className={`rounded-lg ${className}`}>{children}</div>;

interface RequestsCardProps {
  data: VendorRequestData[];
}

const RequestsCard: React.FC<RequestsCardProps> = ({ data }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;
  const totalPages = Math.ceil(data.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  const renderPaginationButtons = () => {
    const buttons = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        buttons.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) {
          buttons.push(i);
        }
        buttons.push("...");
        buttons.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        buttons.push(1);
        buttons.push("...");
        for (let i = totalPages - 4; i <= totalPages; i++) {
          buttons.push(i);
        }
      } else {
        buttons.push(1);
        buttons.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          buttons.push(i);
        }
        buttons.push("...");
        buttons.push(totalPages);
      }
    }

    return buttons;
  };

  return (
    <div className="w-full mx-auto p-4 sm:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-8">
        {currentData.map((item) => (
          <Card
            key={item.id}
            className="flex flex-col sm:flex-row w-full items-start sm:items-center bg-white gap-4 sm:gap-6 p-4 sm:py-6 sm:px-6 shadow-md"
          >
            <div className="flex-shrink-0 w-full sm:w-auto flex justify-center sm:justify-start">
              <div className="w-[150px] h-[150px] sm:w-[180px] sm:h-[180px] lg:w-[200px] lg:h-[200px] bg-gray-100 rounded-lg relative">
                <Image
                  fill
                  alt="product"
                  src="/product.png"
                  className="object-contain"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:gap-1 flex-1 w-full">
              <p className="text-base sm:text-base text-[#0F1E7A] font-medium">
                {item.name}
              </p>
              <p className="text-sm text-[#0F1E7A] font-thin">{item.model}</p>
              <p className="text-sm text-[#0F1E7A] font-medium">
                {item.units} Units
              </p>
              <div className="flex items-center gap-2">
                <div
                  className="w-[10px] h-[10px] rounded-full"
                  style={{ backgroundColor: item.statusColor }}
                />
                <p className="text-sm sm:text-base text-[#0F1E7A] font-medium">
                  {item.statusLabel}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {item.departments.map((dept, idx) => (
                  <Badge key={idx} className="bg-[#0F1E7A80] text-white text-xs">
                    {dept}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-2 sm:gap-3 my-2">
                <AlarmClock color="#0F1E7A" size={16} className="sm:w-5 sm:h-5" />
                <p className="text-sm sm:text-base text-[#0F1E7A] font-normal">
                  {item.timeText.includes("Ending in") ? (
                    <>
                      Ending in{" "}
                      <span className="font-semibold">
                        {item.timeText.match(/\d+/)?.[0] || "0"}
                      </span>{" "}
                      days
                    </>
                  ) : (
                    item.timeText
                  )}
                </p>
              </div>
              {item.status === "active" ? (
                <Button className="bg-white border border-[#0F1E7A] text-sm sm:text-lg text-[#0F1E7A] font-medium hover:bg-[#0F1E7A] hover:text-white w-full sm:w-auto">
                  {item.actionText}
                </Button>
              ) : (
                <p className="text-sm sm:text-base text-[#0F1E7A] font-semibold">
                  {item.actionText}
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center sm:justify-end items-center gap-1 flex-wrap">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex items-center gap-1 max-w-full overflow-x-auto">
          {renderPaginationButtons().map((page, idx) => (
            <React.Fragment key={idx}>
              {page === "..." ? (
                <span className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-gray-500 text-sm">
                  ...
                </span>
              ) : (
                <button
                  onClick={() => typeof page === "number" && setCurrentPage(page)}
                  className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded border text-xs sm:text-sm font-medium transition-colors ${
                    currentPage === page
                      ? "bg-[#0F1E7A] text-white border-[#0F1E7A]"
                      : "border-gray-300 hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  {page}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>

        <button
          onClick={() =>
            setCurrentPage((prev) => Math.min(totalPages, prev + 1))
          }
          disabled={currentPage === totalPages}
          className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default RequestsCard;
