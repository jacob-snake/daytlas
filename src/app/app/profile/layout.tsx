import { brand } from "@/lib/brand-config";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: `Your profile — ${brand.name}`,
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
