import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import { Link, NavLink, Outlet, useLocation, useParams } from "react-router";
import { logout } from "../api/auth";
import { useUser } from "../context/UserManager";
import { CheckIcon, ChevronUpDownIcon, CloseIcon, DocsIcon, EntriesIcon, KeyIcon, MenuIcon, OverviewIcon, PlusIcon, SignOutIcon, TeamIcon } from "./ui/icons";

type NavItem = { label: string; to: string; icon: ComponentType<SVGProps<SVGSVGElement>>; end?: boolean };

const navItemClass = (isActive: boolean) =>
  [
    "group flex h-8 items-center gap-2 rounded-md px-2 text-sm font-medium outline-none transition-colors duration-150 motion-reduce:transition-none",
    "focus-visible:ring-2 focus-visible:ring-fuchsia-600 focus-visible:ring-offset-1 focus-visible:ring-offset-[#f7f7f5]",
    isActive ? "bg-[#e7e7e5] text-neutral-950" : "text-neutral-600 hover:bg-[#ececea] hover:text-neutral-950",
  ].join(" ");

export function BrandMark({ className = "size-7" }: { className?: string }) {
  return <img src="/favicon.svg" alt="" className={`shrink-0 ${className}`} />;
}

/** Workspace identity that doubles as the organization switcher. */
function OrgSwitcher() {
  const { user } = useUser();
  const { orgId } = useParams();
  const current = user.organizations.find((o) => o.id === orgId);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-1.5 py-1 text-left outline-none hover:bg-[#ececea] focus-visible:ring-2 focus-visible:ring-fuchsia-600 data-[state=open]:bg-[#e7e7e5]">
        <BrandMark />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold text-neutral-950">{current?.name ?? "Firebook"}</p>
          <p className="truncate text-[11px] text-neutral-500">Firebook workspace</p>
        </div>
        <ChevronUpDownIcon className="size-4 shrink-0 text-neutral-400" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 w-60 rounded-lg border border-neutral-200 bg-white p-1 text-sm shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
        >
          <DropdownMenu.Label className="px-2 pb-1 pt-1.5 text-xs font-medium text-neutral-500">{user.email}</DropdownMenu.Label>
          {user.organizations.map((org) => (
            <DropdownMenu.Item key={org.id} asChild>
              <Link to={`/o/${org.id}`} className="flex h-8 items-center gap-2 rounded-md px-2 text-neutral-800 outline-none data-[highlighted]:bg-neutral-100">
                <span className="grid size-5 place-items-center rounded bg-neutral-100 text-[10px] font-semibold text-neutral-600">
                  {org.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate">{org.name}</span>
                {org.id === orgId ? <CheckIcon className="size-4 text-neutral-600" /> : null}
              </Link>
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-neutral-200" />
          <DropdownMenu.Item asChild>
            <Link
              to="/new"
              className="flex h-8 items-center gap-2 rounded-md px-2 text-neutral-600 outline-none data-[highlighted]:bg-neutral-100 data-[highlighted]:text-neutral-950"
            >
              <PlusIcon className="size-4" />
              New organization
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function SidebarContent({ onClose, onNavigate }: { onClose?: () => void; onNavigate?: () => void }) {
  const { user } = useUser();
  const { orgId } = useParams();
  const base = `/o/${orgId}`;

  const sections: { title: string; items: NavItem[] }[] = [
    {
      title: "Books",
      items: [
        { label: "Overview", to: base, icon: OverviewIcon, end: true },
        { label: "Entries", to: `${base}/entries`, icon: EntriesIcon },
      ],
    },
    {
      title: "Developers",
      items: [
        { label: "API keys", to: `${base}/api-keys`, icon: KeyIcon },
        { label: "Docs", to: `${base}/docs`, icon: DocsIcon },
      ],
    },
    {
      title: "Settings",
      items: [{ label: "Team", to: `${base}/settings`, icon: TeamIcon }],
    },
  ];

  const signOut = () => {
    if (window.confirm("Sign out of Firebook?")) void logout();
  };

  return (
    <div className="flex h-full flex-col text-neutral-700">
      <div className="flex h-14 items-center gap-1 px-2">
        <OrgSwitcher />
        {onClose ? (
          <button
            className="grid size-8 place-items-center rounded-md text-neutral-500 outline-none hover:bg-neutral-200 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-fuchsia-600"
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <CloseIcon className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="space-y-4 px-2 pt-3">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-2 pb-1.5 text-xs font-medium text-neutral-500">{section.title}</p>
            <nav className="space-y-0.5" aria-label={section.title}>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink className={({ isActive }) => navItemClass(isActive)} key={item.to} to={item.to} end={item.end} onClick={onNavigate}>
                    <Icon className="size-[18px] shrink-0 text-neutral-500 group-hover:text-neutral-700" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      <div className="mt-auto border-t border-neutral-200/80 p-2">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="grid size-7 shrink-0 place-items-center rounded-full bg-fuchsia-100 text-xs font-semibold text-fuchsia-800" aria-hidden="true">
            {user.firstName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-xs font-medium text-neutral-800">
              {user.firstName} {user.lastName}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-neutral-500" title={user.email}>
              {user.email}
            </p>
          </div>
        </div>
        <button className={`${navItemClass(false)} w-full`} type="button" onClick={signOut}>
          <SignOutIcon className="size-[18px] shrink-0 text-neutral-500" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export function AppLayout() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const location = useLocation();

  // close the drawer on navigation
  useEffect(() => setIsMobileNavOpen(false), [location.pathname]);

  useEffect(() => {
    if (!isMobileNavOpen) return;
    // keep the page still behind the drawer and let Escape dismiss it
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && setIsMobileNavOpen(false);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMobileNavOpen]);

  return (
    <div className="min-h-dvh bg-white font-sans text-neutral-950 antialiased">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-neutral-200/80 bg-[#f7f7f5] lg:block">
        <SidebarContent />
      </aside>

      {isMobileNavOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-neutral-950/25" type="button" onClick={() => setIsMobileNavOpen(false)} aria-hidden="true" tabIndex={-1} />
          <aside className="absolute inset-y-0 left-0 w-[min(18rem,calc(100vw-3rem))] border-r border-neutral-200 bg-[#f7f7f5] shadow-lg">
            <SidebarContent onClose={() => setIsMobileNavOpen(false)} onNavigate={() => setIsMobileNavOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="min-h-dvh lg:pl-64">
        <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-neutral-200/80 bg-white/95 px-3 backdrop-blur-sm lg:hidden">
          <button
            className="grid size-8 place-items-center rounded-md text-neutral-600 outline-none hover:bg-neutral-100 hover:text-neutral-950 focus-visible:ring-2 focus-visible:ring-fuchsia-600"
            type="button"
            onClick={() => setIsMobileNavOpen(true)}
            aria-label="Open navigation"
            aria-expanded={isMobileNavOpen}
          >
            <MenuIcon className="size-5" />
          </button>
          <BrandMark className="size-6" />
          <p className="text-sm font-semibold text-neutral-900">Firebook</p>
        </header>

        <main className="mx-auto w-full max-w-[90rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
