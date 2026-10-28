import CreateNewRequest from "@/components/Requests/CreateNewRequest/CreateNewRequest";

export default function CreateNewHODRequisitionPage() {
  return (
    <div className="flex flex-col lg:flex-row gap-6 px-4 md:px-6 py-4">
      <CreateNewRequest page="pm" data={[]} />
    </div>
  );
}
