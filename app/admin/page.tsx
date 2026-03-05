"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const adminCards = [
  {
    title: "CAMs",
    description:
      "Add, edit, or remove Client Account Managers. CAMs appear in the onboarding intake form dropdown.",
    href: "/admin/cams",
    icon: "👤",
  },
  {
    title: "Channels",
    description:
      "Manage the list of retail channels available for client onboarding. Channels appear as multi-select options in the intake form.",
    href: "/admin/channels",
    icon: "🏷️",
  },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("oj_admin")) {
      router.replace("/admin/login");
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) return null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="text-xs font-bold text-oj-orange tracking-widest mb-1 uppercase">
            Admin
          </div>
          <h1 className="text-2xl font-bold text-oj-blue">Control Centre</h1>
          <p className="text-sm text-oj-muted mt-1">
            Manage CAMs, channels, and application settings.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm text-oj-muted hover:text-oj-dark border border-oj-border rounded-lg px-4 py-2 transition-colors"
          >
            ← Dashboard
          </Link>
          <button
            onClick={() => {
              localStorage.removeItem("oj_admin");
              router.push("/admin/login");
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
              <h2 className="text-lg font-bold text-oj-dark mb-2">
                {card.title}
              </h2>
              <p className="text-sm text-oj-muted leading-relaxed">
                {card.description}
              </p>
              <div className="mt-4 text-sm font-semibold text-oj-blue">
                Manage →
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
