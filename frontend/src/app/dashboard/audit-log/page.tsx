'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { auditApi } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface AuditLog {
    id: number;
    action: string;
    userId: number | null;
    user?: {
        id: number;
        fullName: string;
        email: string;
    };
    resourceType: string | null;
    resourceId: number | null;
    details: any;
    ipAddress: string | null;
    userAgent: string | null;
    timestamp: string;
}

export default function AuditLogPage() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        page: 1,
        limit: 50,
        action: '',
        userId: '',
        resourceType: '',
        startDate: '',
        endDate: '',
    });
    const [expandedRow, setExpandedRow] = useState<number | null>(null);

    // Check if user is admin
    useEffect(() => {
        if (user && user.role !== 'ADMIN') {
            router.push('/dashboard');
        }
    }, [user, router]);

    useEffect(() => {
        if (user?.role === 'ADMIN') {
            fetchLogs();
        }
    }, [filters.page, filters.limit]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const params: any = {
                page: filters.page,
                limit: filters.limit,
            };
            if (filters.action) params.action = filters.action;
            if (filters.userId) params.userId = parseInt(filters.userId);
            if (filters.resourceType) params.resourceType = filters.resourceType;
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;

            const { data } = await auditApi.getLogs(params);
            setLogs(data.logs);
            setTotal(data.total);
        } catch (error: any) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setFilters({ ...filters, page: 1 });
        fetchLogs();
    };

    const handleReset = () => {
        setFilters({
            page: 1,
            limit: 50,
            action: '',
            userId: '',
            resourceType: '',
            startDate: '',
            endDate: '',
        });
    };

    const totalPages = Math.ceil(total / filters.limit);

    if (user?.role !== 'ADMIN') {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700">Access Denied: This page is only accessible to administrators.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Audit Trail Activity Log</h1>

            {/* Filters Section */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <h2 className="text-lg font-semibold mb-4">Filters</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                        <select
                            value={filters.action}
                            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                            <option value="">All Actions</option>
                            <option value="LOGIN_SUCCESS">Login Success</option>
                            <option value="LOGIN_FAILURE">Login Failure</option>
                            <option value="PASSWORD_UPDATED">Password Updated</option>
                            <option value="PASSWORD_RESET">Password Reset</option>
                            <option value="USER_CREATED">User Created</option>
                            <option value="USER_UPDATED">User Updated</option>
                            <option value="KPI_CREATED">KPI Created</option>
                            <option value="KPI_SUBMITTED">KPI Submitted</option>
                            <option value="KPI_APPROVED">KPI Approved</option>
                            <option value="KPI_REJECTED">KPI Rejected</option>
                            <option value="KPI_ACHIEVEMENT_UPDATED">Achievement Updated</option>
                            <option value="PERIOD_CREATED">Period Created</option>
                            <option value="BULK_IMPORT_STARTED">Bulk Import Started</option>
                            <option value="BULK_IMPORT_COMPLETED">Bulk Import Completed</option>
                            <option value="EXPORT_TRIGGERED">Export Triggered</option>
                            <option value="EXPORT_COMPLETED">Export Completed</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Resource Type</label>
                        <select
                            value={filters.resourceType}
                            onChange={(e) => setFilters({ ...filters, resourceType: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                            <option value="">All Types</option>
                            <option value="User">User</option>
                            <option value="KpiHeader">KPI Header</option>
                            <option value="KpiDetail">KPI Detail</option>
                            <option value="Period">Period</option>
                            <option value="BulkImportJob">Bulk Import Job</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                        <input
                            type="number"
                            value={filters.userId}
                            onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                            placeholder="Filter by user ID"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>

                    <div className="flex items-end gap-2">
                        <button
                            onClick={handleSearch}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Search
                        </button>
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <p className="text-sm text-gray-600">
                    Showing <span className="font-semibold">{logs.length}</span> of{' '}
                    <span className="font-semibold">{total}</span> total audit logs
                </p>
            </div>

            {/* Audit Log Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <p className="text-gray-500">Loading audit logs...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-gray-500">No audit logs found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        ID
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Timestamp
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Action
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Resource
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        IP Address
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Details
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {logs.map((log) => (
                                    <React.Fragment key={log.id}>
                                        <tr className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {log.id}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {log.user ? (
                                                    <div>
                                                        <div className="font-medium">{log.user.fullName}</div>
                                                        <div className="text-gray-500 text-xs">{log.user.email}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic">System</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {log.resourceType ? (
                                                    <div>
                                                        <div>{log.resourceType}</div>
                                                        {log.resourceId && (
                                                            <div className="text-gray-500 text-xs">#{log.resourceId}</div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {log.ipAddress || '—'}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                {log.details ? (
                                                    <button
                                                        onClick={() =>
                                                            setExpandedRow(expandedRow === log.id ? null : log.id)
                                                        }
                                                        className="text-blue-600 hover:text-blue-800"
                                                    >
                                                        {expandedRow === log.id ? 'Hide' : 'View'}
                                                    </button>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </td>
                                        </tr>
                                        {expandedRow === log.id && log.details && (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-4 bg-gray-50">
                                                    <div className="text-sm">
                                                        <div className="font-semibold mb-2">Details:</div>
                                                        <pre className="bg-white p-3 rounded border border-gray-200 overflow-x-auto text-xs">
                                                            {JSON.stringify(log.details, null, 2)}
                                                        </pre>
                                                        {log.userAgent && (
                                                            <div className="mt-2 text-xs text-gray-500">
                                                                <span className="font-semibold">User Agent:</span>{' '}
                                                                {log.userAgent}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {!loading && logs.length > 0 && (
                <div className="mt-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-700">Rows per page:</label>
                        <select
                            value={filters.limit}
                            onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value), page: 1 })}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                        >
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
                            disabled={filters.page === 1}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-700">
                            Page {filters.page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setFilters({ ...filters, page: Math.min(totalPages, filters.page + 1) })}
                            disabled={filters.page >= totalPages}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
