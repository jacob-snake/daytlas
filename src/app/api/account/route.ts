import { accountConfiguration } from "@/lib/account/config";
import { accountHandlers } from "@/lib/account/handler";
import { createAccountProvider } from "@/lib/account/server";

export const dynamic = "force-dynamic";
export const { GET, POST } = accountHandlers(
  accountConfiguration,
  createAccountProvider,
);
