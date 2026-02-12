interface StatusBadgeProps {
    status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'LOCKED';
    size?: 'sm' | 'md' | 'lg';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
    const styles = {
        DRAFT: {
            bg: "hsl(0, 0%, 50%, 0.1)",
            border: "hsl(0, 0%, 50%)",
            color: "hsl(0, 0%, 50%)",
            label: "Draft",
        },
        SUBMITTED: {
            bg: "hsl(45, 93%, 47%, 0.15)",
            border: "hsl(45, 93%, 47%)",
            color: "hsl(45, 93%, 47%)",
            label: "Submitted",
        },
        APPROVED: {
            bg: "hsl(142, 76%, 46%, 0.15)",
            border: "hsl(142, 76%, 46%)",
            color: "hsl(142, 76%, 46%)",
            label: "Approved",
        },
        REJECTED: {
            bg: "hsl(0, 72%, 55%, 0.15)",
            border: "hsl(0, 72%, 55%)",
            color: "hsl(0, 72%, 55%)",
            label: "Rejected",
        },
        LOCKED: {
            bg: "hsl(200, 98%, 39%, 0.15)",
            border: "hsl(200, 98%, 39%)",
            color: "hsl(200, 98%, 39%)",
            label: "Locked",
        },
    };

    const sizeClasses = {
        sm: "text-xs px-2 py-0.5",
        md: "text-sm px-2.5 py-1",
        lg: "text-base px-3 py-1.5",
    };

    const style = styles[status] || styles.DRAFT;

    return (
        <span
            className={`inline-flex items-center gap-1 font-medium rounded ${sizeClasses[size]}`}
            style={{
                background: style.bg,
                border: `1px solid ${style.border}`,
                color: style.color,
            }}
        >
            <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: style.color }}
            />
            {style.label}
        </span>
    );
}
