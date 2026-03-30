"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";

export default function LoginPage() {
    const [email, setEmail] = useState("admin@hris.com");
    const [password, setPassword] = useState("admin123");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { login } = useAuthStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const { data } = await authApi.login(email, password);
            login(data.access_token, data.user);
            const redirectUrl = localStorage.getItem('hris_redirect_url');
            if (redirectUrl) {
                localStorage.removeItem('hris_redirect_url');
                router.push(redirectUrl);
            } else {
                router.push("/dashboard");
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Login failed. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    const handleSeed = async () => {
        try {
            await authApi.seed();
            setError("");
            alert("Admin user seeded! You can now login with admin@hris.com / admin123");
        } catch {
            setError("Failed to seed admin user");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(222.2, 84%, 4.9%)" }}>
            {/* Background effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20"
                    style={{ background: "radial-gradient(circle, hsl(217.2, 91.2%, 59.8%) 0%, transparent 70%)" }}
                />
                <div
                    className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-15"
                    style={{ background: "radial-gradient(circle, hsl(250, 80%, 60%) 0%, transparent 70%)" }}
                />
            </div>

            <div className="glass-card p-8 w-full max-w-md animate-fade-in relative z-10">
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    <div
                        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 gradient-primary"
                        style={{ boxShadow: "0 8px 32px hsla(217.2, 91.2%, 59.8%, 0.3)" }}
                    >
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold" style={{ color: "hsl(210, 40%, 98%)" }}>HRIS Performance</h1>
                    <p className="text-sm mt-1" style={{ color: "hsl(215, 20.2%, 65.1%)" }}>
                        KPI Management System
                    </p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 rounded-lg text-sm font-medium animate-fade-in" style={{
                            background: "hsla(0, 62.8%, 50.6%, 0.15)",
                            color: "hsl(0, 72%, 65%)",
                            border: "1px solid hsla(0, 62.8%, 50.6%, 0.3)"
                        }}>
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: "hsl(215, 20.2%, 75%)" }}>
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full"
                            placeholder="admin@hris.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: "hsl(215, 20.2%, 75%)" }}>
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary w-full py-3 text-base font-semibold"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Signing in...
                            </span>
                        ) : (
                            "Sign In"
                        )}
                    </button>
                </form>

                <div className="mt-4 text-center">
                    <button
                        onClick={handleSeed}
                        className="text-xs hover:underline"
                        style={{ color: "hsl(215, 20.2%, 55%)" }}
                    >
                        First time? Click to seed admin user
                    </button>
                </div>
            </div>
        </div>
    );
}
