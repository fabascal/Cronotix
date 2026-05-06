import { apiClient } from "@/lib/apiClient";

const base = (agentId: string) => `/api/v1/agents/${agentId}/schedules`;

export interface AgentScheduleApi {
  id: string;
  agentId: string;
  tenantId: string;
  name: string;
  description: string | null;
  functionId: string | null;
  function: { id: string; name: string; description: string | null } | null;
  staticParams: Record<string, unknown>;
  processingPrompt?: string | null;
  recurrenceType: "interval" | "daily" | "weekly" | "monthly" | "once";
  recurrenceConfig: Record<string, unknown>;
  cronExpression: string | null;
  deliveryType: "none" | "email" | "whatsapp" | "telegram";
  contactListId: string | null;
  contactList: { id: string; name: string } | null;
  smtpConfigId: string | null;
  smtpConfig: { id: string; name: string } | null;
  whatsappConfigId: string | null;
  whatsappConfig: { id: string; name: string } | null;
  telegramConfigId: string | null;
  telegramConfig: { id: string; name: string; botUsername: string | null } | null;
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleExecutionApi {
  id: string;
  scheduleId: string;
  executedAt: string;
  status: "success" | "failed" | "pending";
  functionRequest: Record<string, unknown> | null;
  functionResponse: Record<string, unknown> | null;
  deliveryStatus: "sent" | "failed" | "skipped";
  errorMessage: string | null;
}

export interface CreateSchedulePayload {
  name: string;
  description?: string;
  functionId: string;
  staticParams?: Record<string, unknown>;
  processingPrompt?: string | null;
  recurrenceType: "interval" | "daily" | "weekly" | "monthly" | "once";
  recurrenceConfig: Record<string, unknown>;
  deliveryType?: "none" | "email" | "whatsapp" | "telegram";
  contactListId?: string;
  smtpConfigId?: string;
  whatsappConfigId?: string;
  telegramConfigId?: string;
  isActive?: boolean;
}

export type UpdateSchedulePayload = Partial<CreateSchedulePayload>;

export const schedulesApi = {
  list: (agentId: string) =>
    apiClient.get<AgentScheduleApi[]>(base(agentId)).then((r) => r.data),

  get: (agentId: string, id: string) =>
    apiClient.get<AgentScheduleApi>(`${base(agentId)}/${id}`).then((r) => r.data),

  create: (agentId: string, data: CreateSchedulePayload) =>
    apiClient.post<AgentScheduleApi>(base(agentId), data).then((r) => r.data),

  update: (agentId: string, id: string, data: UpdateSchedulePayload) =>
    apiClient.patch<AgentScheduleApi>(`${base(agentId)}/${id}`, data).then((r) => r.data),

  remove: (agentId: string, id: string) =>
    apiClient.delete(`${base(agentId)}/${id}`),

  toggle: (agentId: string, id: string) =>
    apiClient.patch<AgentScheduleApi>(`${base(agentId)}/${id}/toggle`).then((r) => r.data),

  executions: (agentId: string, id: string) =>
    apiClient.get<ScheduleExecutionApi[]>(`${base(agentId)}/${id}/executions`).then((r) => r.data),
};
