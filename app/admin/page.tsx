"use client";

import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { clearSession } from "@/lib/useAuth";
import { useRouter } from "next/navigation";

const adminCards = [
  {
    title: "CAMs",
    description: "Add, edit, or remove Client Account Managers. CAMs appear in the onboarding intake form dropdown.",
    href: "/admin/cams",
    icon: "👤",
  },
  {
    title: "Channels",
    description: "Manage the list of retail channels available for client onboarding. Channels appear as multi-select options in the intake form.",
    href: "/admin/channels",
    icon: "🏷️",
  },
  {
    title: "Users",
    description: "Create, edit, deactivate, and manage system users. Assign roles to control access.",
    href: "/admin/users",
    icon: "🔑",
  },
  {
    title: "Roles & Permissions",
    description: "Define roles and map permissions to control what each user can access within the portal.",
    href: "/admin/roles",
    icon: "🛡️",
  },
  {
    title: "Onboarding Checklist",
    description: "Manage the Main Onboarding Checklist — add, edit, enable or disable items that track client progress.",
    href: "/admin/checklist",
    icon: "✅",
  },
  {
    title: "Personnel Form",
    description: "Configure role options and custom fields for the client personnel data collection form.",
    href: "/admin/personnel",
    icon: "👥",
  },
  {
    title: "Activity Log",
    description: "View a full audit trail of system events — client creation, emails, SharePoint, Teams, checklist changes, and more.",
    href: "/admin/logs",
    icon: "📋",
  },
  {
    title: "Xero Integration",
    description: "Connect your Xero organisation so CAMs can push client billing data directly to Xero as Contacts.",
    href: "/admin/xero",
    icon: "🔗",
  },
  {
    title: "Legal Templates",
    description: "Upload the NDA Word template. Placeholders are filled automatically from the client's Cognito data when sent.",
    href: "/admin/legal",
    icon: "📄",
  },
];

export default function AdminDashboard() {
  const { session, ready } = useAuth();
  const router = useRouter();

  if (!ready) return null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="text-xs font-bold text-oj-orange tracking-widest mb-1 uppercase">Admin</div>
          <h1 className="text-2xl font-bold text-oj-blue">Control Centre</h1>
          <p className="text-sm text-oj-muted mt-1">
            Manage CAMs, channels, users, and application settings.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {session && (
            <span className="text-xs text-oj-muted border border-oj-border rounded-lg px-3 py-1.5 bg-oj-bg">
              {session.name} {session.surname} · {session.roleName}
            </span>
          )}
          <Link
            href="/"
            className="text-sm text-oj-muted hover:text-oj-dark border border-oj-border rounded-lg px-4 py-2 transition-colors"
          >
            ← Dashboard
          </Link>
          <button
            onClick={() => {
              clearSession();
              router.push("/login");
            }}
            className="text-sm text-oj-muted hover:text-oj-dark border border-oj-border rounded-lg px-4 py-2 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {adminCards.map((card) => (
          <Link key={card.title} href={card.href}>
            <div className="bg-oj-white border border-oj-border rounded-xl p-6 hover:shadow-md hover:border-oj-blue transition-all cursor-pointer h-full">
              <div className="text-3xl mb-3">{card.icon}</div>
              <h2 className="text-lg font-bold text-oj-dark mb-2">{card.title}</h2>
              <p className="text-sm text-oj-muted leading-relaxed">{card.description}</p>
              <div className="mt-4 text-sm font-semibold text-oj-blue">Manage →</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
