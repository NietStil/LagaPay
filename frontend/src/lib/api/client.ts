import { Platform } from 'react-native';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

let BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:1510';

// Clean trailing slash
if (BASE_URL.endsWith('/')) {
    BASE_URL = BASE_URL.slice(0, -1);
}

// 1. Identify if we are pointing to a local development environment
const IS_LOCAL = BASE_URL.includes('localhost') ||
                 BASE_URL.includes('127.0.0.1') ||
                 BASE_URL.includes('lagapay.test') ||
                 BASE_URL.includes('laga.test') ||
                 BASE_URL.includes('10.0.2.2') ||
                 BASE_URL.includes('172.');

// 2. Define the virtual host header your local Laravel setup expects for the API subdomain
const LOCAL_HOST = BASE_URL.includes('lagapay.test') ? 'api.lagapay.test' : 'api.localhost';

// 3. On Android emulator (not physical device), intercept local domains and route through host bridge (10.0.2.2)
if (Platform.OS === 'android' && !Device.isDevice && IS_LOCAL) {
    BASE_URL = BASE_URL
        .replace('api.lagapay.test', '10.0.2.2')
        .replace('api.localhost', '10.0.2.2')
        .replace('lagapay.test', '10.0.2.2')
        .replace('laga.test', '10.0.2.2')
        .replace('localhost', '10.0.2.2')
        .replace('127.0.0.1', '10.0.2.2');
}

const DOMAIN = new URL(BASE_URL).origin;

// Main (web) domain without the "api." subdomain. The Google OAuth flow must run here,
// because this is where Google's redirect URI is registered and where the session lives.
const WEB_URL = DOMAIN.replace('://api.', '://');
const ASSET_URL = IS_LOCAL ? 'http://lagapay.test:1510' : 'https://lagapay.nl';

export { BASE_URL, DOMAIN, WEB_URL, ASSET_URL, IS_LOCAL };

// Token storage (AsyncStorage works on iOS, Android and web; localStorage alone does nothing on native)
export const tokenStorage = {
    getItem: async (key: string): Promise<string | null> => {
        try {
            return await AsyncStorage.getItem(key);
        } catch {
            return null;
        }
    },
    setItem: async (key: string, value: string): Promise<void> => {
        try {
            await AsyncStorage.setItem(key, value);
        } catch {}
    },
    removeItem: async (key: string): Promise<void> => {
        try {
            await AsyncStorage.removeItem(key);
        } catch {}
    }
};

// Global callback to show maintenance modal
let showMaintenanceModalCallback: ((show: boolean) => void) | null = null;

export const setMaintenanceModalCallback = (callback: (show: boolean) => void) => {
  showMaintenanceModalCallback = callback;
};

interface RequestOptions {
    headers?: Record<string, string>;
    params?: Record<string, any>;
    [key: string]: any;
}

async function customFetch(endpoint: string, options: RequestInit & { params?: Record<string, any> } = {}) {
    let url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    if (options.params) {
        const queryParams = new URLSearchParams(options.params).toString();
        if (queryParams) {
            url += (url.includes('?') ? '&' : '?') + queryParams;
        }
    }

    const token = await tokenStorage.getItem('token');

    const headers: Record<string, string> = {
        'Accept': 'application/json',
        ...(IS_LOCAL && { 'Host': LOCAL_HOST }),
        ...(options.headers as Record<string, string>),
    };

    if (token && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (response.status === 503) {
            showMaintenanceModalCallback?.(true);
        } else if (showMaintenanceModalCallback) {
            showMaintenanceModalCallback(false);
        }

        let data: any;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            const error: any = new Error(`Request failed with status ${response.status}`);
            error.response = {
                status: response.status,
                data,
            };
            error.status = response.status;

            if (response.status === 302 || response.status === 401) {
                await tokenStorage.removeItem('token');
            }
            throw error;
        }

        return {
            data,
            status: response.status,
            headers: response.headers,
        };
    } catch (err: any) {
        if (err.name === 'TypeError' && err.message === 'Network request failed') {
            const error: any = new Error(`API Network Error: Unable to connect to ${BASE_URL}`);
            error.code = 'ERR_NETWORK';
            throw error;
        }
        throw err;
    }
}

const apiClient = {
    get: (endpoint: string, options: RequestOptions = {}) => {
        return customFetch(endpoint, { method: 'GET', ...options });
    },
    post: (endpoint: string, body?: any, options: RequestOptions = {}) => {
        const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
        const headers: Record<string, string> = { ...options.headers };

        let formattedBody = body;
        if (body && !isFormData && typeof body === 'object') {
            headers['Content-Type'] = 'application/json';
            formattedBody = JSON.stringify(body);
        }

        return customFetch(endpoint, {
            method: 'POST',
            body: formattedBody,
            ...options,
            headers,
        });
    },
    put: (endpoint: string, body?: any, options: RequestOptions = {}) => {
        const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
        const headers: Record<string, string> = { ...options.headers };

        let formattedBody = body;
        if (body && !isFormData && typeof body === 'object') {
            headers['Content-Type'] = 'application/json';
            formattedBody = JSON.stringify(body);
        }

        return customFetch(endpoint, {
            method: 'PUT',
            body: formattedBody,
            ...options,
            headers,
        });
    },
    delete: (endpoint: string, options: RequestOptions = {}) => {
        return customFetch(endpoint, { method: 'DELETE', ...options });
    }
};

// Ping endpoint to test backend connectivity
export const pingApi = async () => {
    return apiClient.get('/ping');
};

// Special method for login
export const login = async (formData: FormData) => {
    return apiClient.post('/login', formData);
};

// Logout function
export const logout = async (pushToken: string | null) => {
    return apiClient.post('/logout', { expo_token: pushToken });
};

// Get notification status from backend
export const getNotificationStatus = async (expoToken: string) => {
    return apiClient.get('/notifications/status', {
        params: { expo_token: expoToken }
    });
};

// Update notification status on backend
export const updateNotificationStatus = async (expoToken: string, enabled: boolean) => {
    return apiClient.post('/notifications/status', {
        expo_token: expoToken,
        notifications_enabled: enabled
    });
};

// Get notifications
export const getNotifications = async () => {
    return apiClient.get('/notifications');
};

// Mark notifications as read
export const markNotificationsAsRead = async (ids: string[]) => {
    return apiClient.post('/notifications/markAsRead', { ids });
};

export default apiClient;
