import { apiClient } from "@/lib/apiClient";

export interface WhatsappChannelApi {
  id: string;
  tenantId: string | null;
  name: string;
  whatsappConfigId: string | null;
  whatsappConfig: { id: string; name: string; phoneNumberId: string } | null;
  agentId: string | null;
  agent: { id: string; name: string } | null;
  verifyToken: string;
  whitelistEnabled: boolean;
  whitelistContactListIds: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsappConversationApi {
  id: string;
  channelId: string;
  phone: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  updatedAt: string;
}

export interface CreateWhatsappChannelPayload {
  name: string;
  whatsappConfigId: string;
  agentId: string;
  whitelistEnabled?: boolean;
  whitelistContactListIds?: string[];
  isActive?: boolean;
}

export type UpdateWhatsappChannelPayload = Partial<CreateWhatsappChannelPayload>;

const BASE = "/api/v1/whatsapp/channels";

export const whatsappChannelsApi = {
  list: (agentId?: string) =>
    apiClient
      .get<WhatsappChannelApi[]>(BASE, { params: agentId ? { agentId } : undefined })
      .then((r) => r.data),

  get: (id: string) =>
    apiClient.get<WhatsappChannelApi>(`${BASE}/${id}`).then((r) => r.data),

  create: (data: CreateWhatsappChannelPayload) =>
    apiClient.post<WhatsappChannelApi>(BASE, data).then((r) => r.data),

  update: (id: string, data: UpdateWhatsappChannelPayload) =>
    apiClient.patch<WhatsappChannelApi>(`${BASE}/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete(`${BASE}/${id}`),

  conversations: (id: string) =>
    apiClient.get<WhatsappConversationApi[]>(`${BASE}/${id}/conversations`).then((r) => r.data),

  clearHistory: (id: string, phone: string) =>
    apiClient.delete(`${BASE}/${id}/conversations/${phone}`),
};
