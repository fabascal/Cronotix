import { apiClient } from "@/lib/apiClient";

export interface ContactEntryApi {
  id: string;
  listId: string;
  name: string;
  email: string | null;
  phone: string | null;
  telegramId: string | null;
  createdAt: string;
}

export interface ContactListApi {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  entryCount?: number;
  entries?: ContactEntryApi[];
  createdAt: string;
  updatedAt: string;
}

export const contactsApi = {
  list: () =>
    apiClient.get<ContactListApi[]>("/api/v1/contacts").then((r) => r.data),

  get: (id: string) =>
    apiClient.get<ContactListApi>(`/api/v1/contacts/${id}`).then((r) => r.data),

  create: (data: { name: string; description?: string }) =>
    apiClient.post<ContactListApi>("/api/v1/contacts", data).then((r) => r.data),

  update: (id: string, data: { name?: string; description?: string }) =>
    apiClient.patch<ContactListApi>(`/api/v1/contacts/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete(`/api/v1/contacts/${id}`),

  addEntry: (listId: string, data: { name: string; email?: string; phone?: string; telegramId?: string }) =>
    apiClient.post<ContactEntryApi>(`/api/v1/contacts/${listId}/entries`, data).then((r) => r.data),

  removeEntry: (listId: string, entryId: string) =>
    apiClient.delete(`/api/v1/contacts/${listId}/entries/${entryId}`),

  importCsv: (listId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient
      .post<{ imported: number }>(`/api/v1/contacts/${listId}/import`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
};
