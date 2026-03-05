import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-oj-white border-b border-oj-border shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image
            src="/oj-logo.jpg"
            alt="OuterJoin"
            width={220}
            height={52}
            className="h-11 w-auto object-contain"
            priority
          />
        </Link>
        <Image
          src="/aria-logo.png"
          alt="ARIA — Automated Retail Insights Assistant"
          width={120}
          height={52}
          className="h-11 w-auto object-contain"
          priority
        />
      </div>
    </header>
  );
}
