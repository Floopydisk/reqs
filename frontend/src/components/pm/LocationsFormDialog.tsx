import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import React, { ReactNode, useState } from "react";
import { Location } from "@/lib/getLocationName";

type LocationsFormDialogProps = {
  children: ReactNode
  handleLocationFormChange: (field: keyof Location, value: string | null) => void,
  currentLocation: Location,
  submit?: (locationId: string) => Promise<void>,
  mode: 'create' | 'edit' | 'view' | 'delete',
  isLocationLoading: boolean,
}


export default function LocationsFormDialog({
  children,
  handleLocationFormChange,
  currentLocation,
  submit,
  mode,
  isLocationLoading
}: LocationsFormDialogProps) {
  const [locationFormDialogOpen, setLocationFormDialogOpen] = useState<boolean>(false);
  let title = '';
  let submitButtonText = '';

  switch (mode) {
    case "create":
      title = 'New'
      submitButtonText = 'Create'
      break;
    case 'edit':
      title = 'Edit'
      submitButtonText = 'Update'
      break;
    case 'view':
      title = 'View'
      break;
    case 'delete':
      title = 'Delete'
      submitButtonText = 'Delete'
      break;
    default:
  }

  return (
    <Dialog open={locationFormDialogOpen} onOpenChange={(open) => {
      setLocationFormDialogOpen(open);
    }}>
      {
        <form>
          <DialogTrigger asChild>
            {children}
          </DialogTrigger>
          <DialogContent
            className="sm:max-w-md max-h-[600px] flex flex-col bg-white items-center overflow-hidden">
            <DialogHeader className="flex justify-center items-center">
              <DialogTitle className="text-2xl">
                {title} Location
              </DialogTitle>
            </DialogHeader>
            {mode === 'delete' ? <span className="flex text-sm pt-2">
              Are you sure you want to delete this location?
            </span> : <fieldset disabled={mode === 'view'}
              className="[&_*]:disabled:opacity-100 flex flex-col w-full max-w-xl space-y-5 overflow-y-auto flex-1 px-1">
              <div className="space-y-2">
                <Label>Name<span className="compulsory-field">*</span></Label>
                <Input
                  className="!p-4 rounded-md border shadow-sm bg-white"
                  value={currentLocation.name}
                  onChange={(e) => handleLocationFormChange("name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  className="!p-4 rounded-md border shadow-sm bg-white"
                  value={currentLocation.address}
                  onChange={(e) => handleLocationFormChange("address", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input
                  className="!p-4 rounded-md border shadow-sm bg-white"
                  value={currentLocation.contactPerson}
                  onChange={(e) => handleLocationFormChange("contactPerson", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone No.</Label>
                <Input
                  className="!p-4 rounded-md border shadow-sm bg-white"
                  type="tel"
                  value={currentLocation.phoneNumber}
                  onChange={(e) => handleLocationFormChange("phoneNumber", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  className="!p-4 rounded-md border shadow-sm bg-white"
                  type="email"
                  value={currentLocation.email}
                  onChange={(e) => handleLocationFormChange("email", e.target.value)}
                />
              </div>
            </fieldset>}
            <DialogFooter className="flex gap-3 mt-4 self-start">
              {mode !== 'view' && (<Button
                onClick={() => {
                  submit?.(currentLocation._id).then(() => {
                    setLocationFormDialogOpen(false);
                  })
                }}
                className="w-full flex-1 bg-[#0F1E7A] hover:bg-[#0b154b] text-white"
                disabled={isLocationLoading}
              >
                {isLocationLoading ? submitButtonText.slice(0, -1) + "ing" : submitButtonText}
              </Button>)}
              <DialogClose asChild>
                <Button
                  type="button"
                  className="w-full flex-1 border border-[#DE1216] text-[#DE1216] hover:bg-red-500 hover:text-white"
                  disabled={isLocationLoading}
                >
                  Cancel
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </form>
      }
    </Dialog>
  );
};
