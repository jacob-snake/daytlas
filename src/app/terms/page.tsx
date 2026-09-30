import { brand } from "@/lib/brand-config";
import { DocumentShell } from "@/components/document-shell";
export const metadata = { title: `Terms — ${brand.name}` };
export default function Terms() {
  return (
    <DocumentShell
      title="A few clear terms."
      intro={`${brand.name} is independent, open-source software for exploring your own recorded data.`}
    >
      <section>
        <h2>Independent software</h2>
        <p>
          {brand.name} is not affiliated with, endorsed by or approved by Ōura
          Health Oy or Ouraring Inc. Oura names and marks belong to their
          respective owners. The source is available under the MIT license.
        </p>
      </section>
      <section>
        <h2>Your data and account</h2>
        <p>
          Only connect an account you are authorized to access. Oura’s
          membership, permissions, API limits and availability determine which
          data is available. Use of Oura data remains subject to the{" "}
          <a href="https://cloud.ouraring.com/legal/api-agreement">
            Oura API and MCP Agreement
          </a>{" "}
          and applicable Oura terms. Self-hosting does not remove these
          obligations.
        </p>
      </section>
      <section>
        <h2>Understanding the numbers</h2>
        <p>
          This application is not a medical device and does not provide medical
          advice, diagnosis or treatment. Comparisons describe recorded data and
          may be affected by missing readings, sensor estimates and other
          factors. Associations do not establish that a habit caused a change.
          Demo values are fictional.
        </p>
      </section>
      <section>
        <h2>Provided as is</h2>
        <p>
          To the extent permitted by law, the software is provided “as is”,
          without warranties of merchantability, fitness for a particular
          purpose or non-infringement. The authors and third-party service
          providers, including Oura, disclaim liability for indirect,
          consequential, special or punitive damages. Nothing here excludes
          rights or liabilities that cannot lawfully be excluded.
        </p>
        <p>
          Availability, features and API access may change. Keep copies of
          exports that matter to you; browser storage can be cleared by you or
          your browser.
        </p>
      </section>
      <section>
        <h2>About this notice</h2>
        <p>
          This notice describes the software project. A public installation’s
          operator is responsible for any additional terms and contact details
          applicable to their service.
        </p>
        <p className="text-xs text-muted-foreground">
          Updated 22 September 2026.
        </p>
      </section>
    </DocumentShell>
  );
}
