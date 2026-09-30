import type { Metadata } from "next";
import { DocumentShell } from "@/components/document-shell";
import { AccountPanel } from "@/components/account/account-panel";
import { brand } from "@/lib/brand-config";

export const metadata: Metadata = {
  title: `Your account — ${brand.name}`,
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <DocumentShell
      title="A place of your own."
      intro={`Your optional ${brand.name} account. Sign in with your email, separately from your Oura connection.`}
    >
      <AccountPanel />
    </DocumentShell>
  );
}
