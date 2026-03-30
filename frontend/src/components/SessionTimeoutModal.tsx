"use client";

import { useEffect, useState } from "react";

interface SessionTimeoutModalProps {
    secondsRemaining: number;
    onKeepAlive: () => void;
    onLogout: () => void;
}

function formatCountdown(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

export default function SessionTimeoutModal({
    secondsRemaining,
    onKeepAlive,
    onLogout,
}: SessionTimeoutModalProps) {
    const [isKeepingAlive, setIsKeepingAlive] = useState(false);

    // Reset button state whenever modal re-opens
    useEffect(() => {
        setIsKeepingAlive(false);
    }, []);

    const handleKeepAlive = async () => {
        setIsKeepingAlive(true);
        await onKeepAlive();
        setIsKeepingAlive(false);
    };

    const isUrgent = secondsRemaining <= 60;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(4px)" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-timeout-title"
        >
            <div
                className="glass-card w-full max-w-sm p-7 text-center"
                style={{
                    border: isUrgent
                        ? "1px solid hsl(0, 72%, 55%)"
                        : "1px solid hsl(var(--border))",
                    boxShadow: isUrgent
                        ? "0 0 40px hsla(0, 72%, 55%, 0.25)"
                        : undefined,
                }}
            >
                {/* Icon */}
                <div
                    className="mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center"
                    style={{
                        background: isUrgent
                            ? "hsla(0, 72%, 55%, 0.15)"
                            : "hsla(217.2, 91.2%, 59.8%, 0.12)",
                    }}
                >
                    <svg
                        className="w-7 h-7"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        style={{ color: isUrgent ? "hsl(0, 72%, 65%)" : "hsl(217.2, 91.2%, 59.8%)" }}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                        />
                    </svg>
                </div>

                {/* Title */}
                <h2
                    id="session-timeout-title"
                    className="text-lg font-bold mb-2"
                    style={{ color: "hsl(var(--foreground))" }}
                >
                    Session Expiring Soon
                </h2>

                {/* Description */}
                <p className="text-sm mb-5" style={{ color: "hsl(var(--muted-foreground))" }}>
                    Your session will expire due to inactivity. Any unsaved changes may be lost.
                </p>

                {/* Countdown */}
                <div
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg mb-6 text-2xl font-mono font-bold tabular-nums"
                    style={{
                        background: isUrgent
                            ? "hsla(0, 72%, 55%, 0.1)"
                            : "hsl(var(--secondary))",
                        color: isUrgent ? "hsl(0, 72%, 65%)" : "hsl(var(--foreground))",
                        border: isUrgent ? "1px solid hsla(0, 72%, 55%, 0.3)" : "none",
                    }}
                >
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatCountdown(secondsRemaining)}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2.5">
                    <button
                        onClick={handleKeepAlive}
                        disabled={isKeepingAlive}
                        className="btn btn-primary w-full py-2.5 font-semibold"
                    >
                        {isKeepingAlive ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Refreshing session...
                            </span>
                        ) : (
                            "Keep me signed in"
                        )}
                    </button>

                    <button
                        onClick={onLogout}
                        className="btn btn-secondary w-full py-2.5 text-sm"
                    >
                        Sign out now
                    </button>
                </div>
            </div>
        </div>
    );
}
