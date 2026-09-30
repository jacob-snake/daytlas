import type { Metadata } from "next";
import Link from "next/link";
import { DocumentShell } from "@/components/document-shell";
import { DemoButton } from "@/components/demo-button";
import { brand } from "@/lib/brand-config";

export const metadata: Metadata = {
  title: `Add to your home screen — ${brand.name}`,
  description: `Keep ${brand.name} a tap away on iPhone, iPad or Android.`,
};

export default function InstallPage() {
  return (
    <DocumentShell
      title="Your days. A tap away."
      intro={`Add ${brand.name} to your home screen and open it in its own window. The same views, made for your phone too.`}
    >
      <section aria-labelledby="install-iphone">
        <h2 id="install-iphone">On iPhone or iPad</h2>
        <ol className="list-decimal space-y-4 pl-5 marker:text-muted-foreground">
          <li>Open this website in Safari.</li>
          <li>
            Open Safari’s menu if needed, then tap <strong>Share</strong>.
          </li>
          <li>
            Choose <strong>Add to Home Screen</strong>. If it is missing, use
            <strong> Edit Actions</strong> to add it.
          </li>
          <li>
            Keep <strong>Open as Web App</strong> on if shown, then tap
            <strong> Add</strong>.
          </li>
        </ol>
        <p className="mt-5 text-muted-foreground">
          Open the new icon to try the demo. Your Safari connection and
          preferences do not transfer to the home-screen app; connect Oura there
          when you are ready to use your own data.
        </p>
      </section>

      <section aria-labelledby="install-android">
        <h2 id="install-android">On Android or desktop</h2>
        <p>
          Open your browser’s menu and choose <strong>Install app</strong> or
          <strong> Add to Home screen</strong>. The wording depends on your
          browser. If installation is not offered, you can still use every view
          in a regular browser tab.
        </p>
      </section>

      <section
        aria-labelledby="install-connection"
        className="rounded-3xl border border-border bg-secondary/40 p-5 sm:p-6"
      >
        <h2 id="install-connection">Keep a connection handy</h2>
        <p>
          You need internet to open the app and refresh your data. Home-screen
          installation does not enable offline access, automatic syncing or push
          notifications. While offline, a view already open may still show its
          last loaded data.
        </p>
        <p>
          Your goals and Oura connection stay in this browser or installed app.
          They do not yet sync to your other devices.
        </p>
      </section>

      <div className="flex flex-wrap items-center gap-5">
        <DemoButton />
        <Link
          href="/app"
          className="inline-flex min-h-11 items-center font-semibold"
        >
          Open {brand.name}
        </Link>
      </div>
    </DocumentShell>
  );
}
