import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, Save, Lock, User, Mail, Phone, CalendarDays } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

interface Profile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  email: string | null;
  salutation: string | null;
  birthday: string | null;
  avatar_url: string | null;
}

const ProfilPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { lang } = useI18n();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [salutation, setSalutation] = useState("");
  const [birthday, setBirthday] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        const p = data as unknown as Profile;
        setProfile(p);
        setFirstName(p.first_name || "");
        setLastName(p.last_name || "");
        setDisplayName(p.display_name || "");
        setSalutation(p.salutation || "");
        setBirthday(p.birthday || "");
        setAvatarUrl(p.avatar_url);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error(lang === "de" ? "Bild darf max. 5MB groß sein" : "Image max 5MB");
      return;
    }

    setAvatarUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadErr) {
      toast.error(uploadErr.message);
      setAvatarUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${urlData.publicUrl}?t=${Date.now()}`;
    setAvatarUrl(url);

    // Save to profile immediately
    await supabase
      .from("profiles")
      .update({ avatar_url: url } as any)
      .eq("user_id", user.id);

    toast.success(lang === "de" ? "Profilbild aktualisiert" : "Avatar updated");
    setAvatarUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName || null,
        last_name: lastName || null,
        display_name: displayName || null,
        salutation: salutation || null,
        birthday: birthday || null,
      } as any)
      .eq("user_id", user.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(lang === "de" ? "Profil gespeichert ✓" : "Profile saved ✓");
    }
    setSaving(false);
  };

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error(lang === "de" ? "Passwort muss mind. 6 Zeichen lang sein" : "Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(lang === "de" ? "Passwörter stimmen nicht überein" : "Passwords don't match");
      return;
    }

    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(lang === "de" ? "Passwort geändert ✓" : "Password changed ✓");
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  };

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-[60vh] text-foreground">Laden...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;

  const inputCls = "w-full px-4 py-3 bg-muted border border-border rounded-md text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none";

  return (
    <section className="section-padding">
      <div className="container mx-auto max-w-2xl">
        <ScrollReveal>
          <h1 className="font-display text-4xl md:text-5xl tracking-wider text-foreground mb-2">
            MEIN <span className="text-gradient">PROFIL</span>
          </h1>
          <p className="text-muted-foreground mb-8">
            {lang === "de" ? "Verwalte deine persönlichen Daten." : "Manage your personal data."}
          </p>
        </ScrollReveal>

        {/* Avatar */}
        <ScrollReveal delay={0.05}>
          <div className="glass-card p-6 mb-6 flex items-center gap-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-muted border-2 border-border overflow-hidden flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User size={40} className="text-muted-foreground" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <Camera size={20} className="text-foreground" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div>
              <p className="font-display text-xl tracking-wider text-foreground">
                {displayName || firstName || user.email?.split("@")[0]}
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail size={12} /> {user.email}
              </p>
              {avatarUploading && (
                <p className="text-xs text-primary mt-1 animate-pulse">
                  {lang === "de" ? "Wird hochgeladen..." : "Uploading..."}
                </p>
              )}
            </div>
          </div>
        </ScrollReveal>

        {/* Profile form */}
        <ScrollReveal delay={0.1}>
          <div className="glass-card p-6 mb-6 space-y-4">
            <h2 className="font-display text-xl tracking-wider text-foreground flex items-center gap-2">
              <User size={18} /> {lang === "de" ? "PERSÖNLICHE DATEN" : "PERSONAL DATA"}
            </h2>

            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-sm text-foreground mb-1 block">{lang === "de" ? "Anrede" : "Title"}</label>
                <select
                  value={salutation}
                  onChange={(e) => setSalutation(e.target.value)}
                  className={inputCls}
                >
                  <option value="">–</option>
                  <option value="Herr">Herr</option>
                  <option value="Frau">Frau</option>
                  <option value="Divers">Divers</option>
                </select>
              </div>
              <div className="col-span-3">
                <label className="text-sm text-foreground mb-1 block">
                  {lang === "de" ? "Anzeigename" : "Display name"}
                </label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={inputCls}
                  placeholder="NightOwl42"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-foreground mb-1 block">{lang === "de" ? "Vorname" : "First name"}</label>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} placeholder="Max" />
              </div>
              <div>
                <label className="text-sm text-foreground mb-1 block">{lang === "de" ? "Nachname" : "Last name"}</label>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} placeholder="Mustermann" />
              </div>
            </div>

            <div>
              <label className="text-sm text-foreground mb-1 block flex items-center gap-1">
                <CalendarDays size={12} /> {lang === "de" ? "Geburtstag" : "Birthday"}
              </label>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="p-3 bg-muted/50 rounded-md text-sm text-muted-foreground flex items-center gap-2">
              <Mail size={14} /> E-Mail: <strong className="text-foreground">{user.email}</strong>
              <span className="text-xs">(nicht änderbar)</span>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 bg-primary text-primary-foreground font-display tracking-wider rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save size={16} /> {saving ? "..." : lang === "de" ? "SPEICHERN" : "SAVE"}
            </button>
          </div>
        </ScrollReveal>

        {/* Password change */}
        <ScrollReveal delay={0.15}>
          <div className="glass-card p-6 space-y-4">
            <h2 className="font-display text-xl tracking-wider text-foreground flex items-center gap-2">
              <Lock size={18} /> {lang === "de" ? "PASSWORT ÄNDERN" : "CHANGE PASSWORD"}
            </h2>

            <div>
              <label className="text-sm text-foreground mb-1 block">
                {lang === "de" ? "Neues Passwort" : "New password"}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputCls}
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="text-sm text-foreground mb-1 block">
                {lang === "de" ? "Passwort bestätigen" : "Confirm password"}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputCls}
                placeholder="••••••••"
              />
            </div>

            <button
              onClick={handlePasswordChange}
              disabled={changingPassword || !newPassword}
              className="w-full py-3 bg-muted border border-border text-foreground font-display tracking-wider rounded-md hover:bg-muted/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Lock size={16} /> {changingPassword ? "..." : lang === "de" ? "PASSWORT ÄNDERN" : "CHANGE PASSWORD"}
            </button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default ProfilPage;
