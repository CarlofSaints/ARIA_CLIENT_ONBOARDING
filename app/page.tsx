"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth, clearSession } from "@/lib/useAuth";
import { useRouter } from "next/navigation";
import ScoreGauge from "@/components/ScoreGauge";

type Client = {
  id: string;
  name: string;
  camId: string;
  channelIds: string[];
  startDate: string;
  status: string;
  checklist: Record<string, { completed: boolean; channelStates?: Record<string, { completed: boolean }> }>;
};

type ChecklistItemDef = {
  id: string;
  section: string;
  type: string;
  dynamic: boolean;
  active: boolean;
  order: number;
};

type CAM = { id: string; name: string; surname: string };

const phases = [
  { number: "01", title: "Client Intake", description: "CAM captures initial client details, channel selection, and contact information.", href: "/onboarding/new", status: "active" as const, owner: "OJ Internal", icon: "📋" },
  { number: "02", title: "Cognito Data Sync", description: "Pull and verify client data from Cognito form submissions.", href: "#", status: "coming-soon" as const, owner: "OJ Internal", icon: "🔄" },
  { number: "03", title: "Client Portal Setup", description: "Configure the client-facing portal with branding and access credentials.", href: "#", status: "coming-soon" as const, owner: "OJ + Client", icon: "🏛️" },
  { number: "04", title: "Data Configuration", description: "Define store lists, product ranges, reporting channels, and data feeds.", href: "#", status: "coming-soon" as const, owner: "OJ Internal", icon: "⚙️" },
  { number: "05", title: "Client Sign-off", description: "Client reviews and approves the onboarding configuration before go-live.", href: "#", status: "coming-soon" as const, owner: "Client", icon: "✅" },
];

function computeScore(
  defs: ChecklistItemDef[],
  checklist: Record<string, { completed: boolean; channelStates?: Record<string, { completed: boolean }> }>,
  channelIds: string[]
): number {
  const active = defs.filter((i) => i.active);
  if (active.length === 0) return 0;
  let total = 0, earned = 0;
  for (const item of active) {
    total += 1;
    const state = checklist[item.id];
    if (item.dynamic) {
      if (state?.channelStates && channelIds.length > 0) {
        const done = channelIds.filter((cId) => state.channelStates![cId]?.completed).length;
        earned += done / channelIds.length;
      }
    } else {
      if (state?.completed) earned += 1;
    }
  }
  return Math.round((earned / total) * 100);
}

export default function HomePage() {
  const { session, ready } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [defs, setDefs] = useState<ChecklistItemDef[]>([]);
  const [cams, setCams] = useState<CAM[]>([]);

  useEffect(() => {
    if (!ready) return;
    Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/checklist").then((r) => r.json()),
      fetch("/api/cams").then((r) => r.json()),
    ]).then(([c, d, cm]) => {
      setClients(c);
      setDefs(d);
      setCams(cm);
    });
  }, [ready]);

  if (!ready) return null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Hero + sign-out */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <p className="text-xs font-bold text-oj-orange tracking-widest mb-2 uppercase">OuterJoin ARIA</p>
          <h1 className="text-3xl font-bold text-oj-blue mb-2">Client Onboarding</h1>
          <p className="text-oj-muted text-base max-w-xl">
            Manage the end-to-end onboarding process for new ARIA clients.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {session && (
            <span className="text-xs text-oj-muted border border-oj-border rounded-lg px-3 py-1.5 bg-oj-white">
              {session.name} {session.surname}
            </span>
          )}
          <button
            onClick={() => { clearSession(); router.push("/login"); }}
            className="text-sm text-oj-muted hover:text-oj-dark border border-oj-border rounded-lg px-4 py-2 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* My Clients */}
      {clients.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-oj-dark">Clients</h2>
            <Link href="/onboarding/new" className="text-sm font-semibold text-oj-blue hover:text-oj-blue-hover">
              + New Client
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => {
              const score = computeScore(defs, client.checklist ?? {}, client.channelIds);
              const cam = cams.find((c) => c.id === client.camId);
              return (
                <Link key={client.id} href={`/clients/${client.id}`}>
                  <div className="bg-oj-white border border-oj-border rounded-xl p-5 hover:shadow-md hover:border-oj-blue transition-all cursor-pointer">
                    <div className="flex items-start gap-4">
                      <ScoreGauge score={score} size={64} strokeWidth={7} />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-oj-dark text-sm leading-tight truncate">{client.name}</h3>
                        {cam && (
                          <p className="text-xs text-oj-muted mt-0.5 truncate">{cam.name} {cam.surname}</p>
                        )}
                        <p className="text-xs text-oj-muted mt-0.5">{client.startDate}</p>
                        <span className={`mt-1.5 inline-flex text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                          client.status === "live" ? "bg-green-100 text-green-700" :
                          client.status === "active" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {client.status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 bg-oj-bg rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${score}%`,
                          backgroundColor: `hsl(${(score / 100) * 120}, 75%, 42%)`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-oj-muted mt-1">{score}% complete</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {clients.length === 0 && (
        <div className="bg-oj-white border border-oj-border rounded-xl p-8 text-center mb-12">
          <p className="text-oj-muted text-sm mb-3">No clients onboarded yet.</p>
          <Link href="/onboarding/new"
            className="bg-oj-blue text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-oj-blue-hover transition-colors">
            Create First Client
          </Link>
        </div>
      )}

      {/* Phase cards */}
      <div className="mb-10">
        <h2 className="text-lg font-bold text-oj-dark mb-4">Onboarding Phases</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {phases.map((phase) => (
            <PhaseCard key={phase.number} {...phase} />
          ))}
        </div>
      </div>

      {/* Admin link */}
      <div className="pt-8 border-t border-oj-border flex items-center justify-between">
        <p className="text-sm text-oj-muted">Need to manage CAMs, channels, or users?</p>
        <Link href="/admin" className="text-sm font-semibold text-oj-blue hover:text-oj-blue-hover underline underline-offset-2">
          Control Centre →
        </Link>
      </div>
    </div>
  );
}

function PhaseCard({ number, title, description, href, status, owner, icon }: {
  number: string; title: string; description: string; href: string;
  status: "active" | "coming-soon"; owner: string; icon: string;
}) {
  const isActive = status === "active";
  const card = (
    <div className={`rounded-xl border p-6 h-full flex flex-col gap-4 transition-all ${
      isActive ? "bg-oj-white border-oj-border shadow-sm hover:shadow-md hover:border-oj-blue cursor-pointer"
               : "bg-oj-white border-oj-border opacity-55 cursor-not-allowed"}`}>
      <div className="flex items-start justify-between">
        <span className="text-2xl">{icon}</span>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
          isActive ? "bg-oj-blue text-white" : "bg-oj-border text-oj-muted"}`}>
          {isActive ? "Active" : "Coming Soon"}
        </span>
      </div>
      <div>
        <div className="text-xs font-bold text-oj-orange tracking-wider mb-1">PHASE {number}</div>
        <h2 className="text-lg font-bold text-oj-dark mb-2">{title}</h2>
        <p className="text-sm text-oj-muted leading-relaxed">{description}</p>
      </div>
      <div className="mt-auto">
        <span className="text-xs text-oj-muted">Owner: <strong className="text-oj-dark font-semibold">{owner}</strong></span>
      </div>
    </div>
  );
  return isActive ? <Link href={href}>{card}</Link> : <div>{card}</div>;
}
