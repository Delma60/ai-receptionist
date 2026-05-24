"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button"; 
import { UserPlus, Loader2 } from "lucide-react";

interface ImpersonateButtonProps {
  tenantId: string;
  tenantName?: string;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  children?: React.ReactNode;
}

export function ImpersonateButton({
  tenantId,
  tenantName,
  children,
  variant = "outline",
  size = "sm",
}: ImpersonateButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleImpersonate = async () => {
    try {
      setIsLoading(true);

      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to impersonate");
      }

      // 1. Refresh the current route so server components read the new cookie
      router.refresh();

      // 2. Redirect the admin to the standard dashboard to view it as the tenant
      router.push("/dashboard");
    } catch (error) {
      console.error(error);
      // Tip: If you use Sonner or react-hot-toast, replace this alert with a toast.error()
      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong while trying to impersonate.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleImpersonate}
      disabled={isLoading}
      title={tenantName ? `Impersonate ${tenantName}` : "Impersonate Tenant"}
    >
      {/* 1. Render Spinner if loading, otherwise render Icon (ONLY if no custom children are provided) */}
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        !children && <UserPlus className="mr-2 h-4 w-4" />
      )}
      
      {/* 2. Render Text: Loading state, OR Custom Children, OR Default Text */}
      {isLoading ? "Switching..." : (children || "Impersonate")}
    </Button>
  );
}