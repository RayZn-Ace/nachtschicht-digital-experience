import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import EventsPage from "./pages/EventsPage";
import ClubPage from "./pages/ClubPage";
import PhotosPage from "./pages/PhotosPage";
import LoungesPage from "./pages/LoungesPage";
import FaqPage from "./pages/FaqPage";
import JobsPage from "./pages/JobsPage";
import ContactPage from "./pages/ContactPage";
import AgbPage from "./pages/AgbPage";
import DatenschutzPage from "./pages/DatenschutzPage";
import ImpressumPage from "./pages/ImpressumPage";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
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
              <Route path="/faq" element={<FaqPage />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/kontakt" element={<ContactPage />} />
              <Route path="/agb" element={<AgbPage />} />
              <Route path="/datenschutz" element={<DatenschutzPage />} />
              <Route path="/impressum" element={<ImpressumPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
