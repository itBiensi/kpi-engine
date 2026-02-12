"use client";

import { useState, useEffect } from "react";
import { usersApi, authApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";

export default function UsersPage() {
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'ADMIN';
    const [users, setUsers] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        employeeId: "",
        fullName: "",
        email: "",
        deptCode: "",
        role: "EMPLOYEE",
        managerEmployeeId: "",
    });
    const [formError, setFormError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit user state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [editFormData, setEditFormData] = useState({
        fullName: "",
        email: "",
        deptCode: "",
        role: "EMPLOYEE",
        managerEmployeeId: "",
        isActive: true,
    });
    const [editError, setEditError] = useState("");

    // Password reset state
    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
    const [resetPasswordUser, setResetPasswordUser] = useState<any>(null);
    const [resetPasswordForm, setResetPasswordForm] = useState({
        newPassword: "",
        confirmPassword: "",
    });
    const [resetPasswordError, setResetPasswordError] = useState("");
    const [resetPasswordSuccess, setResetPasswordSuccess] = useState("");


    const limit = 15;

    useEffect(() => {
        loadUsers();
    }, [page, search]);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const { data } = await usersApi.list({ page, limit, search: search || undefined });
            setUsers(data.data || []);
            setTotal(data.total || 0);
        } catch {
            // Backend might not be running
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        setIsSubmitting(true);

        try {
            await usersApi.create({
                employeeId: formData.employeeId,
                fullName: formData.fullName,
                email: formData.email,
                deptCode: formData.deptCode || undefined,
                role: formData.role,
                managerEmployeeId: formData.managerEmployeeId || undefined,
            });

            // Success - close modal and refresh
            setShowModal(false);
            setFormData({
                employeeId: "",
                fullName: "",
                email: "",
                deptCode: "",
                role: "EMPLOYEE",
                managerEmployeeId: "",
            });
            loadUsers();
        } catch (error: any) {
            setFormError(error.response?.data?.message || error.message || "Failed to create user");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditUser = async () => {
        if (!editingUser) return;

        setIsSubmitting(true);
        setEditError("");

        try {
            await usersApi.update(editingUser.id, {
                fullName: editFormData.fullName,
                email: editFormData.email,
                deptCode: editFormData.deptCode || undefined,
                role: editFormData.role,
                managerEmployeeId: editFormData.managerEmployeeId || undefined,
                isActive: editFormData.isActive,
            });
            setShowEditModal(false);
            setEditingUser(null);
            loadUsers();
        } catch (err: any) {
            setEditError(err.response?.data?.message || "Failed to update user");
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (user: any) => {
        setEditingUser(user);
        setEditFormData({
            fullName: user.fullName,
            email: user.email,
            deptCode: user.deptCode || "",
            role: user.role,
            managerEmployeeId: user.manager?.employeeId || "",
            isActive: user.isActive,
        });
        setEditError("");
        setShowEditModal(true);
    };

    const openResetPasswordModal = (user: any) => {
        setResetPasswordUser(user);
        setResetPasswordForm({ newPassword: "", confirmPassword: "" });
        setResetPasswordError("");
        setResetPasswordSuccess("");
        setShowResetPasswordModal(true);
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setResetPasswordError("");
        setResetPasswordSuccess("");

        // Validate passwords match
        if (resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword) {
            setResetPasswordError("Passwords do not match");
            return;
        }

        // Validate password strength
        if (resetPasswordForm.newPassword.length < 8) {
            setResetPasswordError("Password must be at least 8 characters");
            return;
        }

        if (!/[A-Za-z]/.test(resetPasswordForm.newPassword) || !/\d/.test(resetPasswordForm.newPassword)) {
            setResetPasswordError("Password must contain at least one letter and one number");
            return;
        }

        setIsSubmitting(true);

        try {
            await authApi.resetPassword(resetPasswordUser.id, resetPasswordForm.newPassword);
            setResetPasswordSuccess(`Password reset successfully for ${resetPasswordUser.fullName}`);
            setTimeout(() => {
                setShowResetPasswordModal(false);
            }, 2000);
        } catch (error: any) {
            setResetPasswordError(
                error.response?.data?.message ||
                (Array.isArray(error.response?.data?.message)
                    ? error.response.data.message.join(", ")
                    : "Failed to reset password")
            );
        } finally {
            setIsSubmitting(false);
        }
    };


    const totalPages = Math.ceil(total / limit);

    return (
        <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: "hsl(var(--foreground))" }}>
                        Users Management
                    </h1>
                    <p className="mt-1 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                        {total} total employees
                    </p>
                </div>
                <div className="flex gap-2">
                    {isAdmin && (
                        <button onClick={() => setShowModal(!showModal)} className="btn btn-primary">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Create User
                        </button>
                    )}
                    {isAdmin && (
                        <a href="/dashboard/bulk-upload" className="btn btn-secondary">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            Bulk Import
                        </a>
                    )}
                </div>
            </div>

            {/* Search */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Search by name, email, or employee ID..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="w-full max-w-md"
                />
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Employee ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Department</th>
                            <th>Role</th>
                            <th>Manager</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={8} className="text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>
                                    Loading...
                                </td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>
                                    No users found. Use Bulk Import to add users.
                                </td>
                            </tr>
                        ) : (
                            users.map((user: any) => (
                                <tr key={user.id}>
                                    <td className="font-mono text-sm">{user.employeeId}</td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                                                style={{ background: "hsl(var(--secondary))", color: "hsl(var(--primary))" }}
                                            >
                                                {user.fullName?.charAt(0)}
                                            </div>
                                            {user.fullName}
                                        </div>
                                    </td>
                                    <td className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{user.email}</td>
                                    <td>
                                        <span className="badge badge-draft">{user.deptCode || "—"}</span>
                                    </td>
                                    <td className="text-sm">{user.role}</td>
                                    <td className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                                        {user.manager?.fullName || "—"}
                                    </td>
                                    <td>
                                        <span
                                            className="inline-flex items-center gap-1 text-xs font-medium"
                                            style={{
                                                color: user.isActive ? "hsl(142, 76%, 46%)" : "hsl(0, 72%, 55%)",
                                            }}
                                        >
                                            <span
                                                className="w-2 h-2 rounded-full"
                                                style={{
                                                    background: user.isActive ? "hsl(142, 76%, 46%)" : "hsl(0, 72%, 55%)",
                                                }}
                                            />
                                            {user.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td>
                                        {isAdmin ? (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="btn btn-secondary text-xs py-1 px-2"
                                                    title="Edit user details"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => openResetPasswordModal(user)}
                                                    className="btn btn-secondary text-xs py-1 px-2"
                                                    title="Reset password"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>—</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                        Page {page} of {totalPages}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="btn btn-secondary text-sm"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages}
                            className="btn btn-secondary text-sm"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Create User Modal */}
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
                            <h2 className="text-xl font-bold" style={{ color: "hsl(var(--foreground))" }}>Create New User</h2>
                            <button onClick={() => setShowModal(false)} className="text-2xl" style={{ color: "hsl(var(--muted-foreground))" }}>×</button>
                        </div>

                        <form onSubmit={handleCreateUser} className="space-y-4">
                            {formError && (
                                <div className="p-3 rounded" style={{ background: "hsl(0, 72%, 55%, 0.1)", border: "1px solid hsl(0, 72%, 55%)" }}>
                                    <p className="text-sm" style={{ color: "hsl(0, 72%, 55%)" }}>{formError}</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                                    Employee ID <span style={{ color: "hsl(0, 72%, 55%)" }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.employeeId}
                                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                                    className="w-full"
                                    placeholder="e.g., EMP001"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                                    Full Name <span style={{ color: "hsl(0, 72%, 55%)" }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    className="w-full"
                                    placeholder="John Doe"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                                    Email <span style={{ color: "hsl(0, 72%, 55%)" }}>*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full"
                                    placeholder="john.doe@company.com"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                                        Role
                                    </label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full"
                                    >
                                        <option value="EMPLOYEE">Employee</option>
                                        <option value="MANAGER">Manager</option>
                                        <option value="ADMIN">Admin</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                                        Department Code
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.deptCode}
                                        onChange={(e) => setFormData({ ...formData, deptCode: e.target.value })}
                                        className="w-full"
                                        placeholder="e.g., HR, IT"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                                    Manager Employee ID
                                </label>
                                <input
                                    type="text"
                                    value={formData.managerEmployeeId}
                                    onChange={(e) => setFormData({ ...formData, managerEmployeeId: e.target.value })}
                                    className="w-full"
                                    placeholder="Leave empty if no manager"
                                />
                                <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                                    Default password: <code>password123</code>
                                </p>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button type="submit" disabled={isSubmitting} className="btn btn-primary flex-1">
                                    {isSubmitting ? "Creating..." : "Create User"}
                                </button>
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && editingUser && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: "rgba(0, 0, 0, 0.7)" }}
                    onClick={() => setShowEditModal(false)}
                >
                    <div
                        className="glass-card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-2xl font-bold mb-6" style={{ color: "hsl(var(--foreground))" }}>
                            Edit User
                        </h2>

                        {editError && (
                            <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: "hsla(0, 62.8%, 50.6%, 0.15)", color: "hsl(0, 72%, 65%)", border: "1px solid hsla(0, 62.8%, 50.6%, 0.3)" }}>
                                {editError}
                            </div>
                        )}

                        <form onSubmit={(e) => { e.preventDefault(); handleEditUser(); }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                                    Employee ID (Cannot be changed)
                                </label>
                                <input
                                    type="text"
                                    value={editingUser.employeeId}
                                    disabled
                                    className="opacity-50 cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                                    Full Name *
                                </label>
                                <input
                                    type="text"
                                    value={editFormData.fullName}
                                    onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    value={editFormData.email}
                                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                                    Role
                                </label>
                                <select
                                    value={editFormData.role}
                                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                                >
                                    <option value="EMPLOYEE">Employee</option>
                                    <option value="MANAGER">Manager</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                                    Department Code
                                </label>
                                <input
                                    type="text"
                                    value={editFormData.deptCode}
                                    onChange={(e) => setEditFormData({ ...editFormData, deptCode: e.target.value })}
                                    placeholder="e.g., IT, HR, SALES"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                                    Manager Employee ID
                                </label>
                                <input
                                    type="text"
                                    value={editFormData.managerEmployeeId}
                                    onChange={(e) => setEditFormData({ ...editFormData, managerEmployeeId: e.target.value })}
                                    placeholder="Leave empty for no manager"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editFormData.isActive}
                                        onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-sm font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
                                        Active User
                                    </span>
                                </label>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="submit" disabled={isSubmitting} className="btn btn-primary flex-1">
                                    {isSubmitting ? "Updating..." : "Update User"}
                                </button>
                                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {showResetPasswordModal && resetPasswordUser && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: "rgba(0, 0, 0, 0.7)" }}
                    onClick={() => setShowResetPasswordModal(false)}
                >
                    <div
                        className="glass-card w-full max-w-md p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold" style={{ color: "hsl(var(--foreground))" }}>
                                Reset Password
                            </h2>
                            <button
                                onClick={() => setShowResetPasswordModal(false)}
                                className="text-2xl"
                                style={{ color: "hsl(var(--muted-foreground))" }}
                            >
                                ×
                            </button>
                        </div>

                        <div className="mb-4 p-3 rounded" style={{ background: "hsl(var(--secondary))" }}>
                            <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                                Resetting password for:
                            </p>
                            <p className="text-sm font-medium mt-1" style={{ color: "hsl(var(--foreground))" }}>
                                {resetPasswordUser.fullName} ({resetPasswordUser.employeeId})
                            </p>
                        </div>

                        <form onSubmit={handleResetPassword} className="space-y-4">
                            {resetPasswordError && (
                                <div
                                    className="p-3 rounded text-sm"
                                    style={{
                                        background: "hsl(0, 72%, 55%, 0.1)",
                                        border: "1px solid hsl(0, 72%, 55%)",
                                        color: "hsl(0, 72%, 55%)",
                                    }}
                                >
                                    {resetPasswordError}
                                </div>
                            )}

                            {resetPasswordSuccess && (
                                <div
                                    className="p-3 rounded text-sm"
                                    style={{
                                        background: "hsl(142, 76%, 46%, 0.1)",
                                        border: "1px solid hsl(142, 76%, 46%)",
                                        color: "hsl(142, 76%, 46%)",
                                    }}
                                >
                                    {resetPasswordSuccess}
                                </div>
                            )}

                            <div>
                                <label
                                    className="block text-sm font-medium mb-1"
                                    style={{ color: "hsl(var(--muted-foreground))" }}
                                >
                                    New Password <span style={{ color: "hsl(0, 72%, 55%)" }}>*</span>
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={resetPasswordForm.newPassword}
                                    onChange={(e) =>
                                        setResetPasswordForm({ ...resetPasswordForm, newPassword: e.target.value })
                                    }
                                    className="w-full"
                                    placeholder="At least 8 chars, letter + number"
                                />
                            </div>

                            <div>
                                <label
                                    className="block text-sm font-medium mb-1"
                                    style={{ color: "hsl(var(--muted-foreground))" }}
                                >
                                    Confirm New Password <span style={{ color: "hsl(0, 72%, 55%)" }}>*</span>
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={resetPasswordForm.confirmPassword}
                                    onChange={(e) =>
                                        setResetPasswordForm({
                                            ...resetPasswordForm,
                                            confirmPassword: e.target.value,
                                        })
                                    }
                                    className="w-full"
                                    placeholder="Re-enter new password"
                                />
                            </div>

                            <div
                                className="text-xs p-3 rounded"
                                style={{
                                    background: "hsl(var(--secondary))",
                                    color: "hsl(var(--muted-foreground))",
                                }}
                            >
                                Password must be at least 8 characters and contain at least one letter and one
                                number.
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="btn btn-primary flex-1"
                                >
                                    {isSubmitting ? "Resetting..." : "Reset Password"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowResetPasswordModal(false)}
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
