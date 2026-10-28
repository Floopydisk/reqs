import { FilePen, CircleCheck, ShieldBan, CircleX, CircleStop } from "lucide-react";
import React from "react";
import { Card } from "../ui/card";

const CardContent = () => {
  const cardItems = [
    {
      icon: FilePen,
      title: "Current Bids",
      no: 8,
      color: "#0F1E7A"
    },
    {
      icon: CircleCheck,
      title: "Active Bids",
      no: 8,
      color: "#26850B"
    },
    {
      icon: ShieldBan,
      title: "Pending Bids",
      no: 8,
      color: "#F59313"
    },
    {
      icon: CircleX,
      title: "Rejected Bids",
      no: 8,
      color: "#DC3545"
    },
    {
        icon: CircleStop,
        title: "Closed Bids",
        no: 8,
        color: "#767676"
      },
  ]
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-6">
  {cardItems.map((card) => {
    const Icon = card.icon;
    return (
      <Card
        key={card.title}
        className="flex flex-row justify-center items-center gap-3 px-6 py-4 shadow-md"
        style={{ borderLeft: `4px solid ${card.color}` }}
      >
        <div
          className="flex px-2 py-3 justify-center items-center rounded-lg"
          style={{ backgroundColor: card.color }}
        >
          <Icon size={30} color="white" />
        </div>
        <div className="flex flex-col items-center">
          <p className="text-[#0F1E7A] text-3xl font-bold">{card.no}</p>
          <p className="text-[#121212] text-base font-light">{card.title}</p>
        </div>
      </Card>
    );
  })}
</div>

    </>
  );
};

export default CardContent;
