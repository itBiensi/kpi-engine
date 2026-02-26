"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { kpiApi, periodsApi } from "@/lib/api";

interface NineBoxEmployee {
    userId: number;
    fullName: string;
    employeeId: string;
    deptCode: string | null;
    role: string;
    totalScore: number;
    finalGrade: string;
    performanceLevel: "LOW" | "MEDIUM" | "HIGH";
    potentialLevel: "LOW" | "MEDIUM" | "HIGH";
    periodId: number;
    periodName: string;
    planId: number;
    status: string;
}

interface NineBoxData {
    employees: NineBoxEmployee[];
    grid: Record<string, number>;
    total: number;
}

interface Period {
    id: number;
    name: string;
    status: string;
}

// Cell metadata: label, description, color scheme
const CELL_CONFIG: Record<string, { label: string; description: string; bg: string; border: string; text: string; badge: string }> = {
    "HIGH_HIGH": { label: "⭐ Star", description: "Top talent — high performance & high potential", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.4)", text: "#22c55e", badge: "bg-green-100 text-green-800" },
    "HIGH_MEDIUM": { label: "High Performer", description: "Strong results — develop their potential", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.4)", text: "#3b82f6", badge: "bg-blue-100 text-blue-800" },
    "HIGH_LOW": { label: "Enigma", description: "Great results but limited potential signals", bg: "rgba(168,85,247,0.10)", border: "rgba(168,85,247,0.35)", text: "#a855f7", badge: "bg-purple-100 text-purple-800" },
    "MEDIUM_HIGH": { label: "Growth Employee", description: "Promising potential — accelerate development", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.3)", text: "#16a34a", badge: "bg-emerald-100 text-emerald-800" },
    "MEDIUM_MEDIUM": { label: "Core Player", description: "Solid contributor — nurture and retain", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.3)", text: "#2563eb", badge: "bg-sky-100 text-sky-800" },
    "MEDIUM_LOW": { label: "Average Performer", description: "Meets expectations — coach for growth", bg: "rgba(234,179,8,0.10)", border: "rgba(234,179,8,0.35)", text: "#ca8a04", badge: "bg-yellow-100 text-yellow-800" },
    "LOW_HIGH": { label: "Rough Diamond", description: "High potential but underperforming — invest", bg: "rgba(249,115,22,0.10)", border: "rgba(249,115,22,0.35)", text: "#ea580c", badge: "bg-orange-100 text-orange-800" },
    "LOW_MEDIUM": { label: "Inconsistent", description: "Mixed signals — monitor closely", bg: "rgba(234,179,8,0.08)", border: "rgba(234,179,8,0.25)", text: "#a16207", badge: "bg-amber-100 text-amber-800" },
    "LOW_LOW": { label: "Risk", description: "Underperforming — action plan required", bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.35)", text: "#ef4444", badge: "bg-red-100 text-red-800" },
};

const PERF_LEVELS: ("HIGH" | "MEDIUM" | "LOW")[] = ["HIGH", "MEDIUM", "LOW"];
const POT_LEVELS: ("LOW" | "MEDIUM" | "HIGH")[] = ["LOW", "MEDIUM", "HIGH"];

export default function NineBoxPage() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [data, setData] = useState<NineBoxData | null>(null);
    const [periods, setPeriods] = useState<Period[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<number | "">("");
    const [deptFilter, setDeptFilter] = useState("");
    const [loading, setLoading] = useState(true);
    const [hoveredEmployee, setHoveredEmployee] = useState<NineBoxEmployee | null>(null);
    const [selectedCell, setSelectedCell] = useState<string | null>(null);

    // Admin guard
    useEffect(() => {
        if (user && user.role !== "ADMIN") {
            router.push("/dashboard");
        }
    }, [user, router]);

    // Fetch periods for filter
    useEffect(() => {
        const loadPeriods = async () => {
            try {
                const { data: res } = await periodsApi.list();
                setPeriods(res.data || res || []);
            } catch {
                // ignore
            }
        };
        loadPeriods();
    }, []);

    // Fetch nine-box data
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const { data: res } = await kpiApi.getNineBoxData(
                    selectedPeriod ? Number(selectedPeriod) : undefined,
                );
                setData(res);
            } catch {
                // ignore
            } finally {
                setLoading(false);
            }
        };
        if (user?.role === "ADMIN") loadData();
    }, [selectedPeriod, user]);

    // Filter employees by department
    const filteredEmployees = useMemo(() => {
        if (!data) return [];
        if (!deptFilter) return data.employees;
        return data.employees.filter((e) => e.deptCode === deptFilter);
    }, [data, deptFilter]);

    // Unique departments for filter
    const departments = useMemo(() => {
        if (!data) return [];
        return Array.from(new Set(data.employees.map((e) => e.deptCode).filter(Boolean))).sort() as string[];
    }, [data]);

    // Group employees by cell
    const cellEmployees = useMemo(() => {
        const map: Record<string, NineBoxEmployee[]> = {};
        for (const perf of PERF_LEVELS) {
            for (const pot of POT_LEVELS) {
                map[`${perf}_${pot}`] = [];
            }
        }
        filteredEmployees.forEach((e) => {
            const key = `${e.performanceLevel}_${e.potentialLevel}`;
            if (map[key]) map[key].push(e);
        });
        return map;
    }, [filteredEmployees]);

    // Grid summary counts
    const gridCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const key in cellEmployees) {
            counts[key] = cellEmployees[key].length;
        }
        return counts;
    }, [cellEmployees]);

    if (user?.role !== "ADMIN") return null;

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold" style={{ color: "hsl(var(--foreground))" }}>
                    Nine-Box Grid
                </h1>
                <p className="mt-1 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                    Talent management matrix mapping Performance vs Potential across your organization.
                </p>
            </div>

            {/* Filters */}
            <div className="glass-card p-4 mb-6">
                <div className="flex flex-wrap gap-4 items-end">
                    <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                            Period
                        </label>
                        <select
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value ? Number(e.target.value) : "")}
                            className="w-56 px-3 py-2 rounded-lg border text-sm"
                            style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
                        >
                            <option value="">All Periods</option>
                            {periods.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                            Department
                        </label>
                        <select
                            value={deptFilter}
                            onChange={(e) => setDeptFilter(e.target.value)}
                            className="w-48 px-3 py-2 rounded-lg border text-sm"
                            style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
                            aria-label="Filter by department"
                        >
                            <option value="">All Departments</option>
                            {departments.map((d) => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>
                    <div className="ml-auto text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                        {loading ? "Loading..." : `${filteredEmployees.length} employee${filteredEmployees.length !== 1 ? "s" : ""}`}
                    </div>
                </div>
            </div>

            {/* Nine-Box Grid */}
            <div className="glass-card p-6 mb-6">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "hsl(217.2, 91.2%, 59.8%)" }}></div>
                    </div>
                ) : (
                    <div>
                        {/* X-Axis Label */}
                        <div className="text-center mb-3 pl-16">
                            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "hsl(var(--muted-foreground))" }}>
                                Potential →
                            </span>
                        </div>

                        {/* X-Axis Column Headers */}
                        <div className="grid gap-3 mb-2" style={{ gridTemplateColumns: "60px 1fr 1fr 1fr" }}>
                            <div></div>
                            {POT_LEVELS.map((pot) => (
                                <div key={pot} className="text-center text-xs font-semibold uppercase tracking-wide" style={{ color: "hsl(var(--muted-foreground))" }}>
                                    {pot}
                                </div>
                            ))}
                        </div>

                        {/* Grid Rows with Y-axis labels */}
                        {PERF_LEVELS.map((perf) => (
                            <div key={perf} className="grid gap-3 mb-3" style={{ gridTemplateColumns: "60px 1fr 1fr 1fr" }}>
                                {/* Row Label */}
                                <div className="flex items-center justify-center">
                                    <span className="text-[11px] font-bold uppercase tracking-wide text-center leading-tight" style={{ color: "hsl(var(--muted-foreground))" }}>
                                        {perf}
                                    </span>
                                </div>

                                {/* 3 Cells */}
                                {POT_LEVELS.map((pot) => {
                                    const cellKey = `${perf}_${pot}`;
                                    const config = CELL_CONFIG[cellKey];
                                    const employees = cellEmployees[cellKey];
                                    const count = gridCounts[cellKey];
                                    const isSelected = selectedCell === cellKey;

                                    return (
                                        <div
                                            key={cellKey}
                                            onClick={() => setSelectedCell(isSelected ? null : cellKey)}
                                            className={`relative rounded-xl p-4 min-h-[140px] cursor-pointer transition-all duration-300 ${isSelected ? "ring-2 ring-offset-2 scale-[1.02]" : "hover:scale-[1.01]"}`}
                                            style={{
                                                background: config.bg,
                                                border: `1.5px solid ${config.border}`,
                                            }}
                                        >
                                            {/* Cell Header */}
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-bold" style={{ color: config.text }}>
                                                    {config.label}
                                                </span>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${config.badge}`}>
                                                    {count}
                                                </span>
                                            </div>
                                            <p className="text-[10px] mb-3 leading-tight" style={{ color: "hsl(var(--muted-foreground))" }}>
                                                {config.description}
                                            </p>

                                            {/* Employee Chips */}
                                            <div className="flex flex-wrap gap-1.5">
                                                {employees.slice(0, 6).map((emp) => (
                                                    <div
                                                        key={emp.userId}
                                                        className="relative group"
                                                        onMouseEnter={() => setHoveredEmployee(emp)}
                                                        onMouseLeave={() => setHoveredEmployee(null)}
                                                    >
                                                        <div
                                                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm transition-transform group-hover:scale-110"
                                                            style={{
                                                                background: `linear-gradient(135deg, ${config.text}, ${config.border})`,
                                                            }}
                                                            title={`${emp.fullName} — Score: ${emp.totalScore}, Grade: ${emp.finalGrade}`}
                                                        >
                                                            {emp.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                                                        </div>

                                                        {/* Tooltip */}
                                                        {hoveredEmployee?.userId === emp.userId && (
                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 p-3 rounded-lg shadow-xl text-xs animate-fade-in pointer-events-none"
                                                                style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }}
                                                            >
                                                                <div className="font-bold text-sm mb-1">{emp.fullName}</div>
                                                                <div className="space-y-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                                                                    <div>ID: {emp.employeeId}</div>
                                                                    <div>Dept: {emp.deptCode || "—"}</div>
                                                                    <div>Score: <span className="font-semibold" style={{ color: config.text }}>{emp.totalScore}</span></div>
                                                                    <div>Grade: <span className="font-semibold" style={{ color: config.text }}>{emp.finalGrade}</span></div>
                                                                    <div>Status: {emp.status}</div>
                                                                </div>
                                                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2" style={{ background: "hsl(var(--card))", borderRight: "1px solid hsl(var(--border))", borderBottom: "1px solid hsl(var(--border))" }} />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                {employees.length > 6 && (
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-dashed" style={{ borderColor: config.border, color: config.text }}>
                                                        +{employees.length - 6}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}

                        {/* Y-Axis Label */}
                        <div className="text-center mt-2 pl-16">
                            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "hsl(var(--muted-foreground))" }}>
                                ↑ Performance
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Selected Cell Detail Table */}
            {selectedCell && CELL_CONFIG[selectedCell] && (
                <div className="glass-card p-6 animate-slide-up">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-bold" style={{ color: CELL_CONFIG[selectedCell].text }}>
                                {CELL_CONFIG[selectedCell].label}
                                <span className="ml-2 text-sm font-normal" style={{ color: "hsl(var(--muted-foreground))" }}>
                                    ({cellEmployees[selectedCell]?.length || 0} employee{(cellEmployees[selectedCell]?.length || 0) !== 1 ? "s" : ""})
                                </span>
                            </h2>
                            <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                                {CELL_CONFIG[selectedCell].description}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {cellEmployees[selectedCell]?.length > 0 && (
                                <button
                                    onClick={() => {
                                        const emps = cellEmployees[selectedCell];
                                        const headers = ["Employee", "ID", "Department", "Score", "Grade", "Performance", "Potential", "Status"];
                                        const rows = emps.map((e) => [
                                            e.fullName,
                                            e.employeeId,
                                            e.deptCode || "",
                                            e.totalScore,
                                            e.finalGrade,
                                            e.performanceLevel,
                                            e.potentialLevel,
                                            e.status,
                                        ]);
                                        const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
                                        const blob = new Blob([csv], { type: "text/csv" });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement("a");
                                        a.href = url;
                                        a.download = `nine-box-${CELL_CONFIG[selectedCell].label.replace(/[^a-zA-Z]/g, "_")}.csv`;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                    }}
                                    className="text-sm px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5"
                                    style={{ background: "hsl(217.2, 91.2%, 59.8%)", color: "#fff" }}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Download CSV
                                </button>
                            )}
                            <button
                                onClick={() => setSelectedCell(null)}
                                className="text-sm px-3 py-1 rounded-lg transition-colors"
                                style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}
                            >
                                Close
                            </button>
                        </div>
                    </div>

                    {cellEmployees[selectedCell]?.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                                        <th className="text-left py-2 px-3 font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>Employee</th>
                                        <th className="text-left py-2 px-3 font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>ID</th>
                                        <th className="text-left py-2 px-3 font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>Department</th>
                                        <th className="text-center py-2 px-3 font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>Score</th>
                                        <th className="text-center py-2 px-3 font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>Grade</th>
                                        <th className="text-center py-2 px-3 font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>Performance</th>
                                        <th className="text-center py-2 px-3 font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>Potential</th>
                                        <th className="text-center py-2 px-3 font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cellEmployees[selectedCell].map((emp) => (
                                        <tr key={emp.userId} className="transition-colors hover:bg-black/5" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                                            <td className="py-2.5 px-3 font-medium" style={{ color: "hsl(var(--foreground))" }}>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                                                        style={{ background: `linear-gradient(135deg, ${CELL_CONFIG[selectedCell].text}, ${CELL_CONFIG[selectedCell].border})` }}>
                                                        {emp.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                                                    </div>
                                                    {emp.fullName}
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-3" style={{ color: "hsl(var(--muted-foreground))" }}>{emp.employeeId}</td>
                                            <td className="py-2.5 px-3" style={{ color: "hsl(var(--muted-foreground))" }}>{emp.deptCode || "—"}</td>
                                            <td className="py-2.5 px-3 text-center font-bold" style={{ color: CELL_CONFIG[selectedCell].text }}>{emp.totalScore}</td>
                                            <td className="py-2.5 px-3 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${CELL_CONFIG[selectedCell].badge}`}>{emp.finalGrade}</span>
                                            </td>
                                            <td className="py-2.5 px-3 text-center">
                                                <span className="text-xs font-semibold" style={{ color: CELL_CONFIG[selectedCell].text }}>{emp.performanceLevel}</span>
                                            </td>
                                            <td className="py-2.5 px-3 text-center">
                                                <span className="text-xs font-semibold" style={{ color: CELL_CONFIG[selectedCell].text }}>{emp.potentialLevel}</span>
                                            </td>
                                            <td className="py-2.5 px-3 text-center">
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{emp.status}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="py-8 text-center">
                            <svg className="w-12 h-12 mx-auto mb-3" style={{ color: CELL_CONFIG[selectedCell].text, opacity: 0.4 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <p className="text-sm font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
                                No employees in this category yet
                            </p>
                            <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.7 }}>
                                Employees will appear here as KPI plans are created and scored.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Empty State */}
            {!loading && filteredEmployees.length === 0 && (
                <div className="glass-card p-12 text-center">
                    <svg className="w-16 h-16 mx-auto mb-4" style={{ color: "hsl(var(--muted-foreground))" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                    <h3 className="text-lg font-semibold mb-1" style={{ color: "hsl(var(--foreground))" }}>No KPI data available</h3>
                    <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                        Create KPI plans and update achievements to populate the Nine-Box Grid.
                    </p>
                </div>
            )}
        </div>
    );
}
