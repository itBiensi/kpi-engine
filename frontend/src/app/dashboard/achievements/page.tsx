"use client";

import React, { useState, useEffect, Suspense } from "react";
import { kpiApi } from "@/lib/api";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import StatusBadge from "@/components/StatusBadge";
import WorkflowActions from "@/components/WorkflowActions";

// Client-side scoring (mirrors backend for real-time preview)
function calculateScore(polarity: string, weight: number, target: number, actual: number) {
    if (polarity === "MAX" && target === 0) return { pct: 0, score: 0 };

    let pct: number, raw: number;

    switch (polarity) {
        case "MAX":
            pct = (actual / target) * 100;
            raw = (actual / target) * weight;
            break;
        case "MIN":
            if (target === 0) {
                pct = actual === 0 ? 100 : 0;
                raw = actual === 0 ? weight : 0;
            } else {
                pct = ((2 * target - actual) / target) * 100;
                raw = ((2 * target - actual) / target) * weight;
            }
            break;
        case "BINARY":
            pct = actual === target ? 100 : 0;
            raw = actual === target ? weight : 0;
            break;
        default:
            pct = 0;
            raw = 0;
    }

    const floored = Math.max(0, raw);
    const capped = Math.min(floored, weight * 1.2);
    return { pct: Math.round(pct * 100) / 100, score: Math.round(capped * 100) / 100 };
}

function getScoreClass(score: number, weight: number) {
    const ratio = weight > 0 ? (score / weight) * 100 : 0;
    if (ratio >= 75) return "score-excellent";
    if (ratio >= 50) return "score-good";
    return "score-poor";
}

function AchievementsContent() {
    const searchParams = useSearchParams();
    const planIdParam = searchParams.get("planId");
    const { user } = useAuthStore();
    const [plan, setPlan] = useState<any>(null);
    const [plans, setPlans] = useState<any[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState<number | null>(planIdParam ? parseInt(planIdParam) : null);
    const [editValues, setEditValues] = useState<Record<number, { actual: string; evidence: string }>>({});
    const [saving, setSaving] = useState<number | null>(null);
    const [error, setError] = useState("");
    const [commentValues, setCommentValues] = useState<Record<number, string>>({});
    const [commentSaving, setCommentSaving] = useState<number | null>(null);
    const [showCommentFor, setShowCommentFor] = useState<number | null>(null);

    // Check if form is editable based on workflow status
    const isEditable = plan && (plan.status === 'DRAFT' || plan.status === 'REJECTED');

    // Check if user can add comments (manager or admin)
    const canAddComments = user && (user.role === 'MANAGER' || user.role === 'ADMIN');

    // Load plans list
    useEffect(() => {
        kpiApi.listPlans().then(({ data }) => setPlans(data.data || [])).catch(() => { });
    }, []);

    // Load selected plan
    const loadPlanData = () => {
        if (selectedPlanId) {
            kpiApi.getPlan(selectedPlanId).then(({ data }) => {
                setPlan(data);
                const vals: Record<number, { actual: string; evidence: string }> = {};
                const comments: Record<number, string> = {};
                data.details?.forEach((d: any) => {
                    vals[d.id] = { actual: String(d.actualValue || 0), evidence: d.evidenceUrl || "" };
                    comments[d.id] = d.managerComment || "";
                });
                setEditValues(vals);
                setCommentValues(comments);
            }).catch(() => { });
        }
    };

    useEffect(() => {
        loadPlanData();
    }, [selectedPlanId]);

    const handleSave = async (detailId: number) => {
        setSaving(detailId);
        setError("");
        try {
            const vals = editValues[detailId];
            const { data } = await kpiApi.updateAchievement(detailId, {
                actual_value: parseFloat(vals.actual) || 0,
                evidence_url: vals.evidence || undefined,
            });

            // Refresh plan data
            if (selectedPlanId) {
                const { data: updated } = await kpiApi.getPlan(selectedPlanId);
                setPlan(updated);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to save");
        } finally {
            setSaving(null);
        }
    };

    const handleCommentSave = async (detailId: number) => {
        setCommentSaving(detailId);
        setError("");
        try {
            const comment = commentValues[detailId];
            if (!comment || !comment.trim()) {
                setError("Comment cannot be empty");
                return;
            }

            await kpiApi.updateKpiComment(detailId, comment);

            // Refresh plan data
            loadPlanData();
            setShowCommentFor(null);
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to save comment");
        } finally {
            setCommentSaving(null);
        }
    };

    const totalScore = plan?.details?.reduce((sum: number, d: any) => sum + Number(d.finalScore || 0), 0) || 0;
    const roundedTotal = Math.round(totalScore * 100) / 100;

    const getGradeInfo = (score: number) => {
        if (score > 90) return { grade: "A", color: "142, 76%, 46%", label: "Excellent" };
        if (score > 75) return { grade: "B", color: "160, 84%, 39%", label: "Good" };
        if (score > 60) return { grade: "C", color: "38, 92%, 50%", label: "Average" };
        if (score > 50) return { grade: "D", color: "25, 95%, 53%", label: "Below Average" };
        return { grade: "E", color: "0, 72%, 55%", label: "Poor" };
    };

    return (
        <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: "hsl(var(--foreground))" }}>
                        Achievements
                    </h1>
                    <p className="mt-1 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                        Enter actual values and see real-time score calculations
                    </p>
                </div>
                <select
                    value={selectedPlanId || ""}
                    onChange={(e) => setSelectedPlanId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-64"
                >
                    <option value="">Select a KPI Plan...</option>
                    {plans.map((p: any) => (
                        <option key={p.id} value={p.id}>
                            {p.user?.fullName} — Period {p.periodId} ({p.status})
                        </option>
                    ))}
                </select>
            </div>

            {error && (
                <div className="p-3 rounded-lg text-sm mb-4 animate-fade-in" style={{
                    background: "hsla(0, 62.8%, 50.6%, 0.15)", color: "hsl(0, 72%, 65%)", border: "1px solid hsla(0, 62.8%, 50.6%, 0.3)"
                }}>
                    {error}
                </div>
            )}

            {plan && (
                <>
                    {/* Status Badge and Workflow Actions */}
                    <div className="glass-card p-4 mb-6">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
                                    Plan Status:
                                </span>
                                <StatusBadge status={plan.status} size="md" />
                            </div>
                            {user && (
                                <WorkflowActions
                                    plan={plan}
                                    currentUserId={user.id}
                                    userRole={user.role}
                                    onSuccess={loadPlanData}
                                />
                            )}
                        </div>
                    </div>

                    {/* Rejection Alert */}
                    {plan.status === 'REJECTED' && plan.managerComment && (
                        <div className="mb-4 p-4 rounded-lg animate-fade-in" style={{
                            background: "hsl(0, 72%, 55%, 0.1)",
                            border: "2px solid hsl(0, 72%, 55%)",
                            color: "hsl(0, 72%, 55%)"
                        }}>
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <div className="flex-1">
                                    <p className="font-bold mb-1">⚠️ Plan Rejected by Manager</p>
                                    <p className="text-sm">{plan.managerComment}</p>
                                    <p className="text-xs mt-2 opacity-75">
                                        Please review the feedback, make necessary changes, and resubmit.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Read-Only Notice */}
                    {!isEditable && plan.status !== 'REJECTED' && (
                        <div className="mb-4 p-3 rounded-lg text-sm" style={{
                            background: "hsl(200, 98%, 39%, 0.1)",
                            border: "1px solid hsl(200, 98%, 39%, 0.3)",
                            color: "hsl(200, 98%, 39%)"
                        }}>
                            🔒 <strong>Read-Only:</strong> This plan is {plan.status.toLowerCase()} and cannot be edited.
                        </div>
                    )}

                    {/* Score Summary */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="glass-card p-5">
                            <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Total Score</p>
                            <p
                                className={`text-4xl font-bold mt-1 ${roundedTotal > 75 ? "score-excellent" : roundedTotal > 50 ? "score-good" : "score-poor"
                                    }`}
                            >
                                {roundedTotal.toFixed(1)}
                            </p>
                        </div>
                        <div className="glass-card p-5">
                            <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Grade</p>
                            {(() => {
                                const info = getGradeInfo(roundedTotal);
                                return (
                                    <div className="flex items-center gap-3 mt-1">
                                        <span
                                            className="text-4xl font-bold"
                                            style={{ color: `hsl(${info.color})` }}
                                        >
                                            {info.grade}
                                        </span>
                                        <span className="text-sm" style={{ color: `hsl(${info.color})` }}>
                                            {info.label}
                                        </span>
                                    </div>
                                );
                            })()}
                        </div>
                        <div className="glass-card p-5">
                            <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Workflow Status</p>
                            <div className="mt-2">
                                <StatusBadge status={plan.status} size="lg" />
                            </div>
                        </div>
                    </div>

                    {/* Details Table with Real-time Score */}
                    <div className="glass-card overflow-hidden">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>KPI Item</th>
                                    <th>Polarity</th>
                                    <th>Weight</th>
                                    <th>Target</th>
                                    <th>Actual</th>
                                    <th>Achievement %</th>
                                    <th>Score</th>
                                    <th>Evidence</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {plan.details?.map((detail: any) => {
                                    const vals = editValues[detail.id] || { actual: "0", evidence: "" };
                                    const liveCalc = calculateScore(
                                        detail.polarity,
                                        Number(detail.weight),
                                        Number(detail.targetValue),
                                        parseFloat(vals.actual) || 0
                                    );
                                    const isChanged = vals.actual !== String(detail.actualValue || 0);

                                    return (
                                        <React.Fragment key={detail.id}>
                                        <tr>
                                            <td>
                                                <div>
                                                    <p className="font-medium" style={{ color: "hsl(var(--foreground))" }}>{detail.title}</p>
                                                    {detail.definition && (
                                                        <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                                                            {detail.definition}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <span className="badge badge-draft text-xs">
                                                    {detail.polarity === "MAX" ? "↑ MAX" : detail.polarity === "MIN" ? "↓ MIN" : "◯ BIN"}
                                                </span>
                                            </td>
                                            <td className="font-semibold">{Number(detail.weight)}%</td>
                                            <td>{Number(detail.targetValue)}{detail.unit ? ` ${detail.unit}` : ''}</td>
                                            <td>
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="number"
                                                        value={vals.actual}
                                                        onChange={(e) =>
                                                            setEditValues({
                                                                ...editValues,
                                                                [detail.id]: { ...vals, actual: e.target.value },
                                                            })
                                                        }
                                                        disabled={!isEditable}
                                                        className="w-20 text-sm"
                                                        style={{ opacity: isEditable ? 1 : 0.6, cursor: isEditable ? 'text' : 'not-allowed' }}
                                                        step="any"
                                                    />
                                                    {detail.unit && (
                                                        <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                                                            {detail.unit}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <span
                                                    className={getScoreClass(liveCalc.pct, 100)}
                                                    style={{ fontWeight: 600 }}
                                                >
                                                    {liveCalc.pct.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td>
                                                <span
                                                    className={`text-lg font-bold ${getScoreClass(liveCalc.score, Number(detail.weight))}`}
                                                >
                                                    {liveCalc.score.toFixed(2)}
                                                </span>
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    value={vals.evidence}
                                                    onChange={(e) =>
                                                        setEditValues({
                                                            ...editValues,
                                                            [detail.id]: { ...vals, evidence: e.target.value },
                                                        })
                                                    }
                                                    disabled={!isEditable}
                                                    placeholder="URL..."
                                                    className="w-28 text-xs"
                                                    style={{ opacity: isEditable ? 1 : 0.6, cursor: isEditable ? 'text' : 'not-allowed' }}
                                                />
                                            </td>
                                            <td>
                                                <button
                                                    onClick={() => handleSave(detail.id)}
                                                    disabled={saving === detail.id || !isEditable}
                                                    className={`btn text-xs py-1 px-3 ${isChanged && isEditable ? "btn-primary" : "btn-secondary"}`}
                                                    style={{ opacity: isEditable ? 1 : 0.5 }}
                                                >
                                                    {saving === detail.id ? "..." : "Save"}
                                                </button>
                                            </td>
                                        </tr>
                                        {/* Manager Comment Row */}
                                        {(canAddComments || detail.managerComment) && (
                                            <tr>
                                                <td colSpan={9} style={{ padding: "0.5rem 1rem", background: "hsla(217.2, 32.6%, 12%, 0.5)" }}>
                                                    <div className="flex items-start gap-2">
                                                        <span style={{ color: "hsl(45, 93%, 47%)", fontSize: "0.75rem", fontWeight: "500", minWidth: "80px" }}>
                                                            💬 Comment:
                                                        </span>
                                                        <div className="flex-1">
                                                            {showCommentFor === detail.id ? (
                                                                <div className="space-y-2">
                                                                    <textarea
                                                                        value={commentValues[detail.id] || ""}
                                                                        onChange={(e) => setCommentValues({ ...commentValues, [detail.id]: e.target.value })}
                                                                        placeholder="Add feedback for this KPI item..."
                                                                        rows={3}
                                                                        className="w-full text-sm"
                                                                        style={{
                                                                            background: "hsl(var(--secondary))",
                                                                            color: "hsl(var(--foreground))",
                                                                            border: "1px solid hsl(var(--border))",
                                                                            padding: "0.5rem",
                                                                            borderRadius: "0.375rem",
                                                                            resize: "vertical"
                                                                        }}
                                                                    />
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            onClick={() => handleCommentSave(detail.id)}
                                                                            disabled={commentSaving === detail.id}
                                                                            className="btn btn-primary text-xs py-1 px-3"
                                                                        >
                                                                            {commentSaving === detail.id ? "Saving..." : "Save Comment"}
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                setShowCommentFor(null);
                                                                                setCommentValues({ ...commentValues, [detail.id]: detail.managerComment || "" });
                                                                            }}
                                                                            className="btn btn-secondary text-xs py-1 px-3"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : detail.managerComment ? (
                                                                <div className="space-y-1">
                                                                    <p className="text-sm" style={{ color: "hsl(var(--foreground))" }}>
                                                                        {detail.managerComment}
                                                                    </p>
                                                                    {canAddComments && (
                                                                        <button
                                                                            onClick={() => setShowCommentFor(detail.id)}
                                                                            className="text-xs"
                                                                            style={{ color: "hsl(var(--muted-foreground))", textDecoration: "underline" }}
                                                                        >
                                                                            Edit comment
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ) : canAddComments ? (
                                                                <button
                                                                    onClick={() => setShowCommentFor(detail.id)}
                                                                    className="text-xs"
                                                                    style={{ color: "hsl(45, 93%, 47%)", textDecoration: "underline" }}
                                                                >
                                                                    + Add comment
                                                                </button>
                                                            ) : (
                                                                <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))", fontStyle: "italic" }}>
                                                                    No comment
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {!plan && !selectedPlanId && (
                <div className="glass-card p-16 text-center">
                    <svg className="w-16 h-16 mx-auto mb-4" style={{ color: "hsl(var(--muted-foreground))" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p className="text-lg font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
                        Select a KPI Plan to view and update achievements
                    </p>
                </div>
            )}
        </div>
    );
}

export default function AchievementsPage() {
    return (
        <Suspense fallback={
            <div className="animate-fade-in flex items-center justify-center py-20">
                <div className="animate-spin w-8 h-8 border-2 border-transparent rounded-full" style={{ borderTopColor: "hsl(217.2, 91.2%, 59.8%)" }} />
            </div>
        }>
            <AchievementsContent />
        </Suspense>
    );
}
