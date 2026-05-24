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
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm"; // Added "icon-sm"
  className?: string; // Added className prop
  children?: React.ReactNode;
}

export function ImpersonateButton({
  tenantId,
  tenantName,
  children,
  variant = "outline",
  size = "sm",
  className,
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

      router.refresh();
      router.push("/dashboard");
    } catch (error) {
      console.error(error);
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
      size={size as any} // Prevents strict type complaints from underlying UI Button
      className={className}
      onClick={handleImpersonate}
      disabled={isLoading}
      title={tenantName ? `Impersonate ${tenantName}` : "Impersonate Tenant"}
    >
      {/* If children (like an icon) are passed, render them or a spinner. Otherwise render default text/icon */}
      {children ? (
        isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          children
        )
      ) : (
        <>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="mr-2 h-4 w-4" />
          )}
          {isLoading ? "Switching..." : "Impersonate"}
        </>
      )}
    </Button>
  );
}
