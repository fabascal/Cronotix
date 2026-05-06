import { apiClient } from "@/lib/apiClient";

export interface SmtpConfigApi {
  id: string;
  tenantId: string;
  name: string;
  host: string;
  port: number;
  username: string;
  hasPassword: boolean;
  fromAddress: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSmtpPayload {
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  fromAddress: string;
  isDefault?: boolean;
}

export type UpdateSmtpPayload = Partial<CreateSmtpPayload>;

export const smtpApi = {
  list: () =>
    apiClient.get<SmtpConfigApi[]>("/api/v1/settings/smtp").then((r) => r.data),

  create: (data: CreateSmtpPayload) =>
    apiClient.post<SmtpConfigApi>("/api/v1/settings/smtp", data).then((r) => r.data),

  update: (id: string, data: UpdateSmtpPayload) =>
    apiClient.patch<SmtpConfigApi>(`/api/v1/settings/smtp/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete(`/api/v1/settings/smtp/${id}`),

  test: (id: string) =>
    apiClient.post<{ success: boolean; message: string }>(`/api/v1/settings/smtp/${id}/test`).then((r) => r.data),

  testSend: (id: string, to: string) =>
    apiClient.post<{ success: boolean; message: string }>(`/api/v1/settings/smtp/${id}/test-send`, { to }).then((r) => r.data),
};
