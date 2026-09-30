import { appIcon } from "@/lib/app-icon";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ size: "192" }, { size: "512" }];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size } = await params;
  if (size !== "192" && size !== "512") {
    return new Response("Not found", { status: 404 });
  }
  return appIcon(Number(size));
}
