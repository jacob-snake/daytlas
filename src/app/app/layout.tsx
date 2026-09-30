import { brand } from "@/lib/brand-config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Your overview — ${brand.name}`,
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
