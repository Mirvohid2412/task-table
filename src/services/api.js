import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth
export const authAPI = {
    login: (data) => api.post('/auth/login', data),
    check: () => api.get('/auth/check'),
};

// Tables (Admin)
export const tablesAPI = {
    getAll: () => api.get('/tables'),
    create: (data) => api.post('/tables', data),
    getById: (tableId) => api.get(`/tables/${tableId}`),
    delete: (tableId) => api.delete(`/tables/${tableId}`),
    regenerateId: (tableId) => api.patch(`/tables/${tableId}/regenerate`),
    updateName: (tableId, name) => api.patch(`/tables/${tableId}/name`, { name }),
    updateData: (tableId, rows) => api.put(`/tables/${tableId}`, { rows }),
};

// Tables (Public)
export const publicAPI = {
    getById: (tableId) => api.get(`/tables/public/${tableId}`),
};

// Roles
export const rolesAPI = {
    add: (tableId, role) => api.post(`/tables/${tableId}/roles`, { role }),
    delete: (tableId, roleIndex) => api.delete(`/tables/${tableId}/roles/${roleIndex}`),
};

// Rows
export const rowsAPI = {
    create: (tableId, data) => api.post(`/tables/${tableId}/rows`, data),
    update: (tableId, rowId, data) => api.patch(`/tables/${tableId}/rows/${rowId}`, data),
    delete: (tableId, rowId) => api.delete(`/tables/${tableId}/rows/${rowId}`),
};

// Tasks
export const tasksAPI = {
    add: (tableId, rowId) => api.post(`/tables/${tableId}/rows/${rowId}/tasks`),
    update: (tableId, rowId, taskId, data) => api.patch(`/tables/${tableId}/rows/${rowId}/tasks/${taskId}`, data),
    delete: (tableId, rowId, taskId) => api.delete(`/tables/${tableId}/rows/${rowId}/tasks/${taskId}`),
};

export default api;
