import type { Metadata } from "next";
import { brand } from "@/lib/brand-config";
export const metadata: Metadata = { title: `Day detail — ${brand.name}` };
export default function DayLayout({ children }: { children: React.ReactNode }) {
  return children;
}
