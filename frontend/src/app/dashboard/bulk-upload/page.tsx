"use client";

import { useState, useEffect, useRef } from "react";
import { bulkApi } from "@/lib/api";
import { useBulkUploadStore } from "@/stores/bulk-upload.store";

export default function BulkUploadPage() {
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);
    const { activeJob, setActiveJob, isPolling, setIsPolling, updateJobProgress } = useBulkUploadStore();
    const [jobs, setJobs] = useState<any[]>([]);

    // Load job history
    useEffect(() => {
        bulkApi.listJobs().then((res) => setJobs(res.data.data || [])).catch(() => { });
    }, [activeJob]);

    // Polling for active job
    useEffect(() => {
        if (!activeJob || !isPolling) return;
        if (activeJob.status === "COMPLETED" || activeJob.status === "FAILED") {
            setIsPolling(false);
            return;
        }

        const interval = setInterval(async () => {
            try {
                const { data } = await bulkApi.getJobStatus(activeJob.jobId);
                updateJobProgress(data);
                if (data.status === "COMPLETED" || data.status === "FAILED") {
                    setIsPolling(false);
                    clearInterval(interval);
                }
            } catch {
                clearInterval(interval);
                setIsPolling(false);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [activeJob?.jobId, isPolling, setIsPolling, updateJobProgress, activeJob]);

    const handleUpload = async (file: File) => {
        if (!file.name.endsWith(".xlsx")) {
            setError("Only .xlsx files are accepted.");
            return;
        }

        setUploading(true);
        setError("");

        try {
            const { data } = await bulkApi.upload(file);
            setActiveJob({
                jobId: data.job_id,
                status: data.status,
                filename: file.name,
                totalRows: 0,
                successRows: 0,
                failedRows: 0,
                errorLogUrl: null,
                progress: 0,
            });
            setIsPolling(true);
        } catch (err: any) {
            setError(err.response?.data?.message || "Upload failed.");
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files[0]) handleUpload(e.dataTransfer.files[0]);
    };

    const downloadTemplate = async () => {
        try {
            const response = await bulkApi.downloadTemplate();
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const a = document.createElement("a");
            a.href = url;
            a.download = "bulk_user_template.xlsx";
            a.click();
            window.URL.revokeObjectURL(url);
        } catch {
            setError("Failed to download template");
        }
    };

    const downloadErrorLog = async (jobId: string) => {
        try {
            const response = await bulkApi.downloadErrorLog(jobId);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const a = document.createElement("a");
            a.href = url;
            a.download = `error_log_${jobId}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch {
            setError("Failed to download error log");
        }
    };

    const getStatusBadge = (status: string) => {
        const lower = status.toLowerCase();
        return <span className={`badge badge-${lower}`}>{status}</span>;
    };

    return (
        <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: "hsl(var(--foreground))" }}>
                        Bulk User Upload
                    </h1>
                    <p className="mt-1 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                        Import thousands of users via Excel (.xlsx)
                    </p>
                </div>
                <button onClick={downloadTemplate} className="btn btn-secondary">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Template
                </button>
            </div>

            {error && (
                <div className="p-3 rounded-lg text-sm mb-4 animate-fade-in" style={{
                    background: "hsla(0, 62.8%, 50.6%, 0.15)", color: "hsl(0, 72%, 65%)", border: "1px solid hsla(0, 62.8%, 50.6%, 0.3)"
                }}>
                    {error}
                </div>
            )}

            {/* Upload Zone */}
            <div
                className={`glass-card p-8 text-center mb-6 transition-all duration-200 cursor-pointer ${dragActive ? "animate-pulse-glow" : ""
                    }`}
                style={{
                    border: dragActive
                        ? "2px dashed hsl(217.2, 91.2%, 59.8%)"
                        : "2px dashed hsla(217.2, 32.6%, 30%, 0.5)",
                }}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
            >
                <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                />
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-primary flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                </div>
                <p className="text-base font-medium" style={{ color: "hsl(var(--foreground))" }}>
                    {uploading ? "Uploading..." : "Drop your Excel file here, or click to browse"}
                </p>
                <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                    Only .xlsx files are accepted
                </p>
            </div>

            {/* Active Job Progress */}
            {activeJob && (
                <div className="glass-card p-6 mb-6 animate-slide-up">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h3 className="font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                                {activeJob.filename}
                            </h3>
                            <p className="text-sm mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                                Job ID: {activeJob.jobId.substring(0, 8)}...
                            </p>
                        </div>
                        {getStatusBadge(activeJob.status)}
                    </div>

                    {/* Progress Bar */}
                    <div className="progress-bar mb-3">
                        <div
                            className="progress-bar-fill"
                            style={{
                                width: `${activeJob.progress}%`,
                                background:
                                    activeJob.status === "FAILED"
                                        ? "hsl(0, 62.8%, 50.6%)"
                                        : activeJob.status === "COMPLETED"
                                            ? "hsl(142, 76%, 36%)"
                                            : "hsl(217.2, 91.2%, 59.8%)",
                            }}
                        />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <div className="flex gap-4">
                            <span style={{ color: "hsl(142, 76%, 46%)" }}>
                                ✓ {activeJob.successRows} success
                            </span>
                            {activeJob.failedRows > 0 && (
                                <span style={{ color: "hsl(0, 72%, 55%)" }}>
                                    ✗ {activeJob.failedRows} failed
                                </span>
                            )}
                            <span style={{ color: "hsl(var(--muted-foreground))" }}>
                                Total: {activeJob.totalRows}
                            </span>
                        </div>
                        <span className="font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                            {activeJob.progress}%
                        </span>
                    </div>

                    {activeJob.status === "COMPLETED" && activeJob.failedRows > 0 && (
                        <button
                            onClick={() => downloadErrorLog(activeJob.jobId)}
                            className="btn btn-danger mt-4"
                            style={{ fontWeight: 600 }}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                            </svg>
                            Download Error Log ({activeJob.failedRows} rows)
                        </button>
                    )}
                </div>
            )}

            {/* Job History */}
            <div className="glass-card overflow-hidden">
                <div className="p-4 border-b" style={{ borderColor: "hsla(217.2, 32.6%, 20%, 0.5)" }}>
                    <h3 className="font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                        Upload History
                    </h3>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Job ID</th>
                            <th>Filename</th>
                            <th>Status</th>
                            <th>Total</th>
                            <th>Success</th>
                            <th>Failed</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {jobs.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>
                                    No upload jobs yet. Upload your first Excel file above.
                                </td>
                            </tr>
                        ) : (
                            jobs.map((job: any) => (
                                <tr key={job.jobId}>
                                    <td className="font-mono text-xs">{job.jobId.substring(0, 8)}...</td>
                                    <td>{job.filename}</td>
                                    <td>{getStatusBadge(job.status)}</td>
                                    <td>{job.totalRows}</td>
                                    <td style={{ color: "hsl(142, 76%, 46%)" }}>{job.successRows}</td>
                                    <td style={{ color: job.failedRows > 0 ? "hsl(0, 72%, 55%)" : "inherit" }}>
                                        {job.failedRows}
                                    </td>
                                    <td>
                                        {job.errorLogUrl && (
                                            <button
                                                onClick={() => downloadErrorLog(job.jobId)}
                                                className="text-xs font-semibold px-2 py-1 rounded"
                                                style={{ color: "hsl(0, 72%, 55%)", background: "hsla(0, 62.8%, 50.6%, 0.15)" }}
                                            >
                                                Error Log
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
