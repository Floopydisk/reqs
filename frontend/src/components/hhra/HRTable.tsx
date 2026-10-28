import Link from "next/link";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

const HRTable = () => {
  const tableItems = [
    {
      id: "1",
      ItemDesc: "Laptop XPS 13",
      qty: 12,
      uom: "pcs",
      date: "08-May-2025",
      brand: "Dell",
      price: 100000,
      status: "Completed",
      document: null, 
    },
    {
      id: "2",
      ItemDesc: "Office Chair",
      qty: 20,
      uom: "pcs",
      date: "12-May-2025",
      brand: "Ikea",
      price: 45000,
      status: "Closed",
      document: null,
    },
    {
      id: "3",
      ItemDesc: "Projector",
      qty: 5,
      uom: "pcs",
      date: "15-May-2025",
      brand: "Epson",
      price: 120000,
      status: "Pending",
      document: null,
    },
    {
      id: "4",
      ItemDesc: "Printer Toner",
      qty: 30,
      uom: "packs",
      date: "18-May-2025",
      brand: "HP",
      price: 15000,
      status: "Rejected",
      document: null,
    },
    {
      id: "5",
      ItemDesc: "Conference Table",
      qty: 2,
      uom: "pcs",
      date: "20-May-2025",
      brand: "Lagos Furnitures",
      price: 200000,
      status: "Pending",
      document: null,
    },
    {
      id: "6",
      ItemDesc: "External Hard Drive",
      qty: 15,
      uom: "pcs",
      date: "23-May-2025",
      brand: "Seagate",
      price: 25000,
      status: "Closed",
      document: null,
    },
    {
      id: "7",
      ItemDesc: "Air Conditioner",
      qty: 4,
      uom: "units",
      date: "26-May-2025",
      brand: "Samsung",
      price: 180000,
      status: "Rejected",
      document: null,
    },
    {
      id: "8",
      ItemDesc: "Desk Lamp",
      qty: 50,
      uom: "pcs",
      date: "29-May-2025",
      brand: "Philips",
      price: 8000,
      status: "Completed",
      document: null,
    },
  ];
  return (
    <>
      <div className="w-full overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead>Item Description</TableHead>
              <TableHead>QTY</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white">
            {tableItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.ItemDesc}</TableCell>
                <TableCell>{item.qty}</TableCell>
                <TableCell>{item.date}</TableCell>
                <TableCell>{item.brand}</TableCell>
                <TableCell>{item.price}</TableCell>
                <TableCell className={
                  item.status === "Completed" ? "text-[#26850B]" : item.status === "Pending" ? "text-[#F6B40E]" : item.status === "Rejected" ? "text-[#ED3237]" : "text-[#000]"
                }>{item.status}</TableCell>
                <TableCell>
                <Link href={
                 item.status === "Completed" ? "/hhra/request?view=completed" : item.status === "Pending" ? "/hhra/request?view=new" : item.status === "Closed" ? "/hhra/request?view=closed" : "/hhra/request?view=rejected"
                }>
                <Button className="bg-[#0F1E7A] text-white cursor-pointer capitalize">
                  View  
                </Button>
                </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default HRTable;
