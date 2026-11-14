import { Button } from "@/components/ui/button";

export default function AuthFailure() {
  return <div role="alert" className="flex flex-col items-center justify-center min-h-[60vh] text-foreground gap-4 px-4 text-center">
    <p>Anmeldung konnte nicht vollständig geprüft werden.</p>
    <Button variant="outline" onClick={() => window.location.reload()}>Erneut laden</Button>
  </div>;
}