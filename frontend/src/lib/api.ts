import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

// Add auth token interceptor
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('hris_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Auth API
export const authApi = {
    login: (email: string, password: string) =>
        api.post('/api/v1/auth/login', { email, password }),
    seed: () => api.post('/api/v1/auth/seed'),
    updatePassword: (currentPassword: string, newPassword: string) =>
        api.put('/api/v1/auth/password', { currentPassword, newPassword }),
    resetPassword: (userId: number, newPassword: string) =>
        api.post('/api/v1/auth/password/reset', { userId, newPassword }),
};

// Users API
export const usersApi = {
    list: (params?: { page?: number; limit?: number; search?: string; deptCode?: string }) =>
        api.get('/api/v1/users', { params }),
    create: (data: any) =>
        api.post('/api/v1/users', data),
    update: (id: number, data: any) =>
        api.put(`/api/v1/users/${id}`, data),
    getSubordinates: (id: number) => api.get(`/api/v1/users/${id}/subordinates`),
};

// Bulk Upload API
export const bulkApi = {
    upload: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/api/v1/admin/users/bulk', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    getJobStatus: (jobId: string) => api.get(`/api/v1/admin/jobs/${jobId}`),
    listJobs: () => api.get('/api/v1/admin/jobs'),
    downloadTemplate: () =>
        api.get('/api/v1/admin/users/template', { responseType: 'blob' }),
    downloadErrorLog: (jobId: string) =>
        api.get(`/api/v1/admin/jobs/${jobId}/error-log`, { responseType: 'blob' }),
};

// Periods API
export const periodsApi = {
    list: (params?: { status?: string; isActive?: boolean }) =>
        api.get('/api/v1/periods', { params }),
    getActive: () => api.get('/api/v1/periods/active'),
    getById: (id: number) => api.get(`/api/v1/periods/${id}`),
    create: (data: {
        name: string;
        startDate: string;
        endDate: string;
        cycleType: 'MONTHLY' | 'QUARTERLY' | 'SEMESTER' | 'ANNUAL';
        status?: 'SETUP' | 'ACTIVE' | 'LOCKED' | 'CLOSED';
    }) => api.post('/api/v1/periods', data),
    update: (id: number, data: Partial<{
        name: string;
        startDate: string;
        endDate: string;
        cycleType: 'MONTHLY' | 'QUARTERLY' | 'SEMESTER' | 'ANNUAL';
        status: 'SETUP' | 'ACTIVE' | 'LOCKED' | 'CLOSED';
    }>) => api.put(`/api/v1/periods/${id}`, data),
    delete: (id: number) => api.delete(`/api/v1/periods/${id}`),
};

// KPI API
export const kpiApi = {
    createPlan: (data: {
        userId: number;
        periodId: number;
        details: {
            title: string;
            definition?: string;
            polarity: 'MAX' | 'MIN' | 'BINARY';
            weight: number;
            targetValue: number;
        }[];
    }) => api.post('/api/v1/kpi/plans', data),

    listPlans: (params?: { userId?: number; periodId?: number; status?: string; page?: number }) =>
        api.get('/api/v1/kpi/plans', { params }),

    getPlan: (id: number) => api.get(`/api/v1/kpi/plans/${id}`),

    submitPlan: (id: number) => api.post(`/api/v1/kpi/plans/${id}/submit`),

    approvePlan: (id: number) => api.post(`/api/v1/kpi/plans/${id}/approve`),

    rejectPlan: (id: number, comment: string) =>
        api.post(`/api/v1/kpi/plans/${id}/reject`, { comment }),

    cancelSubmission: (id: number) => api.post(`/api/v1/kpi/plans/${id}/cancel`),

    updateAchievement: (detailId: number, data: { actual_value: number; evidence_url?: string }) =>
        api.put(`/api/v1/kpi/achievements/${detailId}`, data),

    updateKpiComment: (detailId: number, comment: string) =>
        api.put(`/api/v1/kpi/details/${detailId}/comment`, { comment }),

    deleteAll: () => api.delete('/api/v1/kpi/plans/all'),

    getNineBoxData: (periodId?: number) =>
        api.get('/api/v1/kpi/nine-box', { params: periodId ? { periodId } : {} }),

    cascadeKpi: (data: {
        sourceDetailId: number;
        targetUserId: number;
        periodId: number;
        weight: number;
    }) => api.post('/api/v1/kpi/cascade', data),
};

// Reports API (Admin only)
export const reportsApi = {
    triggerKpiExport: (periodId: number) =>
        api.get('/api/v1/admin/reports/kpi-export', { params: { period_id: periodId } }),

    getExportStatus: (jobId: string) =>
        api.get(`/api/v1/admin/reports/kpi-export/status/${jobId}`),

    downloadExport: (jobId: string) =>
        api.get(`/api/v1/admin/reports/kpi-export/download/${jobId}`, {
            responseType: 'blob',
        }),

    listRecentExports: (limit = 10) =>
        api.get('/api/v1/admin/reports/kpi-export/list', { params: { limit } }),
};

// Audit Log API (Admin only)
export const auditApi = {
    getLogs: (filters?: {
        action?: string;
        userId?: number;
        resourceType?: string;
        startDate?: string;
        endDate?: string;
        page?: number;
        limit?: number;
    }) => api.get('/api/v1/admin/audit-log', { params: filters }),

    getStats: () => api.get('/api/v1/admin/audit-log/stats'),
};

// Scoring Configuration API
export const scoringConfigApi = {
    getConfig: () => api.get('/api/v1/scoring-config'),

    updateConfig: (data: {
        capMultiplier?: number;
        excellentThreshold?: number;
        veryGoodThreshold?: number;
        goodThreshold?: number;
        poorThreshold?: number;
    }) => api.put('/api/v1/scoring-config', data),
};
