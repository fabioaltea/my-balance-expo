import { HttpHelper } from "./HttpHelper";

export interface ShortcutKeyResponse {
  success: boolean;
  data?: {
    shortcutKey: string | null;
  };
  error?: string;
}

export class ShortcutApiHelper {
  /**
   * Generate a new shortcut key
   */
  static async generateShortcutKey(): Promise<string> {
    try {
      const response = await HttpHelper.post(
        "/shortcut/generate",
        {}
      );

      if (!response.success || !response.data?.shortcutKey) {
        throw new Error(response.error || "Failed to generate shortcut key");
      }

      return response.data.shortcutKey;
    } catch (error: any) {
      console.error("Error generating shortcut key:", error);
      throw error;
    }
  }

  /**
   * Get current shortcut key
   */
  static async getShortcutKey(): Promise<string | null> {
    try {
      const response = await HttpHelper.get(
        "/shortcut/key"
      );

      if (!response.success) {
        throw new Error(response.error || "Failed to get shortcut key");
      }

      return response.data?.shortcutKey || null;
    } catch (error: any) {
      console.error("Error getting shortcut key:", error);
      return null;
    }
  }
}
