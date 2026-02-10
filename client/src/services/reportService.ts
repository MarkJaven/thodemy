import { apiClient, getApiErrorMessage } from "../lib/apiClient";

const parseFileName = (contentDisposition?: string) => {
  if (!contentDisposition) return null;
  const match = /filename\*?=(?:UTF-8''|\"?)([^\";]+)\"?/i.exec(contentDisposition);
  if (!match || !match[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
};

export const reportService = {
  async downloadUserChecklistCsv(userId?: string): Promise<{ blob: Blob; fileName: string }> {
    try {
      const response = await apiClient.get("/api/admin/reports/user-checklist.csv", {
        params: userId ? { userId } : undefined,
        responseType: "blob",
      });
      const fileName =
        parseFileName(response.headers?.["content-disposition"]) ||
        `user-checklist-${new Date().toISOString().slice(0, 10)}.csv`;
      return { blob: response.data, fileName };
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },
  async downloadUserChecklistXlsx(userId?: string): Promise<{ blob: Blob; fileName: string }> {
    try {
      const response = await apiClient.get("/api/admin/reports/user-checklist.xlsx", {
        params: userId ? { userId } : undefined,
        responseType: "blob",
      });
      const fileName =
        parseFileName(response.headers?.["content-disposition"]) ||
        `user-checklist-${new Date().toISOString().slice(0, 10)}.xlsx`;
      return { blob: response.data, fileName };
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },
};
