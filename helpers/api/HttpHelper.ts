import { User } from "../AuthStorageHelper";

// Get API URL from environment or use default
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080";

console.log("🌐 API_URL configured as:", API_URL);

export interface HttpResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
}

export class HttpHelper {
  public static endpointUri = API_URL;

  // Generic GET method with authentication
  static async get(endpoint: string, options: any = {}): Promise<HttpResponse> {
    try {
      const url = `${this.endpointUri}${endpoint}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || `GET request failed: ${response.statusText}`
        );
      }

      return { success: true, data: result.data };
    } catch (error) {
      console.error("GET request error:", error);
      throw error;
    }
  }

  // Generic POST method with authentication
  static async post(
    endpoint: string,
    data: any,
    options: any = {}
  ): Promise<HttpResponse> {
    try {
      const url = `${this.endpointUri}${endpoint}`;
      console.log("POST request to:", url, "with data:", data);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        body: JSON.stringify(data),
      });

      console.log(
        "POST response status:",
        response.status,
        response.statusText
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("POST error response:", errorText);
        throw new Error(
          `POST request failed: ${response.status} ${
            response.statusText
          } - ${errorText.substring(0, 200)}`
        );
      }

      const responseText = await response.text();
      try {
        const result = JSON.parse(responseText);
        return { success: true, data: result.data };
      } catch (jsonError) {
        console.error("POST JSON parse error:", responseText);
        throw new Error(
          `Invalid JSON response: ${responseText.substring(0, 100)}`
        );
      }
    } catch (error) {
      console.error("POST request error:", error);
      throw error;
    }
  }

  // Generic PUT method with authentication
  static async put(
    endpoint: string,
    data: any,
    options: any = {}
  ): Promise<HttpResponse> {
    try {
      const url = `${this.endpointUri}${endpoint}`;
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || `PUT request failed: ${response.statusText}`
        );
      }

      return { success: true, data: result.data };
    } catch (error) {
      console.error("PUT request error:", error);
      throw error;
    }
  }

  // Generic DELETE method with authentication
  static async delete(
    endpoint: string,
    options: any = {}
  ): Promise<HttpResponse> {
    try {
      const url = `${this.endpointUri}${endpoint}`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || `DELETE request failed: ${response.statusText}`
        );
      }

      return { success: true, data: result.data };
    } catch (error) {
      console.error("DELETE request error:", error);
      throw error;
    }
  }
}
