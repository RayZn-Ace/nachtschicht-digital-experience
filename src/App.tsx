import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { I18nProvider } from "@/hooks/useI18n";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import EventsPage from "./pages/EventsPage";
import ClubPage from "./pages/ClubPage";
import PhotosPage from "./pages/PhotosPage";
import LoungesPage from "./pages/LoungesPage";
import DrinksPage from "./pages/DrinksPage";
import ReservationPage from "./pages/ReservationPage";
import U18Page from "./pages/U18Page";
import FaqPage from "./pages/FaqPage";
import OeffnungszeitenPage from "./pages/OeffnungszeitenPage";
import JobsPage from "./pages/JobsPage";
import ContactPage from "./pages/ContactPage";
import AgbPage from "./pages/AgbPage";
import DatenschutzPage from "./pages/DatenschutzPage";
import ImpressumPage from "./pages/ImpressumPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AdminPage from "./pages/AdminPage";
import DashboardPage from "./pages/DashboardPage";
import MyTicketsPage from "./pages/MyTicketsPage";
import MeineBestellungenPage from "./pages/MeineBestellungenPage";
import AccountDeletePage from "./pages/AccountDeletePage";
import MeineRechnungenPage from "./pages/MeineRechnungenPage";
import DatenschutzExportPage from "./pages/DatenschutzExportPage";
import TicketShopPage from "./pages/TicketShopPage";
import ScannerPage from "./pages/ScannerPage";
import ProfilPage from "./pages/ProfilPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <I18nProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/events" element={<EventsPage />} />
                    <Route path="/club" element={<ClubPage />} />
                    <Route path="/fotos" element={<PhotosPage />} />
                    <Route path="/lounges" element={<LoungesPage />} />
                    <Route path="/getraenkekarte" element={<DrinksPage />} />
                    <Route path="/reservierung" element={<ReservationPage />} />
                    <Route path="/u18" element={<U18Page />} />
                    <Route path="/faq" element={<FaqPage />} />
                    <Route path="/oeffnungszeiten" element={<OeffnungszeitenPage />} />
                    <Route path="/jobs" element={<JobsPage />} />
                    <Route path="/kontakt" element={<ContactPage />} />
                    <Route path="/agb" element={<AgbPage />} />
                    <Route path="/datenschutz" element={<DatenschutzPage />} />
                    <Route path="/impressum" element={<ImpressumPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/registrieren" element={<RegisterPage />} />
                    <Route path="/passwort-vergessen" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/meine-tickets" element={<MyTicketsPage />} />
                    <Route path="/meine-bestellungen" element={<MeineBestellungenPage />} />
                    <Route path="/meine-rechnungen" element={<MeineRechnungenPage />} />
                    <Route path="/account-loeschen" element={<AccountDeletePage />} />
                    <Route path="/daten-export" element={<DatenschutzExportPage />} />
                    <Route path="/tickets/:eventId" element={<TicketShopPage />} />
                    <Route path="/scanner" element={<ScannerPage />} />
                    <Route path="/profil" element={<ProfilPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Layout>
              </BrowserRouter>
            </TooltipProvider>
          </I18nProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
