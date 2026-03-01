import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send } from "lucide-react";

const NewsletterForm = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);

    const { error } = await supabase
      .from("newsletter_subscribers")
      .insert({ email: email.trim().toLowerCase() });

    if (error) {
      if (error.code === "23505") {
        toast.info("Du bist bereits angemeldet! 📬");
      } else {
        toast.error("Fehler bei der Anmeldung. Bitte versuche es erneut.");
      }
    } else {
      toast.success("Erfolgreich angemeldet! 🎉");
      setEmail("");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Deine E-Mail"
        required
        className="flex-1 px-4 py-2.5 bg-muted border border-border rounded-md text-foreground text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none"
      />
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0"
        aria-label="Newsletter abonnieren"
      >
        <Send size={18} />
      </button>
    </form>
  );
};

export default NewsletterForm;
