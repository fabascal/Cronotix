import { apiClient } from "@/lib/apiClient";

export interface TelegramChannelApi {
  id: string;
  tenantId: string | null;
  name: string;
  telegramConfigId: string | null;
  telegramConfig?: { id: string; name: string; botUsername: string | null } | null;
  agentId: string | null;
  secretToken: string;
  whitelistEnabled: boolean;
  whitelistChatIds: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTelegramChannelPayload {
  name: string;
  telegramConfigId: string;
  agentId: string;
  whitelistEnabled?: boolean;
  whitelistChatIds?: string[];
  isActive?: boolean;
}

export type UpdateTelegramChannelPayload = Partial<CreateTelegramChannelPayload>;

export const telegramChannelsApi = {
  list: (agentId?: string) =>
    apiClient
      .get<TelegramChannelApi[]>("/api/v1/telegram/channels", { params: agentId ? { agentId } : {} })
      .then((r) => r.data),

  get: (id: string) =>
    apiClient.get<TelegramChannelApi>(`/api/v1/telegram/channels/${id}`).then((r) => r.data),

  create: (data: CreateTelegramChannelPayload) =>
    apiClient.post<TelegramChannelApi>("/api/v1/telegram/channels", data).then((r) => r.data),

  update: (id: string, data: UpdateTelegramChannelPayload) =>
    apiClient
      .patch<TelegramChannelApi>(`/api/v1/telegram/channels/${id}`, data)
      .then((r) => r.data),

  remove: (id: string) => apiClient.delete(`/api/v1/telegram/channels/${id}`),

  conversations: (id: string) =>
    apiClient
      .get<{ id: string; chatId: string; updatedAt: string }[]>(
        `/api/v1/telegram/channels/${id}/conversations`,
      )
      .then((r) => r.data),

  clearHistory: (id: string, chatId: string) =>
    apiClient.delete(`/api/v1/telegram/channels/${id}/conversations/${chatId}`),

  registerWebhook: (id: string, baseUrl: string) =>
    apiClient
      .post<{ ok: boolean; webhookUrl: string }>(
        `/api/v1/telegram/channels/${id}/register-webhook`,
        { baseUrl },
      )
      .then((r) => r.data),
};
