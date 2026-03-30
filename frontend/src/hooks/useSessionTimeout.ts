import { useEffect, useRef, useCallback } from 'react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

const IDLE_TIMEOUT_MS = 60 * 60 * 1000;      // 60 minutes
const WARNING_BEFORE_MS = 5 * 60 * 1000;     // warn 5 min before expiry → at 55 min idle
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;   // max server ping rate when active
const ACTIVITY_THROTTLE_MS = 1000;           // local activity tracking resolution

export interface SessionTimeoutState {
    showWarning: boolean;
    secondsRemaining: number;
}

interface UseSessionTimeoutOptions {
    onWarning: (state: SessionTimeoutState) => void;
    onDismissWarning: () => void;
    onLogout: () => void;
    isAuthenticated: boolean;
}

export function useSessionTimeout({
    onWarning,
    onDismissWarning,
    onLogout,
    isAuthenticated,
}: UseSessionTimeoutOptions) {
    const { updateToken, logout } = useAuthStore();

    // Timestamps stored as refs to avoid stale closure issues in event handlers
    const lastActivityRef = useRef<number>(Date.now());
    const lastRefreshedRef = useRef<number>(Date.now());
    const warningIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const mainTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const activityThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isWarningActiveRef = useRef(false);

    const clearAllTimers = useCallback(() => {
        if (mainTimerRef.current) clearInterval(mainTimerRef.current);
        if (warningIntervalRef.current) clearInterval(warningIntervalRef.current);
        if (activityThrottleRef.current) clearTimeout(activityThrottleRef.current);
    }, []);

    const performLogout = useCallback(() => {
        clearAllTimers();
        isWarningActiveRef.current = false;

        if (typeof window !== 'undefined') {
            const currentPath = window.location.pathname + window.location.search;
            if (currentPath !== '/login') {
                localStorage.setItem('hris_redirect_url', currentPath);
            }
        }

        logout();
        onLogout();
        window.location.href = '/login';
    }, [clearAllTimers, logout, onLogout]);

    const refreshSession = useCallback(async () => {
        try {
            const { data } = await authApi.refreshToken();
            updateToken(data.access_token);
            lastRefreshedRef.current = Date.now();
            lastActivityRef.current = Date.now();
            isWarningActiveRef.current = false;
            onDismissWarning();
        } catch {
            // Token is already invalid — let the 401 interceptor handle redirect
        }
    }, [updateToken, onDismissWarning]);

    // Called by the "Keep me signed in" button
    const keepAlive = useCallback(() => {
        refreshSession();
    }, [refreshSession]);

    // Activity event handler — throttled to once per second
    const handleActivity = useCallback(() => {
        const now = Date.now();

        if (activityThrottleRef.current) return; // already scheduled

        activityThrottleRef.current = setTimeout(() => {
            activityThrottleRef.current = null;
            lastActivityRef.current = Date.now();

            // If active and haven't refreshed in 5 min, ping server
            if (now - lastRefreshedRef.current >= REFRESH_INTERVAL_MS) {
                refreshSession();
            }
        }, ACTIVITY_THROTTLE_MS);
    }, [refreshSession]);

    useEffect(() => {
        if (!isAuthenticated) return;

        lastActivityRef.current = Date.now();
        lastRefreshedRef.current = Date.now();

        // Attach activity listeners
        const events = ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'];
        events.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));

        // Main polling tick — runs every second to check idle state
        mainTimerRef.current = setInterval(() => {
            const idleMs = Date.now() - lastActivityRef.current;
            const remainingMs = IDLE_TIMEOUT_MS - idleMs;

            if (remainingMs <= 0) {
                performLogout();
                return;
            }

            if (remainingMs <= WARNING_BEFORE_MS) {
                const secondsRemaining = Math.ceil(remainingMs / 1000);
                isWarningActiveRef.current = true;
                onWarning({ showWarning: true, secondsRemaining });
            } else if (isWarningActiveRef.current) {
                // Activity resumed before timeout — dismiss warning
                isWarningActiveRef.current = false;
                onDismissWarning();
            }
        }, 1000);

        return () => {
            clearAllTimers();
            events.forEach((ev) => window.removeEventListener(ev, handleActivity));
        };
    }, [isAuthenticated, handleActivity, performLogout, onWarning, onDismissWarning, clearAllTimers]);

    return { keepAlive };
}
