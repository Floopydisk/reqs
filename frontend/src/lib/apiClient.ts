import {API_BASE_URL} from "@/lib/config";
import {getToken} from "@/lib/auth";

// Generic request handler
const request = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(getToken() ? {"Authorization": `Bearer ${getToken()}`} : {}), // Add authorization header if token exists
            ...(options.headers || {}), // Include additional custom headers
        }
    };

    try {
        const response = await fetch(url, config);

        // Global error handling can be done here
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData || `HTTP Error: ${response.status}`);
        }

        return await response.json();

    } catch (error) {
        console.error(error);
        throw error;
    }
}

// Basic request wrappers
export const apiClient = {
    get: <T>(url: string, options?: RequestInit): Promise<T> => {
        return request<T>(url, {
            ...options,
            method: "GET"
        });
    },
    post: <T>(url: string, body?: unknown, options?: RequestInit): Promise<T> => {
        return request<T>(url, {
            ...options,
            method: "POST",
            body: body ? JSON.stringify(body) : undefined
        });
    },
    put: <T>(url: string, body?: unknown, options?: RequestInit): Promise<T> => {
        return request<T>(url, {
            ...options,
            method: "PUT",
            body: body ? JSON.stringify(body) : undefined
        });
    },
    patch: <T>(url: string, body?: unknown, options?: RequestInit): Promise<T> => {
        return request<T>(url, {
            ...options,
            method: "PATCH",
            body: body ? JSON.stringify(body) : undefined
        });
    },
    delete: <T>(url: string, options?: RequestInit): Promise<T> => {
        return request<T>(url, {
            ...options,
            method: "DELETE"
        });
    }
}
