"use client";

import { useState } from "react";
import { kpiApi } from "@/lib/api";

interface WorkflowActionsProps {
    plan: any;
    currentUserId: number;
    userRole: string;
    onSuccess: () => void;
}

export default function WorkflowActions({ plan, currentUserId, userRole, onSuccess }: WorkflowActionsProps) {
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectComment, setRejectComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const isOwner = plan.userId === currentUserId;
    const isManager = userRole === 'MANAGER' || userRole === 'ADMIN';
    const status = plan.status;

    const handleSubmit = async () => {
        if (!confirm("Are you sure you want to submit this KPI plan for approval?")) return;

        setIsSubmitting(true);
        setError("");
        try {
            await kpiApi.submitPlan(plan.id);
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to submit plan");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm("Are you sure you want to cancel the submission?")) return;

        setIsSubmitting(true);
        setError("");
        try {
            await kpiApi.cancelSubmission(plan.id);
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to cancel submission");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApprove = async () => {
        if (!confirm("Are you sure you want to approve this KPI plan?")) return;

        setIsSubmitting(true);
        setError("");
        try {
            await kpiApi.approvePlan(plan.id);
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to approve plan");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!rejectComment.trim()) {
            setError("Rejection comment is required");
            return;
        }

        setIsSubmitting(true);
        setError("");
        try {
            await kpiApi.rejectPlan(plan.id, rejectComment);
            setShowRejectModal(false);
            setRejectComment("");
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to reject plan");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className="flex gap-2 flex-wrap">
                {/* Employee Actions */}
                {isOwner && (status === 'DRAFT' || status === 'REJECTED') && (
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="btn btn-primary"
                    >
                        {isSubmitting ? "Submitting..." : "Submit for Approval"}
                    </button>
                )}

                {isOwner && status === 'SUBMITTED' && (
                    <button
                        onClick={handleCancel}
                        disabled={isSubmitting}
                        className="btn btn-secondary"
                    >
                        {isSubmitting ? "Cancelling..." : "Cancel Submission"}
                    </button>
                )}

                {/* Manager Actions */}
                {isManager && status === 'SUBMITTED' && (
                    <>
                        <button
                            onClick={handleApprove}
                            disabled={isSubmitting}
                            className="btn"
                            style={{
                                background: "hsl(142, 76%, 46%, 0.15)",
                                color: "hsl(142, 76%, 46%)",
                                border: "1px solid hsl(142, 76%, 46%, 0.3)",
                            }}
                        >
                            {isSubmitting ? "Approving..." : "✓ Approve"}
                        </button>
                        <button
                            onClick={() => setShowRejectModal(true)}
                            disabled={isSubmitting}
                            className="btn"
                            style={{
                                background: "hsl(0, 72%, 55%, 0.15)",
                                color: "hsl(0, 72%, 55%)",
                                border: "1px solid hsl(0, 72%, 55%, 0.3)",
                            }}
                        >
                            ✗ Reject
                        </button>
                    </>
                )}
            </div>

            {error && (
                <div
                    className="mt-4 p-3 rounded text-sm"
                    style={{
                        background: "hsl(0, 72%, 55%, 0.1)",
                        border: "1px solid hsl(0, 72%, 55%)",
                        color: "hsl(0, 72%, 55%)",
                    }}
                >
                    {error}
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: "rgba(0, 0, 0, 0.7)" }}
                    onClick={() => setShowRejectModal(false)}
                >
                    <div
                        className="glass-card w-full max-w-md p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold" style={{ color: "hsl(var(--foreground))" }}>
                                Reject KPI Plan
                            </h2>
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="text-2xl"
                                style={{ color: "hsl(var(--muted-foreground))" }}
                            >
                                ×
                            </button>
                        </div>

                        <p className="text-sm mb-4" style={{ color: "hsl(var(--muted-foreground))" }}>
                            Please provide a reason for rejecting this KPI plan. The employee will see this comment.
                        </p>

                        <textarea
                            value={rejectComment}
                            onChange={(e) => setRejectComment(e.target.value)}
                            placeholder="Enter rejection reason..."
                            rows={4}
                            className="w-full"
                            style={{
                                background: "hsl(var(--secondary))",
                                color: "hsl(var(--foreground))",
                                border: "1px solid hsl(var(--border))",
                                padding: "0.75rem",
                                borderRadius: "0.5rem",
                                resize: "vertical",
                            }}
                        />

                        {error && (
                            <div
                                className="mt-3 p-2 rounded text-sm"
                                style={{
                                    background: "hsl(0, 72%, 55%, 0.1)",
                                    color: "hsl(0, 72%, 55%)",
                                }}
                            >
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleReject}
                                disabled={isSubmitting || !rejectComment.trim()}
                                className="btn btn-primary flex-1"
                                style={{
                                    background: "hsl(0, 72%, 55%)",
                                    opacity: !rejectComment.trim() ? 0.5 : 1,
                                }}
                            >
                                {isSubmitting ? "Rejecting..." : "Reject Plan"}
                            </button>
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
