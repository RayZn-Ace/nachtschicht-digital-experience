import { useState } from "react";
import { X, AlertTriangle, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface ReportPhotoModalProps {
  open: boolean;
  onClose: () => void;
  photoId: string;
  albumId: string;
  photoUrl: string;
}

const REASONS_DE = [
  "Unangemessener Inhalt",
  "Urheberrecht",
  "Datenschutz / Persönlichkeitsrechte",
  "Spam",
  "Anderer Grund",
];

const REASONS_EN = [
  "Inappropriate content",
  "Copyright",
  "Privacy / Personal rights",
  "Spam",
  "Other reason",
];

const ReportPhotoModal = ({ open, onClose, photoId, albumId, photoUrl }: ReportPhotoModalProps) => {
  const { user } = useAuth();
  const { lang } = useI18n();
  const [reason, setReason] = useState("");
  const [detailText, setDetailText] = useState("");
  const [verificationFile, setVerificationFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reasons = lang === "de" ? REASONS_DE : REASONS_EN;
  const isOther = reason === REASONS_DE[4] || reason === REASONS_EN[4];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(lang === "de" ? "Datei zu groß (max 5 MB)" : "File too large (max 5 MB)");
      return;
    }
    setVerificationFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error(lang === "de" ? "Bitte melde dich an, um ein Foto zu melden." : "Please log in to report a photo.");
      return;
    }
    if (!reason) {
      toast.error(lang === "de" ? "Bitte wähle einen Grund." : "Please select a reason.");
      return;
    }

    setSubmitting(true);
    try {
      let verificationPhotoUrl: string | null = null;

      if (verificationFile) {
        const ext = verificationFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("report-photos")
          .upload(path, verificationFile, { upsert: false });
        if (uploadError) throw uploadError;
        verificationPhotoUrl = `${SUPABASE_URL}/storage/v1/object/authenticated/report-photos/${path}`;
      }

      const { error } = await supabase.from("photo_reports" as any).insert({
        photo_id: photoId,
        album_id: albumId,
        user_id: user.id,
        reason,
        detail_text: detailText || null,
        verification_photo_url: verificationPhotoUrl,
        status: "open",
      } as any);

      if (error) throw error;

      toast.success(lang === "de" ? "Meldung erfolgreich gesendet." : "Report submitted successfully.");
      onClose();
      setReason("");
      setDetailText("");
      setVerificationFile(null);
      setPreviewUrl(null);
    } catch (err: any) {
      toast.error(err.message || "Error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto glass-card p-6 rounded-xl"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2 text-foreground">
                <AlertTriangle size={20} className="text-destructive" />
                <h2 className="font-display text-xl tracking-wider">
                  {lang === "de" ? "FOTO MELDEN" : "REPORT PHOTO"}
                </h2>
              </div>
              <button onClick={onClose} className="p-1 rounded-full hover:bg-muted transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Photo preview */}
            <div className="mb-5 rounded-lg overflow-hidden bg-muted aspect-video">
              <img src={photoUrl} alt="Reported photo" className="w-full h-full object-cover" />
            </div>

            {/* Reason selection */}
            <div className="mb-4">
              <label className="text-sm font-medium text-foreground mb-2 block">
                {lang === "de" ? "Grund der Meldung *" : "Reason for report *"}
              </label>
              <div className="space-y-2">
                {reasons.map((r) => (
                  <label
                    key={r}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      reason === r
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="report-reason"
                      value={r}
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      className="accent-primary"
                    />
                    <span className="text-sm text-foreground">{r}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Free text for "Other" */}
            {isOther && (
              <div className="mb-4">
                <label className="text-sm font-medium text-foreground mb-1 block">
                  {lang === "de" ? "Bitte beschreibe den Grund" : "Please describe the reason"}
                </label>
                <textarea
                  value={detailText}
                  onChange={(e) => setDetailText(e.target.value.slice(0, 1000))}
                  rows={3}
                  maxLength={1000}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                  placeholder={lang === "de" ? "Dein Grund..." : "Your reason..."}
                />
              </div>
            )}

            {/* Verification photo */}
            <div className="mb-5">
              <label className="text-sm font-medium text-foreground mb-1 block">
                {lang === "de" ? "Verifizierungsfoto (optional)" : "Verification photo (optional)"}
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                {lang === "de"
                  ? "Bitte lade ein Bild von dir hoch, auf dem du deutlich zu erkennen bist, damit wir bestätigen können, dass du auf dem Foto zu sehen bist."
                  : "Please upload a photo of yourself where you are clearly recognizable, so we can confirm that you are in the photo."}
              </p>
              <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                <Upload size={18} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {verificationFile
                    ? verificationFile.name
                    : lang === "de"
                    ? "Bild auswählen..."
                    : "Select image..."}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              {previewUrl && (
                <div className="mt-2 relative w-20 h-20 rounded-lg overflow-hidden">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setVerificationFile(null); setPreviewUrl(null); }}
                    className="absolute top-0.5 right-0.5 p-0.5 bg-background/80 rounded-full"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting || !reason}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-destructive text-destructive-foreground font-display tracking-wider rounded-md hover:bg-destructive/90 transition-colors disabled:opacity-50"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {lang === "de" ? "MELDUNG ABSENDEN" : "SUBMIT REPORT"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReportPhotoModal;
