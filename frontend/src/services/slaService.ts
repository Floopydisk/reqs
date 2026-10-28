import { apiClient } from "@/lib/apiClient";

export interface SLA {
  _id?: string;
  id?: string;
  title: string;
  content: string;
  createdById?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const slaService = {
  fetchSLAs: async (): Promise<SLA[]> => {
    const data = await apiClient.get<SLA[] | { success: boolean; data: SLA[] }>("/slas");
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray((data as any).data)) {
      return (data as any).data;
    }
    return [];
  },
  getSLAById: (id: string): Promise<SLA> => {
    return apiClient.get<SLA>(`/slas/${id}`);
  },
  createSLA: (body: { title: string; content: string }): Promise<SLA> => {
    return apiClient.post<SLA>("/slas", body);
  },
  updateSLA: (id: string, body: { title?: string; content?: string }): Promise<SLA> => {
    return apiClient.put<SLA>(`/slas/${id}`, body);
  },
  deleteSLA: (id: string): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/slas/${id}`);
  },
};
