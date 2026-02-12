"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { usersApi, kpiApi, bulkApi } from "@/lib/api";

interface Stats {
    totalUsers: number;
    totalKpiPlans: number;
    recentJobs: number;
}

export default function DashboardPage() {
    const { user } = useAuthStore();
    const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalKpiPlans: 0, recentJobs: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [usersRes, kpiRes, jobsRes] = await Promise.all([
                    usersApi.list({ limit: 1 }).catch(() => ({ data: { total: 0 } })),
                    kpiApi.listPlans({ page: 1 }).catch(() => ({ data: { total: 0 } })),
                    bulkApi.listJobs().catch(() => ({ data: { data: [] } })),
                ]);
                setStats({
                    totalUsers: usersRes.data.total || 0,
                    totalKpiPlans: kpiRes.data.total || 0,
                    recentJobs: jobsRes.data.data?.length || 0,
                });
            } catch {
                // Stats might fail if backend not running
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const cards = [
        {
            title: "Total Employees",
            value: stats.totalUsers,
            change: "+12%",
            gradient: "gradient-primary",
            icon: (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
        },
        {
            title: "KPI Plans",
            value: stats.totalKpiPlans,
            change: "Active",
            gradient: "gradient-success",
            icon: (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            ),
        },
        {
            title: "Bulk Jobs",
            value: stats.recentJobs,
            change: "Recent",
            gradient: "gradient-warning",
            icon: (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
            ),
        },
    ];

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold" style={{ color: "hsl(var(--foreground))" }}>
                    Welcome back, {user?.fullName || "Admin"} 👋
                </h1>
                <p className="mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                    Here&apos;s what&apos;s happening with your HRIS performance system.
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {cards.map((card, i) => (
                    <div
                        key={i}
                        className="glass-card p-6 animate-slide-up"
                        style={{ animationDelay: `${i * 100}ms` }}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
                                    {card.title}
                                </p>
                                <p className="text-3xl font-bold mt-2" style={{ color: "hsl(var(--foreground))" }}>
                                    {loading ? "—" : card.value}
                                </p>
                                <span className="text-xs font-medium mt-1 inline-block" style={{ color: "hsl(142, 76%, 46%)" }}>
                                    {card.change}
                                </span>
                            </div>
                            <div className={`w-12 h-12 rounded-xl ${card.gradient} flex items-center justify-center`}>
                                {card.icon}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="glass-card p-6">
                <h2 className="text-lg font-semibold mb-4" style={{ color: "hsl(var(--foreground))" }}>
                    Quick Actions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <a
                        href="/dashboard/kpi"
                        className="flex items-center gap-3 p-4 rounded-xl transition-all duration-200 hover:scale-[1.02]"
                        style={{ background: "hsla(217.2, 91.2%, 59.8%, 0.1)", border: "1px solid hsla(217.2, 91.2%, 59.8%, 0.2)" }}
                    >
                        <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Create KPI Plan</p>
                            <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Set targets for period</p>
                        </div>
                    </a>

                    <a
                        href="/dashboard/bulk-upload"
                        className="flex items-center gap-3 p-4 rounded-xl transition-all duration-200 hover:scale-[1.02]"
                        style={{ background: "hsla(142, 76%, 36%, 0.1)", border: "1px solid hsla(142, 76%, 36%, 0.2)" }}
                    >
                        <div className="w-10 h-10 rounded-lg gradient-success flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Bulk Upload</p>
                            <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Import users from Excel</p>
                        </div>
                    </a>

                    <a
                        href="/dashboard/achievements"
                        className="flex items-center gap-3 p-4 rounded-xl transition-all duration-200 hover:scale-[1.02]"
                        style={{ background: "hsla(38, 92%, 50%, 0.1)", border: "1px solid hsla(38, 92%, 50%, 0.2)" }}
                    >
                        <div className="w-10 h-10 rounded-lg gradient-warning flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Update Scores</p>
                            <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Enter actual achievements</p>
                        </div>
                    </a>
                </div>
            </div>
        </div>
    );
}
