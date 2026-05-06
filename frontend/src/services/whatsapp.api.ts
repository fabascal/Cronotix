import { apiClient } from "@/lib/apiClient";

export interface WhatsappConfigApi {
  id: string;
  tenantId: string;
  name: string;
  phoneNumberId: string;
  hasToken: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWhatsappPayload {
  name: string;
  phoneNumberId: string;
  accessToken: string;
  isDefault?: boolean;
}

export type UpdateWhatsappPayload = Partial<CreateWhatsappPayload>;

export const whatsappApi = {
  list: () =>
    apiClient.get<WhatsappConfigApi[]>("/api/v1/settings/whatsapp").then((r) => r.data),

  create: (data: CreateWhatsappPayload) =>
    apiClient.post<WhatsappConfigApi>("/api/v1/settings/whatsapp", data).then((r) => r.data),

  update: (id: string, data: UpdateWhatsappPayload) =>
    apiClient.patch<WhatsappConfigApi>(`/api/v1/settings/whatsapp/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete(`/api/v1/settings/whatsapp/${id}`),

  testSend: (id: string, to: string) =>
    apiClient.post<{ success: boolean; message: string }>(`/api/v1/settings/whatsapp/${id}/test-send`, { to }).then((r) => r.data),
};
