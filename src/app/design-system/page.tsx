import { brand } from "@/lib/brand-config";
import type { Metadata } from "next";
import { DesignSystemShowcase } from "@/components/design-system-showcase";
import "./showcase.css";

export const metadata: Metadata = {
  title: `Design system — ${brand.name}`,
  description: `Živá knižnica komponentov, typografie a vzorov rozhrania ${brand.name}.`,
  robots: { index: false, follow: false },
};

export default function DesignSystemPage() {
  return <DesignSystemShowcase />;
}
