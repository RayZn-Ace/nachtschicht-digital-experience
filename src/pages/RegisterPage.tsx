import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { useI18n } from "@/hooks/useI18n";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import {
  ArrowRight, ArrowLeft, Check, Eye, EyeOff, Mail, Lock,
  User, Calendar, Shield, Sparkles,
} from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import { Progress } from "@/components/ui/progress";
import { isNativeApp } from "@/lib/native";

const STEPS = 5;

interface FormData {
  email: string;
  password: string;
  passwordConfirm: string;
  salutation: string;
  firstName: string;
  lastName: string;
  birthday: string;
  gdprConsent: boolean;
  agbConsent: boolean;
}

const getPasswordStrength = (pw: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score: 20, label: "Schwach", color: "bg-destructive" };
  if (score === 2) return { score: 40, label: "Mäßig", color: "bg-orange-500" };
  if (score === 3) return { score: 60, label: "Gut", color: "bg-yellow-500" };
  if (score === 4) return { score: 80, label: "Stark", color: "bg-green-500" };
  return { score: 100, label: "Sehr stark", color: "bg-green-400" };
};

const RegisterPage = () => {
  const { user, loading } = useAuth();
  const { lang } = useI18n();
  const [step, setStep] = useState(1);
  const [showPw, setShowPw] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const nativeApp = isNativeApp();

  const [form, setForm] = useState<FormData>({
    email: "",
    password: "",
    passwordConfirm: "",
    salutation: "",
    firstName: "",
    lastName: "",
    birthday: "",
    gdprConsent: false,
    agbConsent: false,
  });

  const update = (field: keyof FormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-foreground">Laden...</div>;
  if (user) return <Navigate to="/dashboard" replace />;

  const pwStrength = getPasswordStrength(form.password);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const passwordsMatch = form.password === form.passwordConfirm;

  const canProceed = () => {
    switch (step) {
      case 1: return true;
      case 2: return emailValid && form.password.length >= 6 && passwordsMatch;
      case 3: return form.salutation && form.firstName.trim() && form.lastName.trim();
      case 4: return true; // optional step
      case 5: return form.gdprConsent && form.agbConsent;
      default: return false;
    }
  };

  const handleRegister = async () => {
    setError("");
    setSubmitting(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          first_name: form.firstName,
          last_name: form.lastName,
          salutation: form.salutation,
        },
      },
    });

    if (signUpError) {
      if (signUpError.message.includes("already registered")) {
        setError(lang === "de" ? "Diese E-Mail ist bereits registriert." : "This email is already registered.");
      } else {
        setError(signUpError.message);
      }
      setSubmitting(false);
      return;
    }

    // Update profile with extra data
    if (data.user) {
      await supabase.from("profiles").update({
        first_name: form.firstName,
        last_name: form.lastName,
        salutation: form.salutation,
        birthday: form.birthday || null,
        display_name: `${form.firstName} ${form.lastName}`,
        gdpr_consent_at: new Date().toISOString(),
        gdpr_agb_consent_at: new Date().toISOString(),
      }).eq("user_id", data.user.id);
    }

    setDone(true);
    setSubmitting(false);
  };

  const nextStep = () => {
    if (step === STEPS) {
      handleRegister();
    } else {
      setStep((s) => Math.min(STEPS, s + 1));
    }
  };

  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  // Success screen
  if (done) {
    return (
      <section className="section-padding min-h-[80vh] flex items-center">
        <div className="container mx-auto max-w-md">
          <ScrollReveal>
            <div className="glass-card p-8 md:p-10 text-center animate-fade-in">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-green-400" />
              </div>
              <h1 className="font-display text-3xl tracking-wider text-foreground mb-3">
                {lang === "de" ? "FAST GESCHAFFT!" : "ALMOST DONE!"}
              </h1>
              <p className="text-muted-foreground mb-6">
                {lang === "de"
                  ? "Wir haben dir eine Bestätigungs-E-Mail gesendet. Bitte klicke auf den Link in der E-Mail, um dein Konto zu aktivieren."
                  : "We've sent you a confirmation email. Please click the link to activate your account."}
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-display tracking-wider rounded-lg hover:bg-primary/90"
              >
                {lang === "de" ? "ZUM LOGIN" : "GO TO LOGIN"} <ArrowRight size={18} />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    );
  }

  const stepLabels = [
    lang === "de" ? "Start" : "Start",
    lang === "de" ? "Login-Daten" : "Credentials",
    lang === "de" ? "Über dich" : "About you",
    lang === "de" ? "Profil" : "Profile",
    lang === "de" ? "Abschluss" : "Finish",
  ];

  return (
    <section className="section-padding min-h-[80vh] flex items-center">
      <div className="container mx-auto max-w-lg">
        <ScrollReveal>
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="font-display text-4xl md:text-5xl tracking-wider text-foreground">
              JETZT <span className="text-gradient">REGISTRIEREN</span>
            </h1>
          </div>

          {/* Stepper */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              {stepLabels.map((label, i) => (
                <div key={i} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      i + 1 < step
                        ? "bg-primary text-primary-foreground"
                        : i + 1 === step
                        ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i + 1 < step ? <Check size={14} /> : i + 1}
                  </div>
                  <span className={`text-[10px] mt-1 ${i + 1 === step ? "text-primary" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
            <Progress value={(step / STEPS) * 100} className="h-1.5" />
          </div>

          {/* Form */}
          <div className="glass-card p-6 md:p-8">
            {error && (
              <div className="text-destructive text-sm bg-destructive/10 border border-destructive/20 p-3 rounded-lg mb-4 animate-fade-in" role="alert">
                {error}
              </div>
            )}

            {/* Step 1: Intro */}
            {step === 1 && (
              <div className="text-center space-y-4 animate-fade-in">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                  <Sparkles size={28} className="text-primary" />
                </div>
                <h2 className="font-display text-2xl tracking-wider text-foreground">
                  {lang === "de" ? "WILLKOMMEN!" : "WELCOME!"}
                </h2>
                <p className="text-muted-foreground">
                  {lang === "de"
                    ? "Registriere dich jetzt und erhalte Zugriff auf weitere Funktionen!"
                    : "Sign up now and access more features!"}
                </p>

                {/* Social signup */}
                <div className="space-y-2.5 pt-2">
                  {nativeApp && (
                    <div className="rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
                      {lang === "de"
                        ? "Google- und Apple-Registrierung sind in der iOS-App vorübergehend deaktiviert. Bitte registriere dich per E-Mail."
                        : "Google and Apple sign-up are temporarily disabled in the iOS app. Please sign up with email."}
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={nativeApp}
                    onClick={async () => {
                      const { error: err } = await lovable.auth.signInWithOAuth("google", {
                        redirect_uri: window.location.origin,
                      });
                      if (err) setError(err.message);
                    }}
                    className="w-full py-3 bg-muted border border-border text-foreground rounded-lg hover:bg-muted/80 transition-colors flex items-center justify-center gap-3 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    {lang === "de" ? "Mit Google registrieren" : "Sign up with Google"}
                  </button>
                  <button
                    type="button"
                    disabled={nativeApp}
                    onClick={async () => {
                      const { error: err } = await lovable.auth.signInWithOAuth("apple", {
                        redirect_uri: window.location.origin,
                      });
                      if (err) setError(err.message);
                    }}
                    className="w-full py-3 bg-muted border border-border text-foreground rounded-lg hover:bg-muted/80 transition-colors flex items-center justify-center gap-3 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    {lang === "de" ? "Mit Apple registrieren" : "Sign up with Apple"}
                  </button>
                </div>

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs"><span className="bg-card px-3 text-muted-foreground">{lang === "de" ? "oder per E-Mail" : "or via email"}</span></div>
                </div>

                <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground flex items-center gap-2">
                  <Shield size={14} className="text-primary shrink-0" />
                  {lang === "de"
                    ? "Alle eingegebenen Daten können nur von dir eingesehen werden."
                    : "All entered data can only be seen by you."}
                </div>
              </div>
            )}

            {/* Step 2: Credentials */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <h2 className="font-display text-xl tracking-wider text-foreground text-center mb-2">
                  {lang === "de" ? "DEINE LOGIN-DATEN" : "YOUR CREDENTIALS"}
                </h2>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  {lang === "de" ? "Wie möchtest du dich bei uns anmelden?" : "How would you like to sign in?"}
                </p>

                {/* Email */}
                <div>
                  <label htmlFor="reg-email" className="text-sm font-medium text-foreground mb-1.5 block">E-Mail *</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="reg-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      required
                      autoComplete="email"
                      placeholder="deine@email.de"
                      className={`w-full pl-10 pr-4 py-3 bg-muted border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none transition-colors ${
                        form.email && !emailValid ? "border-destructive" : "border-border"
                      }`}
                    />
                  </div>
                  {form.email && !emailValid && (
                    <p className="text-destructive text-xs mt-1">{lang === "de" ? "Bitte gültige E-Mail eingeben." : "Please enter a valid email."}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="reg-pw" className="text-sm font-medium text-foreground mb-1.5 block">
                    {lang === "de" ? "Passwort *" : "Password *"}
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="reg-pw"
                      type={showPw ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      placeholder="Mindestens 6 Zeichen"
                      className="w-full pl-10 pr-12 py-3 bg-muted border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Passwort anzeigen"
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {form.password && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${pwStrength.color}`} style={{ width: `${pwStrength.score}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{pwStrength.label}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="reg-pw2" className="text-sm font-medium text-foreground mb-1.5 block">
                    {lang === "de" ? "Passwort bestätigen *" : "Confirm password *"}
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="reg-pw2"
                      type={showPwConfirm ? "text" : "password"}
                      value={form.passwordConfirm}
                      onChange={(e) => update("passwordConfirm", e.target.value)}
                      required
                      autoComplete="new-password"
                      placeholder="Passwort wiederholen"
                      className={`w-full pl-10 pr-12 py-3 bg-muted border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none transition-colors ${
                        form.passwordConfirm && !passwordsMatch ? "border-destructive" : "border-border"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwConfirm(!showPwConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Passwort anzeigen"
                    >
                      {showPwConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {form.passwordConfirm && !passwordsMatch && (
                    <p className="text-destructive text-xs mt-1">{lang === "de" ? "Passwörter stimmen nicht überein." : "Passwords don't match."}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: About you */}
            {step === 3 && (
              <div className="space-y-4 animate-fade-in">
                <h2 className="font-display text-xl tracking-wider text-foreground text-center mb-2">
                  {lang === "de" ? "WEITER GEHT'S…" : "LET'S CONTINUE…"}
                </h2>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  {lang === "de" ? "Wie heißt du und wer bist du?" : "What's your name?"}
                </p>

                {/* Salutation */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    {lang === "de" ? "Anrede *" : "Salutation *"}
                  </label>
                  <div className="flex gap-2">
                    {[
                      { val: "herr", label: lang === "de" ? "Herr" : "Mr" },
                      { val: "frau", label: lang === "de" ? "Frau" : "Ms" },
                      { val: "divers", label: lang === "de" ? "Divers" : "Other" },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => update("salutation", opt.val)}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                          form.salutation === opt.val
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted text-foreground border-border hover:border-primary/50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* First + Last name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="reg-fn" className="text-sm font-medium text-foreground mb-1.5 block">
                      {lang === "de" ? "Vorname *" : "First name *"}
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="reg-fn"
                        type="text"
                        value={form.firstName}
                        onChange={(e) => update("firstName", e.target.value)}
                        required
                        autoComplete="given-name"
                        className="w-full pl-10 pr-4 py-3 bg-muted border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="reg-ln" className="text-sm font-medium text-foreground mb-1.5 block">
                      {lang === "de" ? "Nachname *" : "Last name *"}
                    </label>
                    <input
                      id="reg-ln"
                      type="text"
                      value={form.lastName}
                      onChange={(e) => update("lastName", e.target.value)}
                      required
                      autoComplete="family-name"
                      className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>

                {/* Birthday */}
                <div>
                  <label htmlFor="reg-bday" className="text-sm font-medium text-foreground mb-1.5 block">
                    {lang === "de" ? "Geburtsdatum" : "Date of birth"}
                  </label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="reg-bday"
                      type="date"
                      value={form.birthday}
                      onChange={(e) => update("birthday", e.target.value)}
                      autoComplete="bday"
                      className="w-full pl-10 pr-4 py-3 bg-muted border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Profile (optional) */}
            {step === 4 && (
              <div className="space-y-4 animate-fade-in text-center">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-border">
                  <User size={32} className="text-muted-foreground" />
                </div>
                <h2 className="font-display text-xl tracking-wider text-foreground">
                  {lang === "de" ? "DEIN PROFIL" : "YOUR PROFILE"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {lang === "de"
                    ? "Profilbild und weitere Daten kannst du später in deinem Account ergänzen."
                    : "You can add a profile picture and more data later in your account."}
                </p>
                <div className="bg-muted/50 rounded-lg p-4 text-xs text-muted-foreground">
                  <p>{lang === "de" ? "Bald verfügbar:" : "Coming soon:"}</p>
                  <ul className="mt-2 space-y-1 text-left">
                    <li>📸 {lang === "de" ? "Profilbild hochladen" : "Upload profile picture"}</li>
                    <li>📱 {lang === "de" ? "Telefonnummer" : "Phone number"}</li>
                    <li>🏢 {lang === "de" ? "Unternehmen / Veranstalterstatus" : "Company / Organizer status"}</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Step 5: GDPR + Submit */}
            {step === 5 && (
              <div className="space-y-4 animate-fade-in">
                <h2 className="font-display text-xl tracking-wider text-foreground text-center">
                  {lang === "de" ? "FAST GESCHAFFT" : "ALMOST DONE"}
                </h2>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  {lang === "de" ? "Bitte bestätige die folgenden Punkte:" : "Please confirm the following:"}
                </p>

                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.gdprConsent}
                    onChange={(e) => update("gdprConsent", e.target.checked)}
                    className="mt-0.5 accent-primary w-4 h-4"
                  />
                  <span className="text-sm text-foreground">
                    {lang === "de" ? (
                      <>
                        Ich habe die{" "}
                        <Link to="/datenschutz" target="_blank" className="text-primary hover:underline">Datenschutzerklärung</Link>
                        {" "}gelesen und akzeptiere diese. *
                      </>
                    ) : (
                      <>
                        I have read and accept the{" "}
                        <Link to="/datenschutz" target="_blank" className="text-primary hover:underline">Privacy Policy</Link>. *
                      </>
                    )}
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.agbConsent}
                    onChange={(e) => update("agbConsent", e.target.checked)}
                    className="mt-0.5 accent-primary w-4 h-4"
                  />
                  <span className="text-sm text-foreground">
                    {lang === "de" ? (
                      <>
                        Ich habe die{" "}
                        <Link to="/agb" target="_blank" className="text-primary hover:underline">AGB</Link>
                        {" "}gelesen und akzeptiere diese. *
                      </>
                    ) : (
                      <>
                        I have read and accept the{" "}
                        <Link to="/agb" target="_blank" className="text-primary hover:underline">Terms of Service</Link>. *
                      </>
                    )}
                  </span>
                </label>

                <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground flex items-center gap-2">
                  <Shield size={14} className="text-primary shrink-0" />
                  {lang === "de"
                    ? "Dein Account wird erst nach E-Mail-Bestätigung aktiviert (Double Opt-in)."
                    : "Your account will only be activated after email confirmation (double opt-in)."}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft size={16} /> {lang === "de" ? "Zurück" : "Back"}
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={nextStep}
                disabled={!canProceed() || submitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-display tracking-wider rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
              >
                {submitting ? (
                  <span className="animate-pulse">{lang === "de" ? "WIRD ERSTELLT..." : "CREATING..."}</span>
                ) : step === STEPS ? (
                  <>
                    {lang === "de" ? "REGISTRIERUNG ABSCHLIEßEN" : "COMPLETE REGISTRATION"}
                    <Check size={16} />
                  </>
                ) : step === 1 ? (
                  <>
                    {lang === "de" ? "LOS GEHT'S" : "LET'S GO"}
                    <ArrowRight size={16} />
                  </>
                ) : (
                  <>
                    {lang === "de" ? "WEITER" : "NEXT"}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>

            {/* Login link */}
            {step === 1 && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                {lang === "de" ? "Bereits ein Konto?" : "Already have an account?"}{" "}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  {lang === "de" ? "Jetzt anmelden" : "Log in"}
                </Link>
              </p>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default RegisterPage;
