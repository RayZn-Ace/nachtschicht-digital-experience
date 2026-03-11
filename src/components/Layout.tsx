import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import CookieConsent from "./CookieConsent";
import ChatBot from "./ChatBot";
import AdminSidebar from "./AdminSidebar";
import { useTracking } from "@/hooks/useTracking";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";

const ADMIN_PATHS = ["/dashboard", "/admin"];
const SCANNER_PATHS = ["/scanner"];

const Layout = ({ children }: { children: ReactNode }) => {
  useTracking();
  const { pathname } = useLocation();
  const { isAdmin } = useAuth();
  const { isScanner } = useUserRoles();

  const isAdminArea = isAdmin && ADMIN_PATHS.some((p) => pathname.startsWith(p));
  const isScannerArea = isScanner && SCANNER_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  if (isAdminArea) {
    return (
      <div className="flex min-h-dvh">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 pt-14 lg:pt-4" role="main">
            {children}
          </main>
        </div>
        <CookieConsent />
      </div>
    );
  }

  // Scanner-only users get a minimal layout (no full admin sidebar)
  if (isScannerArea && !isAdminArea) {
    return (
      <div className="min-h-dvh flex flex-col">
        <main className="flex-1" role="main">
          {children}
        </main>
        <CookieConsent />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main-content" className="skip-to-content">
        Zum Inhalt springen
      </a>
      <Navbar />
      <main id="main-content" className="flex-1 pt-16 md:pt-20" role="main" tabIndex={-1}>
        {children}
      </main>
      <Footer />
      <CookieConsent />
      <ChatBot />
    </div>
  );
};

export default Layout;
