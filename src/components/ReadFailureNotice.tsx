import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { READ_FAILURE_EVENT } from "@/lib/readDeadline";

export default function ReadFailureNotice() {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const show = () => setFailed(true);
    window.addEventListener(READ_FAILURE_EVENT, show);
    return () => window.removeEventListener(READ_FAILURE_EVENT, show);
  }, []);
  if (!failed) return null;
  return (
    <div role="alert" className="fixed top-0 inset-x-0 z-[100] border-b border-destructive bg-background text-foreground p-3 flex flex-wrap justify-center items-center gap-3">
      <p className="text-sm">Daten konnten nicht vollständig geladen werden. Bitte erneut versuchen.</p>
      <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Erneut laden</Button>
    </div>
  );
}