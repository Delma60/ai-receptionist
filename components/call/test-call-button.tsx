import { useState } from "react";
import { Button } from "../ui/button";
import { startVapiTestCall } from "@/lib/vapi-web-call";

export function TestCallButton({ agentId }: { agentId: string }) {
  const [loading, setLoading] = useState(false);
  const handleTestCall = () => {
    setLoading(true);
    try {
      startVapiTestCall(agentId);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button onClick={handleTestCall} disabled={loading}>
      {loading ? "loading..." : "Test Call"}
    </Button>
  );
}
