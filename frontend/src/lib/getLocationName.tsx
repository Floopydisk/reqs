export type Location = {
  _id: string;
  name: string
  address: string
  contactPerson: string
  phoneNumber: string
  email: string
}

const getLocationName = (
  location: string | { _id: string; name: string },
  locations: Location[] = []
) => {
  if (typeof location === "object" && location !== null) {
    return location.name.charAt(0).toUpperCase() + location.name.slice(1);
  }
  if (typeof location === "string") {
    const foundLocation = locations.find((loc) => loc._id === location);
    if (foundLocation) {
      return (
        foundLocation.name.charAt(0).toUpperCase() + foundLocation.name.slice(1)
      );
    }
  }
  return "N/A";
};

export default getLocationName;
