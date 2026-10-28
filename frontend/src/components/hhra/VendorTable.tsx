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

const VendorTable = () => {
    const tableItems = [
        {
          id: "1",
          companyName: "Desk Lamp Ltd",
          email: "nancy@gmail.com",
          phoneNumber: "+2348012345678",
          status: "Approved",
        },
        {
          id: "2",
          companyName: "Ikeja Tech Solutions",
          email: "ikejatech@gmail.com",
          phoneNumber: "+2348098765432",
          status: "Pending",
        },
        {
          id: "3",
          companyName: "Bright Office Supplies",
          email: "info@brightoffice.com",
          phoneNumber: "+2348034567890",
          status: "Rejected",
        },
        {
          id: "4",
          companyName: "Global Systems Ltd",
          email: "contact@globalsys.com",
          phoneNumber: "+2348023456789",
          status: "Approved",
        },
        {
          id: "5",
          companyName: "Skyline Furnitures",
          email: "sales@skyline.com",
          phoneNumber: "+2348056789123",
          status: "Pending",
        },
        {
          id: "6",
          companyName: "Techify Innovations",
          email: "hello@techify.io",
          phoneNumber: "+2348076543210",
          status: "Approved",
        },
        {
          id: "7",
          companyName: "Elite Contractors",
          email: "admin@elitecontractors.com",
          phoneNumber: "+2348067891234",
          status: "Rejected",
        },
        {
          id: "8",
          companyName: "Prime Gadgets",
          email: "support@primegadgets.ng",
          phoneNumber: "+2348045678901",
          status: "Pending",
        },
        {
          id: "9",
          companyName: "NextGen Logistics",
          email: "info@nextgenlogistics.com",
          phoneNumber: "+2348091234567",
          status: "Approved",
        },
        {
          id: "10",
          companyName: "Green Energy Co.",
          email: "contact@greenenergy.com",
          phoneNumber: "+2348011122233",
          status: "Rejected",
        },
      ];
      
  return (
    <>
         <div className="w-full overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead>Company Name</TableHead>
              <TableHead>Email Address</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white">
            {tableItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.companyName}</TableCell>
                <TableCell>{item.email}</TableCell>
                <TableCell>{item.phoneNumber}</TableCell>
                <TableCell className={
                  item.status === "Approved" ? "text-[#26850B]" : item.status === "Pending" ? "text-[#F6B40E]" : "text-[#DE1216]"
                }>{item.status}</TableCell>
                <TableCell>
                <Link href={
                  "/hhra/vendor?view=details" 
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
  )
}

export default VendorTable
