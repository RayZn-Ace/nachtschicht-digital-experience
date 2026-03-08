import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard, Calendar, ShoppingCart, Ticket, Tags,
  Image, Mail, FileText, Flag, Sofa, Wine, Sparkles, Users,
  Search, BarChart3, TrendingUp, Receipt, Settings, QrCode,
  ArrowLeft, LogOut, Menu, X, FileSpreadsheet,
} from "lucide-react";
import { useState } from "react";

interface AdminSubItem {
  label: string;
  tab: string;
  icon: any;
}

interface AdminCategory {
  label: string;
  icon: any;
  items: AdminSubItem[];
}

const ADMIN_CATEGORIES: AdminCategory[] = [
  {
    label: "Events & Tickets",
    icon: Calendar,
    items: [
      { label: "Events", tab: "events", icon: Calendar },
      { label: "Ticketcenter", tab: "ticketcenter", icon: ShoppingCart },
      { label: "Rabattcodes", tab: "codes", icon: Ticket },
      { label: "Tags", tab: "tags", icon: Tags },
    ],
  },
  {
    label: "Inhalte",
    icon: Image,
    items: [
      { label: "Fotoalben", tab: "albums", icon: Image },
      { label: "Newsletter", tab: "newsletter", icon: Mail },
      { label: "Muttizettel", tab: "u18", icon: FileText },
      { label: "Meldungen", tab: "reports", icon: Flag },
    ],
  },
  {
    label: "Betrieb",
    icon: Sofa,
    items: [
      { label: "Lounges", tab: "lounges", icon: Sofa },
      { label: "Getränke", tab: "drinks", icon: Wine },
      { label: "Feiertage", tab: "holidays", icon: Sparkles },
      { label: "Bewerber", tab: "applicants", icon: Users },
      { label: "Fundgrube", tab: "lostfound", icon: Search },
    ],
  },
  {
    label: "Controlling & Tracking",
    icon: TrendingUp,
    items: [
      { label: "Controlling", tab: "controlling", icon: BarChart3 },
      { label: "Umsatz", tab: "revenue", icon: TrendingUp },
      { label: "Kundendaten", tab: "customers", icon: Users },
      { label: "Rechnungen", tab: "invoiceconfig", icon: Receipt },
      { label: "Tracking", tab: "tracking", icon: Settings },
      { label: "CSV-Migration", tab: "csvmigration", icon: FileSpreadsheet },
    ],
  },
];

const AdminSidebar = () => {
  const location = useLocation();
  const { signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentTab = new URLSearchParams(location.search).get("tab") || "events";

  const isActive = (path: string, tab?: string) => {
    if (tab) return location.pathname === "/admin" && currentTab === tab;
    return location.pathname === path;
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 pb-2 flex items-center justify-between">
        {!collapsed && (
          <span className="font-display text-lg tracking-widest text-primary">ADMIN</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label={collapsed ? "Sidebar ausklappen" : "Sidebar einklappen"}
        >
          <Menu size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
        {/* Dashboard */}
        <Link
          to="/dashboard"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isActive("/dashboard")
              ? "bg-primary/15 text-primary"
              : "text-foreground/70 hover:bg-muted hover:text-foreground"
          }`}
        >
          <LayoutDashboard size={18} className="shrink-0" />
          {!collapsed && "Dashboard"}
        </Link>

        {/* Categories */}
        {ADMIN_CATEGORIES.map((cat) => (
          <div key={cat.label} className="pt-3">
            {!collapsed && (
              <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                {cat.label}
              </div>
            )}
            {collapsed && <div className="border-t border-border/30 mx-2 mb-2" />}
            <div className="space-y-0.5">
              {cat.items.map((item) => {
                const Icon = item.icon;
                const active = isActive("/admin", item.tab);
                return (
                  <Link
                    key={item.tab}
                    to={`/admin?tab=${item.tab}`}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                      active
                        ? "bg-primary/15 text-primary font-medium"
                        : "text-foreground/70 hover:bg-muted hover:text-foreground"
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon size={16} className="shrink-0" />
                    {!collapsed && item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Scanner */}
        <div className="pt-3">
          {collapsed && <div className="border-t border-border/30 mx-2 mb-2" />}
          <Link
            to="/scanner"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive("/scanner")
                ? "bg-primary/15 text-primary"
                : "text-foreground/70 hover:bg-muted hover:text-foreground"
            }`}
          >
            <QrCode size={18} className="shrink-0" />
            {!collapsed && "Scanner"}
          </Link>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-border/30 p-3 space-y-1">
        <Link
          to="/"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} className="shrink-0" />
          {!collapsed && "Zur Website"}
        </Link>
        <button
          onClick={signOut}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full"
        >
          <LogOut size={16} className="shrink-0" />
          {!collapsed && "Abmelden"}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-3 left-3 z-[60] p-2 rounded-lg bg-card border border-border shadow-lg text-foreground"
        aria-label="Admin-Menü"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-[55] backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-[56] h-dvh bg-sidebar border-r border-sidebar-border
          transition-all duration-200
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${collapsed ? "w-[60px]" : "w-[220px]"}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  );
};

export default AdminSidebar;
