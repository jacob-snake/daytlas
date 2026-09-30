import { AnalyticsPreferences } from "@/components/analytics-consent";
import { brand } from "@/lib/brand-config";
import Link from "next/link";
import { DocumentShell } from "@/components/document-shell";
export const metadata = { title: `Privacy — ${brand.name}` };
export default function Privacy() {
  return (
    <DocumentShell
      title="Privacy, in plain sight."
      intro="Analysis on your device. A clear explanation of how your data gets there."
    >
      <section>
        <h2>What happens when you connect</h2>
        <p>
          Oura authenticates you on its own website. This installation’s server
          exchanges the authorization code for tokens, and relays your data
          requests to the Oura API. Tokens and health data pass through the
          server in transit; the application does not persist them in a server
          database or intentionally log their contents.
        </p>
        <p>
          The hosting provider still processes network traffic and may keep
          infrastructure or request logs. A public installation’s operator must
          configure hosting and logging appropriately. Self-hosting lets you
          choose that operator.
        </p>
      </section>
      <section>
        <h2>What stays in this browser</h2>
        <p>
          The app stores access and refresh tokens, connection settings and
          preferences in browser local storage. Retrieved health data is cached
          in IndexedDB for quicker repeat visits. This storage is not encrypted
          by {brand.name}. Other people with access to this browser profile,
          browser extensions or compromised scripts may be able to access it.
        </p>
        <p>
          Cache freshness checks are not automatic deletion. Data may remain
          until you clear it, disconnect or your browser removes site storage.
          Different devices and browser profiles have separate copies.
        </p>
      </section>
      <section>
        <h2>When you import a file</h2>
        <p>
          CSV and ZIP files are read in your browser. Supported daily
          measurements are shown in a preview and saved to IndexedDB only after
          you confirm. The file and its measurements are not uploaded to our
          server. Unsupported columns are not retained.
        </p>
        <p>
          An import is a snapshot, updated by uploading another file. A new
          import replaces the previous imported snapshot. Disconnecting and
          clearing local data removes it along with your other local app data.
          Keep your original export as a backup.
        </p>
      </section>
      <section>
        <h2>How insights are calculated</h2>
        <p>
          Trends, comparisons and correlations are computed locally using
          inspectable statistics. The application includes no advertising pixels
          or AI processing of your health data. Fonts are served with the app.
          The demo uses fictional data and makes no requests to Oura.
        </p>
      </section>
      <section id="analytics-settings" className="scroll-mt-8">
        <h2>Optional website and demo analytics</h2>
        <p>
          When enabled by the operator and allowed by you, selected interface
          actions on the public website and sample-data demo are sent to
          PostHog’s EU service. They include an action category, timestamp, and
          a random identifier held only in this page’s memory. This is
          pseudonymous telemetry, not a promise of anonymity.
        </p>
        <p>
          We do not send health values, selected goals, account details, page
          URLs or referrers. Oura-connected and imported-data sessions are
          excluded, including visits to the homepage while connected. There is
          no automatic click capture, session recording, advertising, or active
          onboarding experiment.
        </p>
        <p>
          Consent is saved locally for up to 180 days. No analytics request is
          made before permission, after decline, or when analytics is not
          configured. Requests expose your network address to the receiving
          service. The operator must enable PostHog’s discard-IP setting and
          review its processing terms and retention before activation.
          Withdrawing stops future capture but cannot recall events already
          delivered.
        </p>
        <AnalyticsPreferences />
      </section>
      <section>
        <h2>Delete or revoke access</h2>
        <p>
          Use “Disconnect & clear local data” in the footer of a connected
          session to remove {brand.name}’s local cache, credentials and
          preferences. Close other tabs if the browser reports a storage error.
          You can also clear this site’s data in your browser settings.
        </p>
        <p>
          Disconnecting locally does not delete your Oura records or revoke the
          grant at Oura. To revoke access, visit{" "}
          <a href="https://cloud.ouraring.com/">your Oura account</a>. Files you
          exported stay wherever you saved them.
        </p>
      </section>
      <section>
        <h2>External links and technical cookies</h2>
        <p>
          Signing in uses short-lived cookies to validate the authorization
          flow. External sites linked from {brand.name}, including Oura, GitHub,
          LinkedIn and Buy Me a Coffee, have their own privacy practices. They
          receive a request when you open their links.
        </p>
      </section>
      <section>
        <h2>Questions or security concerns</h2>
        <p>
          Review the <a href={brand.sourceUrl}>source code</a> and security
          documentation, or contact the operator of your installation. See{" "}
          <Link href="/about">the project story</Link> for the maintainer. Do
          not include health data, tokens or secrets in public issue reports.
        </p>
        <p className="text-xs text-muted-foreground">
          Application notice updated 30 September 2026. Public operators must
          provide their own applicable identity, contact and hosting details
          before accepting users.
        </p>
      </section>
    </DocumentShell>
  );
}
