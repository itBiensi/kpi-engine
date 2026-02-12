import { create } from 'zustand';

interface User {
    id: number;
    employeeId: string;
    fullName: string;
    email: string;
    role: string;
    deptCode: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
    hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: null,
    isAuthenticated: false,

    login: (token: string, user: User) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('hris_token', token);
            localStorage.setItem('hris_user', JSON.stringify(user));
        }
        set({ token, user, isAuthenticated: true });
    },

    logout: () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('hris_token');
            localStorage.removeItem('hris_user');
        }
        set({ token: null, user: null, isAuthenticated: false });
    },

    hydrate: () => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('hris_token');
            const userStr = localStorage.getItem('hris_user');
            if (token && userStr) {
                try {
                    const user = JSON.parse(userStr);
                    set({ token, user, isAuthenticated: true });
                } catch {
                    set({ token: null, user: null, isAuthenticated: false });
                }
            }
        }
    },
}));
