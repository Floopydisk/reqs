import { apiClient } from "@/lib/apiClient";
import { CONSTANTS } from "@/lib/constants";
import { Location } from "@/lib/getLocationName";
import { ApiResponse } from "@/types/requisition";

export const locationService = {
  fetchLocations: (): Promise<Location[]> => {
    return apiClient.get<Location[]>(CONSTANTS.LOCATION.API.LOCATIONS);
  },
  createLocation: (body: Location): Promise<Location> => {
    return apiClient.post<Location>(CONSTANTS.LOCATION.API.LOCATIONS, body);
  },
  updateLocation: (body: Location): Promise<Location> => {
    return apiClient.put<Location>(CONSTANTS.LOCATION.API.LOCATION_BY_ID(body._id), body);
  },
  deleteLocation: (locationId: string): Promise<ApiResponse<Location>> => {
    return apiClient.delete<ApiResponse<Location>>(CONSTANTS.LOCATION.API.LOCATION_BY_ID(locationId));
  }
}
