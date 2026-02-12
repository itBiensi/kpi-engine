"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("hris_token");
    if (token) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  }, [router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "hsl(222.2, 84%, 4.9%)" }}
    >
      <div className="animate-spin w-8 h-8 border-2 border-transparent rounded-full" style={{
        borderTopColor: "hsl(217.2, 91.2%, 59.8%)",
      }} />
    </div>
  );
}
