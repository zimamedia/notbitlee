import { BarChart3, Home, Link2, LogOut, Menu, Plus, Search, Settings, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useBrand } from "@/components/brand-context.ts";
import { BrandMark } from "@/components/brand.tsx";
import { useSession } from "@/components/session-context.ts";
import { Button } from "@/components/ui/button.tsx";
import { api } from "@/lib/api.ts";
import { APP_VERSION, PROJECT } from "@/lib/project.ts";
import { cn } from "@/lib/utils.ts";

const NAV = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/links", label: "Links", icon: Link2, end: false },
  { to: "/analytics", label: "Analytics", icon: BarChart3, end: false },
  { to: "/settings", label: "Settings", icon: Settings, end: false },
] as const;

export function Shell() {
  const session = useSession();
  const { brand } = useBrand();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [lastPath, setLastPath] = useState(location.pathname);

  if (location.pathname !== lastPath) {
    setLastPath(location.pathname);
    setMenuOpen(false);
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    window.location.assign("/admin/login");
  }

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const query = search.trim();
    void navigate(query ? `/links?q=${encodeURIComponent(query)}` : "/links");
  }

  const initial = (session.name || session.email).slice(0, 1).toUpperCase();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-line bg-surface transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          menuOpen ? "translate-x-0 shadow-xl" : "-translate-x-full",
        )}
        aria-label="Main"
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link to="/" className="min-w-0">
            <BrandMark brand={brand} />
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <X aria-hidden="true" size={18} />
          </Button>
        </div>
        <div className="px-4 pt-2 pb-4">
          <Button asChild className="w-full" size="lg">
            <Link to="/links/new">
              <Plus aria-hidden="true" size={18} />
              Create new
            </Link>
          </Button>
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-brand-soft text-brand-strong" : "text-muted hover:bg-hover hover:text-ink",
                )
              }
            >
              <item.icon aria-hidden="true" size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        {brand.showPoweredBy ? (
          <p className="px-6 pb-5 text-xs text-faint">
            Powered by{" "}
            <a className="font-medium hover:text-muted" href={PROJECT.repo} target="_blank" rel="noreferrer">
              NotBitLee
            </a>{" "}
            <Link to="/settings#about" className="hover:text-muted">
              v{APP_VERSION}
            </Link>
          </p>
        ) : null}
      </aside>
      {menuOpen ? <button type="button" className="fixed inset-0 z-20 bg-ink/30 lg:hidden" aria-label="Close menu" onClick={() => setMenuOpen(false)} /> : null}

      <div className="min-w-0">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu aria-hidden="true" size={20} />
          </Button>
          <form className="relative max-w-md flex-1" role="search" onSubmit={onSearch}>
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" size={17} />
            <input
              aria-label="Search links"
              className="h-9 w-full rounded-md border border-line bg-canvas pr-3 pl-9 text-sm outline-none placeholder:text-faint focus-visible:border-brand focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-brand/25"
              placeholder="Search links"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </form>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden max-w-56 truncate text-sm text-muted md:inline">{session.email}</span>
            <span className="grid size-8 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand-strong" aria-hidden="true">
              {initial}
            </span>
            <Button variant="ghost" size="sm" onClick={() => void logout()}>
              <LogOut aria-hidden="true" size={16} />
              <span className="max-sm:sr-only">Sign out</span>
            </Button>
          </div>
        </header>
        {session.simulated ? (
          <p className="border-b border-line bg-brand-soft px-4 py-2 text-center text-sm text-brand-strong">
            Local preview: you are signed in as {session.email} because no sign-in is set up. Add ADMIN_EMAIL and ADMIN_PASSWORD to .dev.vars to try the
            real login.
          </p>
        ) : null}
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
