"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { authApi } from "@/lib/api";
import Link from "next/link";

const navItems = [
    {
        label: "Dashboard",
        href: "/dashboard",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
    },
    {
        label: "KPI Plans",
        href: "/dashboard/kpi",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        ),
    },
    {
        label: "Achievements",
        href: "/dashboard/achievements",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
        ),
    },
    {
        label: "Users",
        href: "/dashboard/users",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
        ),
    },
    {
        label: "Periods",
        href: "/dashboard/periods",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        ),
    },
    {
        label: "Bulk Upload",
        href: "/dashboard/bulk-upload",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
        ),
        adminOnly: true,
    },
    {
        label: "Audit Log",
        href: "/dashboard/audit-log",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        ),
        adminOnly: true,
    },
    {
        label: "Scoring Config",
        href: "/dashboard/scoring-config",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
        adminOnly: true,
    },
    {
        label: "Nine-Box Grid",
        href: "/dashboard/nine-box",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
        ),
        adminOnly: true,
    },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, user, logout, hydrate } = useAuthStore();
    const { theme, toggleTheme } = useThemeStore();
    const router = useRouter();
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Password change modal state
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [passwordError, setPasswordError] = useState("");
    const [passwordSuccess, setPasswordSuccess] = useState("");
    const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        hydrate();
    }, [hydrate]);

    useEffect(() => {
        if (!isAuthenticated && typeof window !== "undefined") {
            const token = localStorage.getItem("hris_token");
            if (!token) {
                router.push("/login");
            }
        }
    }, [isAuthenticated, router]);

    // Apply theme to document element only after mount
    useEffect(() => {
        if (mounted) {
            document.documentElement.setAttribute('data-theme', theme);
        }
    }, [theme, mounted]);

    // Use default theme during SSR to prevent hydration mismatch
    const currentTheme = mounted ? theme : 'dark';

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError("");
        setPasswordSuccess("");

        // Validate passwords match
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError("New passwords do not match");
            return;
        }

        // Validate password strength
        if (passwordForm.newPassword.length < 8) {
            setPasswordError("Password must be at least 8 characters");
            return;
        }

        if (!/[A-Za-z]/.test(passwordForm.newPassword) || !/\d/.test(passwordForm.newPassword)) {
            setPasswordError("Password must contain at least one letter and one number");
            return;
        }

        setIsSubmittingPassword(true);

        try {
            await authApi.updatePassword(passwordForm.currentPassword, passwordForm.newPassword);
            setPasswordSuccess("Password updated successfully!");
            setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
            setTimeout(() => {
                setShowPasswordModal(false);
                setPasswordSuccess("");
            }, 2000);
        } catch (error: any) {
            setPasswordError(
                error.response?.data?.message ||
                (Array.isArray(error.response?.data?.message)
                    ? error.response.data.message.join(", ")
                    : "Failed to update password")
            );
        } finally {
            setIsSubmittingPassword(false);
        }
    };

    return (
        <div className="dashboard-root flex min-h-screen">
            {/* Mobile top bar */}
            <div className="fixed top-0 left-0 right-0 z-30 flex items-center gap-3 p-3 border-b md:hidden sidebar">
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: "hsl(var(--foreground))" }}
                    aria-label="Open menu"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <span className="sidebar-title font-bold text-sm">HRIS</span>
                </div>
            </div>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`sidebar w-64 flex flex-col border-r fixed h-full z-50 transition-transform duration-300 ease-in-out md:translate-x-0 md:z-20 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}>
                {/* Logo */}
                <div className="sidebar-logo p-5 border-b">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="sidebar-title font-bold text-sm">HRIS</h1>
                            <p className="sidebar-subtitle text-xs">Performance Mgmt</p>
                        </div>
                        {/* Close button for mobile */}
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="ml-auto p-1.5 rounded-lg md:hidden"
                            style={{ color: "hsl(var(--muted-foreground))" }}
                            aria-label="Close menu"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {navItems
                        .filter((item) => !item.adminOnly || user?.role === 'ADMIN')
                        .map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive ? 'nav-link-active' : ''}`}
                                >
                                    <span className={isActive ? 'nav-icon-active' : ''}>
                                        {item.icon}
                                    </span>
                                    {item.label}
                                </Link>
                            );
                        })}
                </nav>

                {/* Theme Toggle */}
                <div className="px-4 pb-3">
                    <button
                        onClick={toggleTheme}
                        className="theme-toggle-btn w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                        title={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                        {currentTheme === 'dark' ? (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                Light
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                                Dark
                            </>
                        )}
                    </button>
                </div>

                {/* User info */}
                <div className="sidebar-user p-4 border-t">
                    <div className="flex items-center gap-3">
                        <div
                            className="user-avatar w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                        >
                            {user?.fullName?.charAt(0) || "A"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="sidebar-title text-sm font-medium truncate">
                                {user?.fullName || "Admin"}
                            </p>
                            <p className="sidebar-subtitle text-xs truncate">
                                {user?.role || "ADMIN"}
                            </p>
                        </div>
                        <button
                            onClick={() => setShowPasswordModal(true)}
                            className="sidebar-subtitle p-1.5 rounded-lg transition-colors hover:bg-gray-700"
                            title="Change Password"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => {
                                logout();
                                window.location.href = '/login';
                            }}
                            className="sidebar-subtitle p-1.5 rounded-lg transition-colors hover:bg-gray-700"
                            title="Logout"
                            aria-label="Logout"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 md:ml-64 p-4 pt-16 md:p-6 md:pt-6" style={{ minHeight: "100vh" }}>
                {children}
            </main>

            {/* Change Password Modal */}
            {showPasswordModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: "rgba(0, 0, 0, 0.7)" }}
                    onClick={() => setShowPasswordModal(false)}
                >
                    <div
                        className="glass-card w-full max-w-md p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold" style={{ color: "hsl(var(--foreground))" }}>
                                Change Password
                            </h2>
                            <button
                                onClick={() => setShowPasswordModal(false)}
                                className="text-2xl"
                                style={{ color: "hsl(var(--muted-foreground))" }}
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            {passwordError && (
                                <div
                                    className="p-3 rounded text-sm"
                                    style={{
                                        background: "hsl(0, 72%, 55%, 0.1)",
                                        border: "1px solid hsl(0, 72%, 55%)",
                                        color: "hsl(0, 72%, 55%)",
                                    }}
                                >
                                    {passwordError}
                                </div>
                            )}

                            {passwordSuccess && (
                                <div
                                    className="p-3 rounded text-sm"
                                    style={{
                                        background: "hsl(142, 76%, 46%, 0.1)",
                                        border: "1px solid hsl(142, 76%, 46%)",
                                        color: "hsl(142, 76%, 46%)",
                                    }}
                                >
                                    {passwordSuccess}
                                </div>
                            )}

                            <div>
                                <label
                                    className="block text-sm font-medium mb-1"
                                    style={{ color: "hsl(var(--muted-foreground))" }}
                                >
                                    Current Password <span style={{ color: "hsl(0, 72%, 55%)" }}>*</span>
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={passwordForm.currentPassword}
                                    onChange={(e) =>
                                        setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                                    }
                                    className="w-full"
                                    placeholder="Enter current password"
                                />
                            </div>

                            <div>
                                <label
                                    className="block text-sm font-medium mb-1"
                                    style={{ color: "hsl(var(--muted-foreground))" }}
                                >
                                    New Password <span style={{ color: "hsl(0, 72%, 55%)" }}>*</span>
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={passwordForm.newPassword}
                                    onChange={(e) =>
                                        setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                                    }
                                    className="w-full"
                                    placeholder="At least 8 chars, letter + number"
                                />
                            </div>

                            <div>
                                <label
                                    className="block text-sm font-medium mb-1"
                                    style={{ color: "hsl(var(--muted-foreground))" }}
                                >
                                    Confirm New Password <span style={{ color: "hsl(0, 72%, 55%)" }}>*</span>
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) =>
                                        setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                                    }
                                    className="w-full"
                                    placeholder="Re-enter new password"
                                />
                            </div>

                            <div
                                className="text-xs p-3 rounded"
                                style={{
                                    background: "hsl(var(--secondary))",
                                    color: "hsl(var(--muted-foreground))",
                                }}
                            >
                                Password must be at least 8 characters and contain at least one letter and one
                                number.
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="submit"
                                    disabled={isSubmittingPassword}
                                    className="btn btn-primary flex-1"
                                >
                                    {isSubmittingPassword ? "Updating..." : "Update Password"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowPasswordModal(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
