import Link from "next/link";

const phases = [
  {
    number: "01",
    title: "Client Intake",
    description:
      "CAM captures initial client details, channel selection, and contact information to initiate the onboarding journey.",
    href: "/onboarding/new",
    status: "active" as const,
    owner: "OJ Internal",
    icon: "📋",
  },
  {
    number: "02",
    title: "Cognito Data Sync",
    description:
      "Pull and verify client data from Cognito form submissions to pre-populate onboarding fields.",
    href: "#",
    status: "coming-soon" as const,
    owner: "OJ Internal",
    icon: "🔄",
  },
  {
    number: "03",
    title: "Client Portal Setup",
    description:
      "Configure the client-facing portal with branding, contacts, and initial access credentials.",
    href: "#",
    status: "coming-soon" as const,
    owner: "OJ + Client",
    icon: "🏛️",
  },
  {
    number: "04",
    title: "Data Configuration",
    description:
      "Define store lists, product ranges, reporting channels, and data feed parameters.",
    href: "#",
    status: "coming-soon" as const,
    owner: "OJ Internal",
    icon: "⚙️",
  },
  {
    number: "05",
    title: "Client Sign-off",
    description:
      "Client reviews and approves the onboarding configuration before go-live.",
    href: "#",
    status: "coming-soon" as const,
    owner: "Client",
    icon: "✅",
  },
];

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Hero */}
      <div className="mb-10">
        <p className="text-xs font-bold text-oj-orange tracking-widest mb-2 uppercase">
          OuterJoin ARIA
        </p>
        <h1 className="text-3xl font-bold text-oj-blue mb-2">
          Client Onboarding
        </h1>
        <p className="text-oj-muted text-base max-w-xl">
          Manage the end-to-end onboarding process for new ARIA clients. Select
          a phase below to get started.
        </p>
      </div>

      {/* Phase cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {phases.map((phase) => (
          <PhaseCard key={phase.number} {...phase} />
        ))}
      </div>

      {/* Admin link */}
      <div className="mt-12 pt-8 border-t border-oj-border flex items-center justify-between">
        <p className="text-sm text-oj-muted">
          Need to manage CAMs or channels?
        </p>
        <Link
          href="/admin"
          className="text-sm font-semibold text-oj-blue hover:text-oj-blue-hover underline underline-offset-2"
        >
          Control Centre →
        </Link>
      </div>
    </div>
  );
}

function PhaseCard({
  number,
  title,
  description,
  href,
  status,
  owner,
  icon,
}: {
  number: string;
  title: string;
  description: string;
  href: string;
  status: "active" | "coming-soon";
  owner: string;
  icon: string;
}) {
  const isActive = status === "active";

  const card = (
    <div
      className={`rounded-xl border p-6 h-full flex flex-col gap-4 transition-all ${
        isActive
          ? "bg-oj-white border-oj-border shadow-sm hover:shadow-md hover:border-oj-blue cursor-pointer"
          : "bg-oj-white border-oj-border opacity-55 cursor-not-allowed"
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="text-2xl">{icon}</span>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            isActive ? "bg-oj-blue text-white" : "bg-oj-border text-oj-muted"
          }`}
        >
          {isActive ? "Active" : "Coming Soon"}
        </span>
      </div>
      <div>
        <div className="text-xs font-bold text-oj-orange tracking-wider mb-1">
          PHASE {number}
        </div>
        <h2 className="text-lg font-bold text-oj-dark mb-2">{title}</h2>
        <p className="text-sm text-oj-muted leading-relaxed">{description}</p>
      </div>
      <div className="mt-auto">
        <span className="text-xs text-oj-muted">
          Owner:{" "}
          <strong className="text-oj-dark font-semibold">{owner}</strong>
        </span>
      </div>
    </div>
  );

  return isActive ? <Link href={href}>{card}</Link> : <div>{card}</div>;
}
