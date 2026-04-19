"use client";

const SKIP_KEYS = new Set([
  "Id", "InternalId", "FormId", "Form", "Organization",
  "Entry", "EntryId", "Status", "AdminStatus",
  "DateCreated", "DateUpdated", "DateSubmitted",
  "Revision", "ContentType", "ExternalId",
]);

const STRUCTURED_KEYS = new Set([
  "CompanyName", "TradingAs", "CompanyRegistrationNumber", "VATNumber2",
  "Email", "Phone", "Website", "Address",
  "BillingContactPerson", "ContractContactPerson",
]);

function getDisplayLabel(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
}

function formatAddress(addr: unknown): string {
  if (!addr) return "";
  if (typeof addr === "string") return addr;
  if (typeof addr === "object") {
    const a = addr as Record<string, string>;
    return [a.Line1, a.Line2, a.City, a.Region, a.PostalCode].filter(Boolean).join(", ");
  }
  return String(addr);
}

function formatContact(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    const c = val as Record<string, string>;
    const name = [c.FirstName, c.LastName].filter(Boolean).join(" ");
    return [name, c.EmailAddress].filter(Boolean).join(" — ");
  }
  return String(val);
}

function CognitoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-oj-muted mb-0.5">{label}</p>
      <p className="text-sm text-oj-dark break-words">{value}</p>
    </div>
  );
}

export default function CognitoDataDisplay({ data }: { data: Record<string, unknown> }) {
  const s = (key: string) => {
    const v = data[key];
    if (!v) return "";
    if (typeof v === "string") return v;
    return String(v);
  };

  const companyName = s("CompanyName");
  const tradingAs = s("TradingAs");
  const regNo = s("CompanyRegistrationNumber");
  const vatNo = s("VATNumber2");
  const email = s("Email");
  const phone = s("Phone");
  const website = s("Website");
  const address = formatAddress(data["Address"]);
  const billingContact = formatContact(data["BillingContactPerson"]);
  const contractContact = formatContact(data["ContractContactPerson"]);

  const extraFields = Object.entries(data).filter(
    ([k, v]) => !SKIP_KEYS.has(k) && !STRUCTURED_KEYS.has(k) && v !== null && v !== undefined && v !== ""
  );

  const hasCompany = companyName || tradingAs || regNo || vatNo || email || phone || website;
  const hasContacts = billingContact || contractContact;

  if (!hasCompany && !address && !hasContacts && extraFields.length === 0) {
    return <div className="px-5 py-4 text-sm text-oj-muted">No displayable fields in this entry.</div>;
  }

  return (
    <div className="divide-y divide-oj-border">
      {hasCompany && (
        <div className="px-5 py-4">
          <p className="text-xs font-bold text-oj-muted uppercase tracking-wide mb-3">Company Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {companyName && <CognitoField label="Company Name" value={companyName} />}
            {tradingAs && <CognitoField label="Trading As" value={tradingAs} />}
            {regNo && <CognitoField label="Registration Number" value={regNo} />}
            {vatNo && <CognitoField label="VAT Number" value={vatNo} />}
            {email && <CognitoField label="Email" value={email} />}
            {phone && <CognitoField label="Phone" value={phone} />}
            {website && <CognitoField label="Website" value={website} />}
          </div>
        </div>
      )}
      {address && (
        <div className="px-5 py-4">
          <p className="text-xs font-bold text-oj-muted uppercase tracking-wide mb-2">Physical Address</p>
          <p className="text-sm text-oj-dark">{address}</p>
        </div>
      )}
      {hasContacts && (
        <div className="px-5 py-4">
          <p className="text-xs font-bold text-oj-muted uppercase tracking-wide mb-3">Contact Persons</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {billingContact && <CognitoField label="Billing Contact" value={billingContact} />}
            {contractContact && <CognitoField label="Contract Contact" value={contractContact} />}
          </div>
        </div>
      )}
      {extraFields.length > 0 && (
        <div className="px-5 py-4">
          <p className="text-xs font-bold text-oj-muted uppercase tracking-wide mb-3">Additional Data</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {extraFields.map(([k, v]) => (
              <CognitoField
                key={k}
                label={getDisplayLabel(k)}
                value={typeof v === "object" ? JSON.stringify(v) : String(v)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
