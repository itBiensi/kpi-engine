"use client";

import { useState, useEffect } from "react";
import { kpiApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import PeriodSelector from "@/components/PeriodSelector";
import StatusBadge from "@/components/StatusBadge";
import WorkflowActions from "@/components/WorkflowActions";

type PolarityType = "MAX" | "MIN" | "BINARY";

interface KpiDetailInput {
    title: string;
    definition: string;
    polarity: PolarityType;
    weight: number;
    targetValue: number;
    unit?: string;
}

export default function KpiPlansPage() {
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'ADMIN';
    const [plans, setPlans] = useState<any[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState<any>(null);
    const [periodId, setPeriodId] = useState(new Date().getFullYear() * 100 + (new Date().getMonth() + 1));
    const [details, setDetails] = useState<KpiDetailInput[]>([
        { title: "", definition: "", polarity: "MAX", weight: 0, targetValue: 0, unit: "" },
    ]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Filter states
    const [filters, setFilters] = useState({
        employee: "",
        department: "",
        status: "",
        grade: "",
    });

    // Check if forms should be read-only based on period status
    const isReadOnly = selectedPeriod && (selectedPeriod.status === 'LOCKED' || selectedPeriod.status === 'CLOSED');

    const totalWeight = details.reduce((sum, d) => sum + (d.weight || 0), 0);
    const isWeightValid = Math.abs(totalWeight - 100) < 0.01;

    useEffect(() => {
        loadPlans();
    }, []);

    const loadPlans = async () => {
        try {
            const { data } = await kpiApi.listPlans();
            setPlans(data.data || []);
        } catch { }
    };

    const addDetail = () => {
        setDetails([...details, { title: "", definition: "", polarity: "MAX", weight: 0, targetValue: 0, unit: "" }]);
    };

    const removeDetail = (index: number) => {
        setDetails(details.filter((_, i) => i !== index));
    };

    const updateDetail = (index: number, field: keyof KpiDetailInput, value: any) => {
        const updated = [...details];
        (updated[index] as any)[field] = value;
        setDetails(updated);
    };

    const handleSubmit = async () => {
        if (!selectedPeriod || !periodId) {
            setError("Please select a period first");
            return;
        }

        if (!isWeightValid) {
            setError(`Total weight must be exactly 100%. Current: ${totalWeight}%`);
            return;
        }

        setLoading(true);
        setError("");

        try {
            await kpiApi.createPlan({
                userId: user?.id || 1,
                periodId,
                details: details.map((d) => ({
                    title: d.title,
                    definition: d.definition || undefined,
                    polarity: d.polarity,
                    weight: d.weight,
                    targetValue: d.targetValue,
                    unit: d.unit || undefined,
                })),
            });
            setShowCreate(false);
            setDetails([{ title: "", definition: "", polarity: "MAX", weight: 0, targetValue: 0, unit: "" }]);
            loadPlans();
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to create plan");
        } finally {
            setLoading(false);
        }
    };

    const submitPlan = async (planId: number) => {
        try {
            await kpiApi.submitPlan(planId);
            loadPlans();
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to submit plan");
        }
    };

    const approvePlan = async (planId: number) => {
        try {
            await kpiApi.approvePlan(planId);
            loadPlans();
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to approve plan");
        }
    };

    const handleDeleteAll = async () => {
        setIsDeleting(true);
        setError("");

        try {
            await kpiApi.deleteAll();
            setShowDeleteConfirm(false);
            loadPlans();
            alert("All KPI data has been deleted successfully!");
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to delete KPI data");
        } finally {
            setIsDeleting(false);
        }
    };

    const getGradeBadge = (grade: string | null) => {
        if (!grade) return null;
        const colors: Record<string, string> = {
            A: "142, 76%, 46%",
            B: "160, 84%, 39%",
            C: "38, 92%, 50%",
            D: "25, 95%, 53%",
            E: "0, 72%, 55%",
        };
        const c = colors[grade] || "215, 20.2%, 60%";
        return (
            <span
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold"
                style={{ background: `hsla(${c}, 0.15)`, color: `hsl(${c})` }}
            >
                {grade}
            </span>
        );
    };

    const handlePeriodChange = (period: any) => {
        setSelectedPeriod(period);
        if (period) {
            setPeriodId(period.id);
            // Reload plans for the new period
            loadPlans();
        }
    };

    // Filter plans based on selected filters
    const filteredPlans = plans.filter((plan) => {
        if (filters.employee && !plan.user?.fullName.toLowerCase().includes(filters.employee.toLowerCase())) {
            return false;
        }
        if (filters.department && !plan.user?.deptCode?.toLowerCase().includes(filters.department.toLowerCase())) {
            return false;
        }
        if (filters.status && plan.status !== filters.status) {
            return false;
        }
        if (filters.grade && plan.finalGrade !== filters.grade) {
            return false;
        }
        return true;
    });

    const handleResetFilters = () => {
        setFilters({
            employee: "",
            department: "",
            status: "",
            grade: "",
        });
    };

    return (
        <div className="animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: "hsl(var(--foreground))" }}>KPI Plans</h1>
                    <p className="mt-1 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                        Create and manage performance targets
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowCreate(!showCreate)}
                        disabled={isReadOnly}
                        className="btn btn-primary"
                        style={isReadOnly ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New KPI Plan
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="btn text-sm"
                            style={{
                                background: "hsla(0, 62.8%, 50.6%, 0.15)",
                                color: "hsl(0, 72%, 65%)",
                                border: "1px solid hsla(0, 62.8%, 50.6%, 0.3)"
                            }}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Clean All Data
                        </button>
                    )}
                </div>
            </div>

            {/* Period Selector */}
            <PeriodSelector
                onPeriodChange={handlePeriodChange}
                selectedPeriodId={periodId}
            />

            {/* Filters */}
            <div className="glass-card p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                        Filters
                    </h3>
                    <button
                        onClick={handleResetFilters}
                        className="text-xs px-2 py-1 rounded"
                        style={{
                            color: "hsl(var(--muted-foreground))",
                            background: "hsla(217.2, 32.6%, 17.5%, 0.5)"
                        }}
                    >
                        Reset All
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                            Employee
                        </label>
                        <input
                            type="text"
                            placeholder="Search by name..."
                            value={filters.employee}
                            onChange={(e) => setFilters({ ...filters, employee: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg text-sm"
                            style={{
                                background: "hsla(217.2, 32.6%, 17.5%, 0.5)",
                                border: "1px solid hsla(217.2, 32.6%, 25%, 0.3)",
                                color: "hsl(var(--foreground))"
                            }}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                            Department
                        </label>
                        <input
                            type="text"
                            placeholder="Search department..."
                            value={filters.department}
                            onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg text-sm"
                            style={{
                                background: "hsla(217.2, 32.6%, 17.5%, 0.5)",
                                border: "1px solid hsla(217.2, 32.6%, 25%, 0.3)",
                                color: "hsl(var(--foreground))"
                            }}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                            Status
                        </label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg text-sm"
                            style={{
                                background: "hsla(217.2, 32.6%, 17.5%, 0.5)",
                                border: "1px solid hsla(217.2, 32.6%, 25%, 0.3)",
                                color: "hsl(var(--foreground))"
                            }}
                        >
                            <option value="">All Statuses</option>
                            <option value="DRAFT">Draft</option>
                            <option value="SUBMITTED">Submitted</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                            <option value="LOCKED">Locked</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                            Grade
                        </label>
                        <select
                            value={filters.grade}
                            onChange={(e) => setFilters({ ...filters, grade: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg text-sm"
                            style={{
                                background: "hsla(217.2, 32.6%, 17.5%, 0.5)",
                                border: "1px solid hsla(217.2, 32.6%, 25%, 0.3)",
                                color: "hsl(var(--foreground))"
                            }}
                        >
                            <option value="">All Grades</option>
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="D">D</option>
                            <option value="E">E</option>
                        </select>
                    </div>
                </div>
                <div className="mt-2 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                    Showing {filteredPlans.length} of {plans.length} plans
                </div>
            </div>

            {error && (
                <div className="p-3 rounded-lg text-sm mb-4 animate-fade-in" style={{
                    background: "hsla(0, 62.8%, 50.6%, 0.15)", color: "hsl(0, 72%, 65%)", border: "1px solid hsla(0, 62.8%, 50.6%, 0.3)"
                }}>
                    {error}
                    <button onClick={() => setError("")} className="ml-2 font-bold">×</button>
                </div>
            )}

            {isReadOnly && (
                <div className="p-4 rounded-lg text-sm mb-4 animate-fade-in" style={{
                    background: "hsl(45, 93%, 47%, 0.1)",
                    color: "hsl(45, 93%, 47%)",
                    border: "1px solid hsl(45, 93%, 47%, 0.3)"
                }}>
                    🔒 <strong>Read-Only Mode:</strong> This period is {selectedPeriod?.status.toLowerCase()}.
                    You cannot create or modify KPI plans.
                </div>
            )}

            {/* Create Plan Form */}
            {showCreate && (
                <div className="glass-card p-6 mb-6 animate-slide-up">
                    <h3 className="text-lg font-semibold mb-4" style={{ color: "hsl(var(--foreground))" }}>
                        Create New KPI Plan
                    </h3>

                    {/* Show selected period */}
                    <div className="mb-4 p-3 rounded-lg" style={{ background: "hsla(217.2, 32.6%, 17.5%, 0.5)", border: "1px solid hsla(217.2, 32.6%, 25%, 0.3)" }}>
                        <div className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                            <strong>Selected Period:</strong> {selectedPeriod?.name || 'No period selected'}
                        </div>
                        <div className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.7 }}>
                            {selectedPeriod ? `${new Date(selectedPeriod.startDate).toLocaleDateString()} - ${new Date(selectedPeriod.endDate).toLocaleDateString()}` : 'Please select a period above'}
                        </div>
                    </div>

                    {/* Weight Indicator */}
                    <div className="mb-4 p-3 rounded-lg" style={{ background: "hsla(217.2, 32.6%, 17.5%, 0.5)" }}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
                                Total Weight
                            </span>
                            <span
                                className="text-sm font-bold"
                                style={{ color: isWeightValid ? "hsl(142, 76%, 46%)" : "hsl(0, 72%, 55%)" }}
                            >
                                {totalWeight}% / 100%
                            </span>
                        </div>
                        <div className="progress-bar">
                            <div
                                className="progress-bar-fill"
                                style={{
                                    width: `${Math.min(totalWeight, 100)}%`,
                                    background: isWeightValid
                                        ? "hsl(142, 76%, 36%)"
                                        : totalWeight > 100
                                            ? "hsl(0, 62.8%, 50.6%)"
                                            : "hsl(38, 92%, 50%)",
                                }}
                            />
                        </div>
                    </div>

                    {/* KPI Items */}
                    <div className="space-y-3 mb-4">
                        {details.map((detail, i) => (
                            <div
                                key={i}
                                className="p-4 rounded-lg flex flex-wrap gap-3 items-end"
                                style={{ background: "hsl(var(--card))", border: "1px solid hsla(217.2, 32.6%, 25%, 0.3)" }}
                            >
                                <div className="w-full">
                                    <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                                        Title
                                    </label>
                                    <input
                                        value={detail.title}
                                        onChange={(e) => updateDetail(i, "title", e.target.value)}
                                        placeholder="e.g., Sales Revenue"
                                        className="w-full text-sm"
                                    />
                                </div>
                                <div className="w-full">
                                    <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                                        Definition (Optional)
                                    </label>
                                    <textarea
                                        value={detail.definition}
                                        onChange={(e) => updateDetail(i, "definition", e.target.value)}
                                        placeholder="Describe how this KPI is measured and calculated..."
                                        rows={2}
                                        className="w-full text-sm"
                                        style={{
                                            resize: "vertical",
                                            minHeight: "60px"
                                        }}
                                    />
                                </div>
                                <div className="w-28">
                                    <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                                        Polarity
                                    </label>
                                    <select
                                        value={detail.polarity}
                                        onChange={(e) => updateDetail(i, "polarity", e.target.value)}
                                        className="w-full text-sm"
                                    >
                                        <option value="MAX">MAXIMIZE ↑</option>
                                        <option value="MIN">MINIMIZE ↓</option>
                                        <option value="BINARY">BINARY ◯</option>
                                    </select>
                                </div>
                                <div className="w-20">
                                    <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                                        Weight %
                                    </label>
                                    <input
                                        type="number"
                                        value={detail.weight || ""}
                                        onChange={(e) => updateDetail(i, "weight", parseFloat(e.target.value) || 0)}
                                        className="w-full text-sm"
                                        min={0}
                                        max={100}
                                    />
                                </div>
                                <div className="w-28">
                                    <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                                        Target
                                    </label>
                                    <input
                                        type="number"
                                        value={detail.targetValue || ""}
                                        onChange={(e) => updateDetail(i, "targetValue", parseFloat(e.target.value) || 0)}
                                        className="w-full text-sm"
                                    />
                                </div>
                                <div className="w-28">
                                    <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                                        Unit
                                    </label>
                                    <input
                                        type="text"
                                        value={detail.unit || ""}
                                        onChange={(e) => updateDetail(i, "unit", e.target.value)}
                                        className="w-full text-sm"
                                        placeholder="%, hours, etc"
                                        maxLength={20}
                                    />
                                </div>
                                <button
                                    onClick={() => removeDetail(i)}
                                    className="p-2 rounded-lg transition-colors"
                                    style={{ color: "hsl(0, 72%, 55%)" }}
                                    title="Remove item"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={addDetail} className="btn btn-secondary text-sm">
                            + Add KPI Item
                        </button>
                        <div className="flex-1" />
                        <button onClick={() => setShowCreate(false)} className="btn btn-secondary text-sm">
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!isWeightValid || loading || details.some((d) => !d.title)}
                            className="btn btn-primary text-sm"
                        >
                            {loading ? "Saving..." : "Save KPI Plan"}
                        </button>
                    </div>

                    {!isWeightValid && totalWeight > 0 && (
                        <p className="text-xs mt-2" style={{ color: "hsl(0, 72%, 55%)" }}>
                            ⚠ Total weight must be exactly 100% to save. Currently: {totalWeight}%
                        </p>
                    )}
                </div>
            )}

            {/* Plans List */}
            <div className="glass-card overflow-hidden overflow-x-auto">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Period</th>
                            <th>Employee</th>
                            <th>Department</th>
                            <th>Status</th>
                            <th>Items</th>
                            <th>Score</th>
                            <th>Grade</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPlans.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>
                                    {plans.length === 0
                                        ? "No KPI plans yet. Create your first plan above."
                                        : "No plans match the selected filters. Try adjusting your filters."}
                                </td>
                            </tr>
                        ) : (
                            filteredPlans.map((plan: any) => (
                                <tr key={plan.id}>
                                    <td className="font-mono">{plan.periodId}</td>
                                    <td>{plan.user?.fullName}</td>
                                    <td>{plan.user?.deptCode || "—"}</td>
                                    <td>
                                        <StatusBadge status={plan.status} size="sm" />
                                    </td>
                                    <td>{plan.details?.length || 0}</td>
                                    <td>
                                        <span
                                            className={
                                                Number(plan.totalScore) > 75
                                                    ? "score-excellent"
                                                    : Number(plan.totalScore) > 50
                                                        ? "score-good"
                                                        : "score-poor"
                                            }
                                            style={{ fontWeight: 700 }}
                                        >
                                            {Number(plan.totalScore).toFixed(1)}
                                        </span>
                                    </td>
                                    <td>{getGradeBadge(plan.finalGrade)}</td>
                                    <td>
                                        <div className="flex gap-1">
                                            {plan.status === "DRAFT" && (
                                                <button onClick={() => submitPlan(plan.id)} className="btn btn-primary text-xs py-1 px-2">
                                                    Submit
                                                </button>
                                            )}
                                            {plan.status === "SUBMITTED" && (
                                                <button onClick={() => approvePlan(plan.id)} className="btn btn-success text-xs py-1 px-2">
                                                    Approve
                                                </button>
                                            )}
                                            <a
                                                href={`/dashboard/achievements?planId=${plan.id}`}
                                                className="btn btn-secondary text-xs py-1 px-2"
                                            >
                                                View
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: "rgba(0, 0, 0, 0.7)" }}
                    onClick={() => setShowDeleteConfirm(false)}
                >
                    <div
                        className="glass-card w-full max-w-md p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "hsla(0, 62.8%, 50.6%, 0.15)" }}>
                                <svg className="w-6 h-6" fill="none" stroke="hsl(0, 72%, 65%)" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold" style={{ color: "hsl(var(--foreground))" }}>Delete All KPI Data?</h2>
                                <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>This action cannot be undone</p>
                            </div>
                        </div>

                        <div className="mb-6 p-4 rounded-lg" style={{ background: "hsla(0, 62.8%, 50.6%, 0.1)", border: "1px solid hsla(0, 62.8%, 50.6%, 0.3)" }}>
                            <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                                This will permanently delete:
                            </p>
                            <ul className="mt-2 text-sm space-y-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                                <li>• All KPI plans</li>
                                <li>• All KPI items and achievements</li>
                                <li>• All scoring data</li>
                            </ul>
                            <p className="mt-3 text-sm font-semibold" style={{ color: "hsl(0, 72%, 65%)" }}>
                                ⚠️ This will NOT delete users or bulk upload jobs.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleDeleteAll}
                                disabled={isDeleting}
                                className="btn flex-1"
                                style={{
                                    background: "hsl(0, 62.8%, 50.6%)",
                                    color: "white",
                                    opacity: isDeleting ? 0.6 : 1
                                }}
                            >
                                {isDeleting ? "Deleting..." : "Yes, Delete Everything"}
                            </button>
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="btn btn-secondary"
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
