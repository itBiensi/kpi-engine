"use client";

import { useState, useEffect } from "react";
import { periodsApi, reportsApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";

export default function PeriodsPage() {
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'ADMIN';

    const [periods, setPeriods] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingPeriod, setEditingPeriod] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: "",
        startDate: "",
        endDate: "",
        cycleType: "MONTHLY" as "MONTHLY" | "QUARTERLY" | "SEMESTER" | "ANNUAL",
        status: "SETUP" as "SETUP" | "ACTIVE" | "LOCKED" | "CLOSED",
    });
    const [formError, setFormError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [exportingPeriod, setExportingPeriod] = useState<number | null>(null);
    const [exportJobId, setExportJobId] = useState<string | null>(null);
    const [exportProgress, setExportProgress] = useState(0);
    const [exportStatus, setExportStatus] = useState<string>("");

    useEffect(() => {
        loadPeriods();
    }, []);

    const loadPeriods = async () => {
        setLoading(true);
        try {
            const { data } = await periodsApi.list();
            setPeriods(data || []);
        } catch (error) {
            console.error("Failed to load periods:", error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingPeriod(null);
        setFormData({
            name: "",
            startDate: "",
            endDate: "",
            cycleType: "MONTHLY",
            status: "SETUP",
        });
        setFormError("");
        setShowModal(true);
    };

    const openEditModal = (period: any) => {
        setEditingPeriod(period);
        setFormData({
            name: period.name,
            startDate: new Date(period.startDate).toISOString().split('T')[0],
            endDate: new Date(period.endDate).toISOString().split('T')[0],
            cycleType: period.cycleType,
            status: period.status,
        });
        setFormError("");
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        setIsSubmitting(true);

        try {
            if (editingPeriod) {
                await periodsApi.update(editingPeriod.id, formData);
            } else {
                await periodsApi.create(formData);
            }
            setShowModal(false);
            loadPeriods();
        } catch (error: any) {
            setFormError(
                error.response?.data?.message || "Failed to save period"
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this period?")) return;

        try {
            await periodsApi.delete(id);
            loadPeriods();
        } catch (error: any) {
            alert(error.response?.data?.message || "Failed to delete period");
        }
    };

    const handleExport = async (periodId: number) => {
        if (!confirm("Export all KPI data for this period? This may take a few moments for large datasets.")) return;

        setExportingPeriod(periodId);
        setExportProgress(0);
        setExportStatus("Initiating export...");

        try {
            // Trigger export job
            const { data } = await reportsApi.triggerKpiExport(periodId);
            setExportJobId(data.jobId);
            setExportStatus("Export job queued. Processing...");

            // Start polling for job status
            pollExportStatus(data.jobId);
        } catch (error: any) {
            setExportingPeriod(null);
            setExportStatus("");
            alert(error.response?.data?.message || "Failed to start export");
        }
    };

    const pollExportStatus = async (jobId: string) => {
        const maxAttempts = 60; // Poll for up to 5 minutes (60 * 5 seconds)
        let attempts = 0;

        const poll = async () => {
            try {
                const { data } = await reportsApi.getExportStatus(jobId);

                if (data.status === 'completed') {
                    setExportProgress(100);
                    setExportStatus("Export complete! Downloading...");

                    // Download the file
                    setTimeout(() => downloadExportFile(jobId), 500);
                    return;
                } else if (data.status === 'failed') {
                    setExportingPeriod(null);
                    setExportStatus("");
                    alert("Export failed: " + (data.failedReason || "Unknown error"));
                    return;
                } else if (data.status === 'active' || data.status === 'waiting') {
                    // Update progress
                    const progress = typeof data.progress === 'number' ? data.progress : 0;
                    setExportProgress(progress);
                    setExportStatus(`Processing... ${progress}%`);

                    // Continue polling if not exceeded max attempts
                    attempts++;
                    if (attempts < maxAttempts) {
                        setTimeout(poll, 3000); // Poll every 3 seconds
                    } else {
                        setExportingPeriod(null);
                        setExportStatus("");
                        alert("Export is taking longer than expected. Please check the job status later.");
                    }
                }
            } catch (error) {
                console.error("Error polling export status:", error);
                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(poll, 3000);
                }
            }
        };

        poll();
    };

    const downloadExportFile = async (jobId: string) => {
        try {
            const response = await reportsApi.downloadExport(jobId);

            // Create blob from response
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `KPI_Export_${Date.now()}.xlsx`;
            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            setExportingPeriod(null);
            setExportJobId(null);
            setExportProgress(0);
            setExportStatus("");

            alert("Export downloaded successfully!");
        } catch (error: any) {
            setExportingPeriod(null);
            setExportStatus("");
            alert("Failed to download export file");
        }
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            SETUP: { bg: "hsl(200, 98%, 39%, 0.1)", border: "hsl(200, 98%, 39%)", color: "hsl(200, 98%, 39%)" },
            ACTIVE: { bg: "hsl(142, 76%, 46%, 0.1)", border: "hsl(142, 76%, 46%)", color: "hsl(142, 76%, 46%)" },
            LOCKED: { bg: "hsl(45, 93%, 47%, 0.1)", border: "hsl(45, 93%, 47%)", color: "hsl(45, 93%, 47%)" },
            CLOSED: { bg: "hsl(0, 0%, 50%, 0.1)", border: "hsl(0, 0%, 50%)", color: "hsl(0, 0%, 50%)" },
        };

        const style = styles[status as keyof typeof styles] || styles.SETUP;

        return (
            <span
                className="px-2 py-1 text-xs font-medium rounded"
                style={{
                    background: style.bg,
                    border: `1px solid ${style.border}`,
                    color: style.color,
                }}
            >
                {status}
            </span>
        );
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    if (!isAdmin) {
        return (
            <div className="animate-fade-in">
                <div className="glass-card p-6 text-center">
                    <p style={{ color: "hsl(var(--muted-foreground))" }}>
                        Access denied. Admin privileges required.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: "hsl(var(--foreground))" }}>
                        Period Management
                    </h1>
                    <p className="mt-1 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                        Manage assessment periods and cycles
                    </p>
                </div>
                <button onClick={openCreateModal} className="btn btn-primary">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Period
                </button>
            </div>

            {/* Export Progress Indicator */}
            {exportingPeriod && (
                <div className="mb-4 p-4 rounded-lg glass-card">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <svg className="animate-spin h-5 w-5" style={{ color: "hsl(142, 76%, 46%)" }} fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="font-medium" style={{ color: "hsl(var(--foreground))" }}>
                                Export in Progress
                            </span>
                        </div>
                        <span className="text-sm font-medium" style={{ color: "hsl(142, 76%, 46%)" }}>
                            {exportProgress}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                            className="h-2 rounded-full transition-all duration-300"
                            style={{
                                width: `${exportProgress}%`,
                                background: "hsl(142, 76%, 46%)",
                            }}
                        />
                    </div>
                    <p className="mt-2 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                        {exportStatus}
                    </p>
                </div>
            )}

            {/* Periods Table */}
            <div className="glass-card overflow-hidden">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Period Name</th>
                            <th>Date Range</th>
                            <th>Cycle Type</th>
                            <th>Status</th>
                            <th>Active</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>
                                    Loading periods...
                                </td>
                            </tr>
                        ) : periods.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>
                                    No periods found. Create one to get started.
                                </td>
                            </tr>
                        ) : (
                            periods.map((period) => (
                                <tr key={period.id}>
                                    <td className="font-medium">{period.name}</td>
                                    <td className="text-sm">
                                        {formatDate(period.startDate)} - {formatDate(period.endDate)}
                                    </td>
                                    <td>
                                        <span className="badge badge-draft">{period.cycleType}</span>
                                    </td>
                                    <td>{getStatusBadge(period.status)}</td>
                                    <td>
                                        {period.isActive ? (
                                            <span className="text-xs font-medium" style={{ color: "hsl(142, 76%, 46%)" }}>
                                                ● Active
                                            </span>
                                        ) : (
                                            <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                                                —
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openEditModal(period)}
                                                className="btn btn-secondary text-xs py-1 px-2"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleExport(period.id)}
                                                disabled={exportingPeriod === period.id}
                                                className="btn text-xs py-1 px-2"
                                                style={{
                                                    background: exportingPeriod === period.id
                                                        ? "hsl(var(--muted))"
                                                        : "hsl(142, 76%, 46%, 0.15)",
                                                    color: exportingPeriod === period.id
                                                        ? "hsl(var(--muted-foreground))"
                                                        : "hsl(142, 76%, 46%)",
                                                    border: `1px solid ${exportingPeriod === period.id
                                                        ? "hsl(var(--border))"
                                                        : "hsl(142, 76%, 46%, 0.3)"}`,
                                                    cursor: exportingPeriod === period.id ? "not-allowed" : "pointer",
                                                }}
                                            >
                                                {exportingPeriod === period.id ? "Exporting..." : "📊 Export"}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(period.id)}
                                                className="btn btn-secondary text-xs py-1 px-2"
                                                style={{ color: "hsl(0, 72%, 55%)" }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: "rgba(0, 0, 0, 0.7)" }}
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="glass-card w-full max-w-lg p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold" style={{ color: "hsl(var(--foreground))" }}>
                                {editingPeriod ? "Edit Period" : "Create New Period"}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-2xl"
                                style={{ color: "hsl(var(--muted-foreground))" }}
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {formError && (
                                <div
                                    className="p-3 rounded text-sm"
                                    style={{
                                        background: "hsl(0, 72%, 55%, 0.1)",
                                        border: "1px solid hsl(0, 72%, 55%)",
                                        color: "hsl(0, 72%, 55%)",
                                    }}
                                >
                                    {formError}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                                    Period Name <span style={{ color: "hsl(0, 72%, 55%)" }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full"
                                    placeholder="e.g., Q1 2026 Performance Review"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                                        Start Date <span style={{ color: "hsl(0, 72%, 55%)" }}>*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        className="w-full"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                                        End Date <span style={{ color: "hsl(0, 72%, 55%)" }}>*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        className="w-full"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                                        Cycle Type
                                    </label>
                                    <select
                                        value={formData.cycleType}
                                        onChange={(e) => setFormData({ ...formData, cycleType: e.target.value as any })}
                                        className="w-full"
                                    >
                                        <option value="MONTHLY">Monthly</option>
                                        <option value="QUARTERLY">Quarterly</option>
                                        <option value="SEMESTER">Semester</option>
                                        <option value="ANNUAL">Annual</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                                        Status
                                    </label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                        className="w-full"
                                    >
                                        <option value="SETUP">Setup</option>
                                        <option value="ACTIVE">Active</option>
                                        <option value="LOCKED">Locked</option>
                                        <option value="CLOSED">Closed</option>
                                    </select>
                                </div>
                            </div>

                            <div
                                className="text-xs p-3 rounded"
                                style={{
                                    background: "hsl(var(--secondary))",
                                    color: "hsl(var(--muted-foreground))",
                                }}
                            >
                                <strong>Note:</strong> Setting status to ACTIVE will automatically deactivate all other periods.
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="btn btn-primary flex-1"
                                >
                                    {isSubmitting ? "Saving..." : editingPeriod ? "Update Period" : "Create Period"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
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
