import { redirect } from "next/navigation";

// Old links now enter the same connection flow. Installation guidance lives in README.
export default function Setup() {
  redirect("/connect");
}
