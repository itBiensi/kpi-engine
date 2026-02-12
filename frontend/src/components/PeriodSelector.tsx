"use client";

import { useState, useEffect } from "react";
import { periodsApi } from "@/lib/api";

interface PeriodSelectorProps {
    onPeriodChange: (period: any) => void;
    selectedPeriodId?: number;
}

export default function PeriodSelector({ onPeriodChange, selectedPeriodId }: PeriodSelectorProps) {
    const [periods, setPeriods] = useState<any[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPeriods();
    }, []);

    useEffect(() => {
        // If selectedPeriodId prop changes, update selected period
        if (selectedPeriodId && periods.length > 0) {
            const period = periods.find(p => p.id === selectedPeriodId);
            if (period) {
                setSelectedPeriod(period);
            }
        }
    }, [selectedPeriodId, periods]);

    const loadPeriods = async () => {
        setLoading(true);
        try {
            const { data } = await periodsApi.list();
            setPeriods(data || []);

            // Try to get active period
            try {
                const { data: activePeriod } = await periodsApi.getActive();
                setSelectedPeriod(activePeriod);
                onPeriodChange(activePeriod);
            } catch {
                // No active period, select first period if available
                if (data && data.length > 0) {
                    setSelectedPeriod(data[0]);
                    onPeriodChange(data[0]);
                }
            }
        } catch (error) {
            console.error("Failed to load periods:", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const periodId = parseInt(e.target.value);
        const period = periods.find(p => p.id === periodId);
        if (period) {
            setSelectedPeriod(period);
            onPeriodChange(period);
        }
    };

    const getStatusStyle = (status: string) => {
        const styles = {
            SETUP: { bg: "hsl(200, 98%, 39%, 0.15)", color: "hsl(200, 98%, 39%)", label: "Setup" },
            ACTIVE: { bg: "hsl(142, 76%, 46%, 0.15)", color: "hsl(142, 76%, 46%)", label: "Open for Submission" },
            LOCKED: { bg: "hsl(45, 93%, 47%, 0.15)", color: "hsl(45, 93%, 47%)", label: "Locked" },
            CLOSED: { bg: "hsl(0, 0%, 50%, 0.15)", color: "hsl(0, 0%, 50%)", label: "Closed" },
        };

        return styles[status as keyof typeof styles] || styles.SETUP;
    };

    const formatDateRange = (startDate: string, endDate: string) => {
        const start = new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const end = new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return `${start} - ${end}`;
    };

    if (loading) {
        return (
            <div className="glass-card p-4">
                <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                    Loading periods...
                </p>
            </div>
        );
    }

    if (periods.length === 0) {
        return (
            <div className="glass-card p-4">
                <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                    No assessment periods available. Please contact your administrator.
                </p>
            </div>
        );
    }

    const statusStyle = selectedPeriod ? getStatusStyle(selectedPeriod.status) : null;
    const isReadOnly = selectedPeriod && (selectedPeriod.status === 'LOCKED' || selectedPeriod.status === 'CLOSED');

    return (
        <div className="glass-card p-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                    <label
                        className="block text-xs font-medium mb-2"
                        style={{ color: "hsl(var(--muted-foreground))" }}
                    >
                        Assessment Period
                    </label>
                    <select
                        value={selectedPeriod?.id || ""}
                        onChange={handlePeriodChange}
                        className="w-full md:max-w-md"
                        style={{
                            background: "hsl(var(--secondary))",
                            color: "hsl(var(--foreground))",
                            border: "1px solid hsl(var(--border))",
                        }}
                    >
                        {periods.map((period) => (
                            <option key={period.id} value={period.id}>
                                {period.name} ({formatDateRange(period.startDate, period.endDate)})
                            </option>
                        ))}
                    </select>
                </div>

                {selectedPeriod && statusStyle && (
                    <div className="flex items-center gap-2">
                        <div
                            className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2"
                            style={{
                                background: statusStyle.bg,
                                color: statusStyle.color,
                            }}
                        >
                            <span
                                className="w-2 h-2 rounded-full"
                                style={{ background: statusStyle.color }}
                            />
                            {statusStyle.label}
                        </div>

                        {isReadOnly && (
                            <div
                                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                                style={{
                                    background: "hsl(0, 72%, 55%, 0.1)",
                                    color: "hsl(0, 72%, 55%)",
                                }}
                            >
                                🔒 Read-Only
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
