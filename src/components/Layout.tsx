import { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import CookieConsent from "./CookieConsent";
import { useTracking } from "@/hooks/useTracking";

const Layout = ({ children }: { children: ReactNode }) => {
  useTracking();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16 md:pt-20">{children}</main>
      <Footer />
      <CookieConsent />
    </div>
  );
};

export default Layout;
