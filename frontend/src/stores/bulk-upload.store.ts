import { create } from 'zustand';

interface BulkJob {
    jobId: string;
    status: string;
    filename: string;
    totalRows: number;
    successRows: number;
    failedRows: number;
    errorLogUrl: string | null;
    progress: number;
}

interface BulkUploadState {
    activeJob: BulkJob | null;
    isPolling: boolean;
    setActiveJob: (job: BulkJob | null) => void;
    setIsPolling: (polling: boolean) => void;
    updateJobProgress: (job: BulkJob) => void;
}

export const useBulkUploadStore = create<BulkUploadState>((set) => ({
    activeJob: null,
    isPolling: false,

    setActiveJob: (job) => set({ activeJob: job }),
    setIsPolling: (polling) => set({ isPolling: polling }),
    updateJobProgress: (job) => set({ activeJob: job }),
}));
