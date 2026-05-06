import { apiClient } from "@/lib/apiClient";

export interface TelegramConfigApi {
  id: string;
  tenantId: string | null;
  name: string;
  botUsername: string | null;
  hasToken: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTelegramPayload {
  name: string;
  botToken: string;
  isDefault?: boolean;
}

export type UpdateTelegramPayload = Partial<CreateTelegramPayload>;

export const telegramApi = {
  list: () =>
    apiClient.get<TelegramConfigApi[]>("/api/v1/settings/telegram").then((r) => r.data),

  create: (data: CreateTelegramPayload) =>
    apiClient.post<TelegramConfigApi>("/api/v1/settings/telegram", data).then((r) => r.data),

  update: (id: string, data: UpdateTelegramPayload) =>
    apiClient.patch<TelegramConfigApi>(`/api/v1/settings/telegram/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete(`/api/v1/settings/telegram/${id}`),

  testSend: (id: string, chatId: string) =>
    apiClient
      .post<{ success: boolean; message: string }>(`/api/v1/settings/telegram/${id}/test-send`, { chatId })
      .then((r) => r.data),
};
