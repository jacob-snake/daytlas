"use client";
import { brand } from "@/lib/brand-config";
import { Icon } from "@/components/icon";
import { Download04Icon } from "@hugeicons/core-free-icons";

import { localDay, shiftDay } from "@/lib/dates";
import { getMode } from "@/lib/oura/client";
import { useState } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DateRangePicker } from "@/components/date-range-picker";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildExport, download, type ExportOptions } from "@/lib/export";

function isoDaysAgo(days: number): string {
  return shiftDay(localDay(), -days);
}

const METRIC_LABELS: Record<keyof ExportOptions["metrics"], string> = {
  scores: "Scores (sleep / readiness / activity)",
  sleepDetail: "Sleep detail (stages, HRV, heart rate)",
  temperature: "Temperature deviation",
  steps: "Steps & calories",
};

export function ExportDialog() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(isoDaysAgo(89));
  const [endDate, setEndDate] = useState(isoDaysAgo(0));
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [units, setUnits] = useState<"hours" | "seconds">("hours");
  const [metrics, setMetrics] = useState<ExportOptions["metrics"]>({
    scores: true,
    sleepDetail: true,
    temperature: true,
    steps: true,
  });

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const rows = await buildExport({
        startDate,
        endDate,
        metrics,
        format,
        units,
      });
      download(
        rows,
        format,
        `${brand.slug}-${getMode() === "demo" ? "demo-" : ""}export-${startDate}-to-${endDate}`,
      );
      toast.success(`Exported ${rows.length} days of data`);
      setOpen(false);
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Icon icon={Download04Icon} data-icon="inline-start" /> Export
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export your data</DialogTitle>
          <DialogDescription>
            One readable file, generated in your browser. Sleep detail uses the
            longest sleep period each day; naps are excluded.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label>Date range</Label>
            <div>
              <DateRangePicker
                value={{ start: startDate, end: endDate }}
                onChange={(r) => {
                  setStartDate(r.start);
                  setEndDate(r.end);
                }}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="export-format">Format</Label>
            <Select
              value={format}
              onValueChange={(v) => setFormat(v as "csv" | "json")}
            >
              <SelectTrigger id="export-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (Excel, Numbers)</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="export-units">Duration units</Label>
            <Select
              value={units}
              onValueChange={(v) => setUnits(v as "hours" | "seconds")}
            >
              <SelectTrigger id="export-units">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hours">Hours (human-readable)</SelectItem>
                <SelectItem value="seconds">
                  Seconds (raw API values)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2.5 pt-1">
          {(
            Object.keys(METRIC_LABELS) as (keyof ExportOptions["metrics"])[]
          ).map((key) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={`m-${key}`} className="font-normal">
                {METRIC_LABELS[key]}
              </Label>
              <Switch
                id={`m-${key}`}
                checked={metrics[key]}
                onCheckedChange={(v) => setMetrics((m) => ({ ...m, [key]: v }))}
              />
            </div>
          ))}
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button
            onClick={run}
            disabled={busy || !Object.values(metrics).some(Boolean)}
          >
            {busy ? (
              <>
                <Spinner data-icon="inline-start" /> Fetching…
              </>
            ) : (
              "Download"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
