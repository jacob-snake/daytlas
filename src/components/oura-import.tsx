"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { readOuraFile, type OuraImport } from "@/lib/oura/import-file";
import { importedData } from "@/lib/idb-cache";
import { setMode, reloadSession } from "@/lib/oura/client";

export function OuraImportPanel() {
  const [preview, setPreview] = useState<OuraImport | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const sequence = useRef(0);
  return (
    <section
      id="import"
      className="mt-8 border-t border-border/35 pt-7"
      aria-labelledby="import-title"
    >
      <h2 id="import-title" className="text-xl font-semibold">
        Import Oura file
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        An alternative to connecting Oura. Choose a CSV or ZIP, then review it
        before saving. Your file stays in this browser.
      </p>
      <label className="mt-5 block text-sm font-medium">
        Oura export · CSV or ZIP · up to 10 MB
        <input
          type="file"
          accept=".csv,.zip"
          disabled={busy}
          className="mt-2 block w-full min-w-0 rounded-xl border border-border p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            const request = ++sequence.current;
            setPreview(null);
            setError("");
            if (!file) return;
            setBusy(true);
            try {
              if (file.size > 10 * 1024 * 1024)
                throw new Error("Choose a file smaller than 10 MB.");
              const data = readOuraFile(
                file.name,
                new Uint8Array(await file.arrayBuffer()),
              );
              if (request === sequence.current) setPreview(data);
            } catch (error) {
              setError(
                error instanceof Error
                  ? error.message
                  : "This file could not be read.",
              );
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {busy && (
        <p role="status" className="mt-3 text-sm">
          Processing your file…
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {preview && (
        <div
          className="mt-5 space-y-4 rounded-2xl bg-secondary/50 p-4"
          aria-label="Import preview"
        >
          <div>
            <h3 className="font-semibold">
              {preview.days.toLocaleString()} days ready to import
            </h3>
            <p className="text-sm text-muted-foreground">
              {preview.firstDay} — {preview.lastDay}
            </p>
          </div>
          <ul className="space-y-1 text-sm">
            {Object.entries(preview.collections)
              .filter(([, rows]) => rows.length)
              .map(([name, rows]) => (
                <li key={name}>
                  {(
                    {
                      daily_sleep: "Sleep scores",
                      daily_readiness: "Readiness",
                      daily_activity: "Activity",
                      sleep: "Sleep measurements",
                    } as Record<string, string>
                  )[name] ?? name}
                  : {rows.length.toLocaleString()} records
                </li>
              ))}
          </ul>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="pb-2 text-left font-medium">
                First available daily scores
              </caption>
              <thead>
                <tr>
                  <th className="py-1">Day</th>
                  <th>Sleep</th>
                  <th>Readiness</th>
                  <th>Activity</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ...new Set(
                    Object.values(preview.collections).flatMap((rows) =>
                      rows.map((row) => row.day),
                    ),
                  ),
                ]
                  .sort()
                  .slice(0, 3)
                  .map((day) => (
                    <tr key={day}>
                      <td className="py-2 whitespace-nowrap pr-3">{day}</td>
                      {["daily_sleep", "daily_readiness", "daily_activity"].map(
                        (key) => (
                          <td key={key}>
                            {String(
                              preview.collections[key].find(
                                (row) => row.day === day,
                              )?.score ?? "—",
                            )}
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground">
            Only supported daily measurements are imported. Missing values stay
            empty. This replaces the previous file import, not your Oura
            connection. Upload a complete export to retain earlier imported
            days.
          </p>
          {preview.warnings.map((warning) => (
            <p key={warning} className="text-sm">
              {warning}
            </p>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await importedData(preview);
                  window.localStorage.setItem(
                    "daytlas.importRevision",
                    crypto.randomUUID(),
                  );
                  setMode("import");
                  reloadSession("/app");
                } catch {
                  setError(
                    "Could not save the import. Check browser storage and try again.",
                  );
                  setBusy(false);
                }
              }}
            >
              Import {preview.days.toLocaleString()} days
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => setPreview(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      <p className="mt-3 text-sm text-muted-foreground">
        Imported records are labelled in the app. They update only when you
        upload another file.
      </p>
      <a
        href="https://support.ouraring.com/hc/articles/360025441594-Export-Share-Your-Oura-Data"
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex min-h-11 items-center text-sm underline underline-offset-4"
      >
        How to export from Oura
      </a>
    </section>
  );
}
