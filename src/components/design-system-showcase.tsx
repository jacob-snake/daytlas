"use client";
import { DateWindow } from "@/components/trends/date-window";
import { brand } from "@/lib/brand-config";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Circle,
  Moon,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { FaqItem } from "@/components/ui/faq-item";
import { SiteFooter } from "@/components/ui/site-footer";
import { MetricDelta } from "@/components/ui/metric-delta";
import { MetricMarker } from "@/components/ui/metric-marker";
import { ExploreDisclosure } from "@/components/ui/explore-disclosure";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Badge } from "@/components/ui/badge";
import { DayOrb } from "@/components/ui/day-orb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Typography } from "@/components/ui/typography";

const navigation = [
  ["foundations", "Základy"],
  ["typography", "Typografia"],
  ["buttons", "Tlačidlá"],
  ["patterns", "Vzory"],
  ["components", "Komponenty"],
] as const;

const palette = [
  {
    name: "Papier",
    token: "--background",
    value: "oklch(0.978 0.003 95)",
    role: "Priestor na čítanie",
    color: "var(--background)",
  },
  {
    name: "Atrament",
    token: "--foreground",
    value: "oklch(0.17 0.005 90)",
    role: "Text a hlavná akcia",
    color: "var(--foreground)",
  },
  {
    name: "Spánok",
    token: "--chart-1",
    value: "oklch(0.55 0.12 262)",
    role: "História spánku",
    color: "var(--chart-1)",
  },
  {
    name: "Pripravenosť",
    token: "--chart-2",
    value: "oklch(0.54 0.08 135)",
    role: "Pripravenosť na deň",
    color: "var(--chart-2)",
  },
  {
    name: "Aktivita",
    token: "--chart-3",
    value: "oklch(0.55 0.10 55)",
    role: "Pohyb a aktivita",
    color: "var(--chart-3)",
  },
];

const typeSamples = [
  {
    variant: "h1",
    name: "H1 · Page · 32–48 / 700",
    text: "Follow your patterns.",
  },
  {
    variant: "h2",
    name: "H2 · Section · 24–30 / 700",
    text: "The longer view",
  },
  { variant: "h3", name: "H3 · Card · 20 / 700", text: "This month vs last" },
  { variant: "h4", name: "H4 · Chart · 18 / 700", text: "Sleep Score" },
  { variant: "h5", name: "H5 · Group · 16 / 700", text: "Recorded readings" },
  { variant: "h6", name: "H6 · Subgroup · 14 / 700", text: "Average per day" },
  { variant: "display", name: "Display", text: "Tvoje dni." },
  { variant: "heading", name: "Heading", text: "V širších súvislostiach." },
  { variant: "title", name: "Title", text: "Malé noci. Väčší príbeh." },
  {
    variant: "body",
    name: "Body",
    text: "Jeden deň je začiatok. História mu dáva kontext.",
  },
  {
    variant: "caption",
    name: "Caption",
    text: "12 zaznamenaných nocí · ilustračné údaje",
  },
  { variant: "label", name: "Label", text: "Tvoj osobný prehľad" },
] as const;

const sampleNights = [
  445,
  470,
  null,
  430,
  460,
  452,
  438,
  480,
  449,
  465,
  null,
  444,
  457,
  462,
];
const recordedNights = sampleNights.filter(
  (night): night is number => night !== null,
);

function SectionHeading({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="ds-section-heading">
      <Typography as="p" variant="label" className="ds-section-number">
        {number}
      </Typography>
      <div>
        <Typography as="h2" variant="heading">
          {title}
        </Typography>
        <Typography as="p" variant="body" className="ds-section-description">
          {children}
        </Typography>
      </div>
    </div>
  );
}

function GuestPattern() {
  const [mode, setMode] = useState("demo");
  const [goal, setGoal] = useState("450");
  const [draftGoal, setDraftGoal] = useState(goal);
  const [open, setOpen] = useState(false);
  const reached = recordedNights.filter(
    (night) => night >= Number(goal),
  ).length;
  const formattedGoal = `${Math.floor(Number(goal) / 60)} h${Number(goal) % 60 ? " 30 min" : ""}`;

  return (
    <div className="ds-pattern-layout">
      <Card className="ds-guest-card">
        <CardHeader>
          <div className="ds-spread">
            <span className="ds-mini-brand">
              <Moon size={17} aria-hidden="true" /> Tvoj prehľad
            </span>
            <Badge variant="outline">Ukážka</Badge>
          </div>
          <div className="ds-mode-control">
            <SegmentedControl
              value={mode}
              onValueChange={setMode}
              label="Režim ukážky"
              options={[
                { value: "demo", label: "Ukážkové dáta" },
                { value: "own", label: "Vlastná Oura" },
              ]}
            />
          </div>
        </CardHeader>
        <CardContent className="ds-guest-content">
          <div aria-live="polite">
            <Typography as="p" variant="label" className="ds-muted">
              {mode === "demo" ? "Preskúmaj bez účtu" : "Návrh pripojenia"}
            </Typography>
            <Typography as="h3" variant="title" className="ds-guest-title">
              {mode === "demo"
                ? "Dni, ktoré do seba zapadajú."
                : "Priestor pre tvoju históriu."}
            </Typography>
            <Typography
              as="p"
              variant="caption"
              className="ds-guest-description"
            >
              {mode === "demo"
                ? "Všetky hodnoty sú vymyslené. Rozhranie si môžeš vyskúšať hneď."
                : "Tu by nasledovalo povolenie prístupu u Oura. Táto galéria nič nepripája a ďalej zobrazuje ilustračné údaje."}
            </Typography>
          </div>
          <div className="ds-dot-section">
            <div className="ds-stat">
              <span>{reached}</span>
              <span>
                z {recordedNights.length} nocí
                <br />
                aspoň {formattedGoal}
              </span>
            </div>
            <div
              className="ds-days"
              role="img"
              aria-label={`${sampleNights.length} ilustračných dní: ${reached} nocí dosiahlo ${formattedGoal}, ${recordedNights.length - reached} bolo kratších a 2 záznamy chýbajú.`}
            >
              {sampleNights.map((night, index) => (
                <DayOrb
                  key={index}
                  state={
                    night === null
                      ? "missing"
                      : night >= Number(goal)
                        ? "met"
                        : "shorter"
                  }
                />
              ))}
            </div>
            <div className="ds-dot-legend">
              <span>
                <DayOrb state="met" size="legend" /> Zvolený čas
              </span>
              <span>
                <DayOrb state="shorter" size="legend" /> Kratšia noc
              </span>
              <span>
                <DayOrb state="missing" size="legend" /> Bez záznamu
              </span>
            </div>
          </div>
          <div className="ds-guest-bottom">
            <Typography as="p" variant="caption" className="ds-muted">
              Tvoja hranica, nie hodnotenie zdravia.
            </Typography>
            <Dialog
              open={open}
              onOpenChange={(next) => {
                setOpen(next);
                if (next) setDraftGoal(goal);
              }}
            >
              <DialogTrigger asChild>
                <Button variant="secondary">
                  Upraviť cieľ <ArrowUpRight aria-hidden="true" />
                </Button>
              </DialogTrigger>
              <DialogContent lang="sk">
                <DialogHeader>
                  <DialogTitle>Tvoj vlastný cieľ</DialogTitle>
                  <DialogDescription>
                    Vyber hranicu pre ilustračné noci. Voľba sa uloží len do
                    pamäte tejto stránky.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-2">
                  <SegmentedControl
                    label="Hranica spánku"
                    value={draftGoal}
                    onValueChange={setDraftGoal}
                    options={[
                      { value: "420", label: "7 h" },
                      { value: "450", label: "7 h 30 min" },
                      { value: "480", label: "8 h" },
                    ]}
                  />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost">Zrušiť</Button>
                  </DialogClose>
                  <Button
                    variant="primary"
                    onClick={() => {
                      setGoal(draftGoal);
                      setOpen(false);
                    }}
                  >
                    Použiť cieľ <Check aria-hidden="true" />
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
      <aside className="ds-pattern-notes">
        <Typography as="p" variant="label">
          Komponenty v kontexte
        </Typography>
        <Typography as="h3" variant="title">
          Najprv priestor.
          <br />
          Potom ďalší krok.
        </Typography>
        <Typography as="p" variant="body" className="ds-muted">
          Prepínač mení jeden režim. Hlavná plocha vysvetlí, čo sa zmenilo.
          Jedna zreteľná akcia vedie ďalej.
        </Typography>
        <div className="ds-anatomy">
          <span>01</span>
          <p>Rovnaký SegmentedControl ako v aplikácii.</p>
        </div>
        <div className="ds-anatomy">
          <span>02</span>
          <p>
            DayOrb je rovnaký komponent ako v profile. Jemný odlesk, znak pre
            cieľ a prázdny kruh pre chýbajúci záznam.
          </p>
        </div>
        <div className="ds-anatomy">
          <span>03</span>
          <p>Dialog podrží rozpracovanú voľbu; Zrušiť ju zahodí.</p>
        </div>
        <Typography as="p" variant="caption" className="ds-muted">
          Ukážka nepoužíva Oura API, účet ani úložisko.
        </Typography>
      </aside>
    </div>
  );
}

export function DesignSystemShowcase() {
  const [exampleDates, setExampleDates] = useState({
    start: "2026-09-01",
    end: "2026-09-29",
  });
  const [interaction, setInteraction] = useState(
    "Prejdi myšou, použi Tab alebo stlač tlačidlo.",
  );
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("Alex");
  const [error, setError] = useState(false);
  const [details, setDetails] = useState(false);
  const [intention, setIntention] = useState("observe");
  const [saved, setSaved] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const simulateLoading = () => {
    if (busy) return;
    setBusy(true);
    setInteraction("Prebieha lokálna ukážka načítania…");
    timer.current = setTimeout(() => {
      setBusy(false);
      setInteraction("Hotovo. Toto bola iba lokálna zmena stavu.");
    }, 1200);
  };

  return (
    <div className="ds-showcase" lang="sk">
      <header className="ds-header">
        <div className="ds-header-inner">
          <div className="ds-brandline">
            <Brand />
            <span className="ds-header-divider" />
            <span className="ds-edition">Design system · 01</span>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              Homepage <ArrowUpRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </header>
      <main id="main-content" className="ds-main">
        <section className="space-y-4 py-8" aria-label="Homepage components">
          <h2 className="text-xl font-bold">FAQ a tmavý footer</h2>
          <FaqItem question="Can I try it without a ring?">
            Yes. The demo uses fictional sample data. No account needed.
          </FaqItem>
          <SiteFooter />
        </section>
        <section className="space-y-5 py-8" aria-label="Dashboard components">
          <h2 className="text-xl font-bold">Dátové komponenty</h2>
          <div className="flex flex-wrap items-center gap-6">
            <span className="inline-flex items-center gap-2">
              <MetricMarker color="var(--chart-1)" /> Spánok
            </span>
            <MetricDelta value={3.2} unit="pts" polarity="higher" />
            <MetricDelta value={-2.4} unit="pts" polarity="higher" />
            <MetricDelta value={1.2} unit="ms" />
            <MetricDelta value={null} />
          </div>
          <p className="text-sm text-muted-foreground">
            Rovnaké kruhové značky v kartách a legendách. Šípka ukazuje smer
            zmeny. Zelená znamená rast, červená pokles; nejde o hodnotenie
            zdravia. Sivá označuje nulovú zmenu alebo chýbajúce dáta.
          </p>
          <DateWindow
            start={exampleDates.start}
            end={exampleDates.end}
            min="2026-01-01"
            max="2026-09-29"
            onChange={(start, end) => setExampleDates({ start, end })}
          />
          <p className="text-sm text-muted-foreground">
            Použitý rozsah: {exampleDates.start} – {exampleDates.end}
          </p>
          <ExploreDisclosure>
            <p className="text-sm">
              Obsah rozšírených analýz. Celý riadok je ovládateľný myšou aj
              klávesnicou.
            </p>
          </ExploreDisclosure>
        </section>
        <section className="ds-hero" aria-labelledby="ds-heading">
          <div>
            <Typography as="p" variant="label" className="ds-kicker">
              Živá knižnica rozhrania
            </Typography>
            <Typography as="h1" variant="display" id="ds-heading">
              Jeden jazyk.
              <br />
              <span className="ds-muted">Pre každý deň.</span>
            </Typography>
            <Typography as="p" variant="body" className="ds-intro">
              Typografia, farby a komponenty, ktoré dávajú {brand.name} spoločný
              charakter. Vyskúšaj si ich tak, ako fungujú v produkte.
            </Typography>
            <div className="ds-hero-actions">
              <Button asChild variant="primary" size="lg">
                <a href="#patterns">
                  Vyskúšať rozhranie <ArrowRight aria-hidden="true" />
                </a>
              </Button>
              <Badge variant="outline">Pracovný systém</Badge>
            </div>
          </div>
          <div className="ds-hero-specimen" aria-hidden="true">
            <div className="ds-specimen-label">MALÉ PRVKY. JEDEN CELOK.</div>
            <div className="ds-hero-dots">
              {Array.from({ length: 16 }, (_, i) => (
                <DayOrb
                  key={i}
                  size="lg"
                  state={i === 6 || i === 11 ? "missing" : "recorded"}
                  tone={i > 11 ? "readiness" : "sleep"}
                />
              ))}
            </div>
            <div className="ds-specimen-bottom">
              <span>Priestor pre súvislosti.</span>
              <span>01—16</span>
            </div>
          </div>
        </section>
        <nav className="ds-index" aria-label="Sekcie design systému">
          {navigation.map(([id, label], i) => (
            <a key={id} href={`#${id}`}>
              <span>0{i + 1}</span>
              {label}
              <ChevronRight size={14} aria-hidden="true" />
            </a>
          ))}
        </nav>

        <section id="foundations" className="ds-section">
          <SectionHeading number="01" title="Pokojný základ. Jasný význam.">
            Papier a atrament držia rozhranie pohromade. Farba pomáha čítať
            údaje; nenahrádza ich popis.
          </SectionHeading>
          <div className="ds-palette">
            {palette.map((color) => (
              <div className="ds-color" key={color.name}>
                <div
                  className="ds-color-swatch"
                  style={{ backgroundColor: color.color }}
                />
                <div className="ds-color-copy">
                  <Typography as="h3" variant="body" className="font-medium">
                    {color.name}
                  </Typography>
                  <code>{color.value}</code>
                  <p>{color.role}</p>
                  <code className="ds-token">{color.token}</code>
                </div>
              </div>
            ))}
          </div>
          <div className="ds-foundation-notes">
            <div>
              <ShieldCheck size={19} aria-hidden="true" />
              <p>
                <strong>Význam aj bez farby.</strong> Stav vždy dopĺňa text,
                ikona alebo tvar.
              </p>
            </div>
            <div>
              <Sun size={19} aria-hidden="true" />
              <p>
                <strong>Svetlý základ.</strong> Táto stránka dokumentuje paletu
                súčasnej homepage.
              </p>
            </div>
          </div>
        </section>

        <section id="typography" className="ds-section">
          <SectionHeading number="02" title="Jedno písmo. Viac hlasov.">
            Plus Jakarta Sans pre nadpisy, čísla aj ovládanie. Veľkosť vytvára
            hierarchiu, priestor jej dáva pokoj.
          </SectionHeading>
          <div className="ds-type-layout">
            <div className="ds-type-cover">
              <span className="ds-type-aa" aria-hidden="true">
                Aa
              </span>
              <div>
                <Typography as="h3" variant="title">
                  Plus Jakarta Sans
                </Typography>
                <Typography as="p" variant="caption">
                  Tvoje dni. V širších súvislostiach.
                </Typography>
              </div>
              <p className="ds-type-alphabet" aria-hidden="true">
                Aa Bb Čč Ďď Ee Ľľ Ňň Ôô Šš Žž
                <br />
                0123456789 · 7 h 30 min
              </p>
            </div>
            <div className="ds-type-scale">
              {typeSamples.map((sample) => (
                <div key={sample.variant} className="ds-type-row">
                  <code>{sample.name}</code>
                  <Typography as="p" variant={sample.variant}>
                    {sample.text}
                  </Typography>
                </div>
              ))}
            </div>
          </div>
          <Typography as="p" variant="caption" className="ds-footnote">
            Sémantika a vzhľad sú oddelené: úroveň nadpisu určuje dokument,
            variant jeho vizuálnu úlohu.
          </Typography>
        </section>

        <section id="buttons" className="ds-section">
          <SectionHeading number="03" title="Každá akcia má svoju váhu.">
            Jedna hlavná akcia. Jasná alternatíva. Nenápadné doplnkové
            ovládanie.
          </SectionHeading>
          <div className="ds-button-grid">
            {[
              {
                variant: "primary",
                name: "Primary",
                detail: "Najdôležitejší ďalší krok.",
              },
              {
                variant: "secondary",
                name: "Secondary",
                detail: "Alternatíva vedľa hlavnej akcie.",
              },
              {
                variant: "ghost",
                name: "Ghost",
                detail: "Doplnková navigácia a návrat.",
              },
            ].map(({ variant, name: title, detail }) => (
              <Card key={variant}>
                <CardHeader>
                  <CardTitle>{title}</CardTitle>
                  <CardDescription>{detail}</CardDescription>
                </CardHeader>
                <CardContent className="ds-button-specimen">
                  <Button
                    variant={variant as "primary" | "secondary" | "ghost"}
                    onClick={() =>
                      setInteraction(`${title}: kliknutie prijaté v ukážke.`)
                    }
                  >
                    Pokračovať <ArrowRight aria-hidden="true" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="ds-button-detail-grid">
            <div className="ds-component-surface">
              <Typography as="h3" variant="title">
                Tri veľkosti
              </Typography>
              <div className="ds-size-samples">
                {[
                  { size: "sm", label: "Small", meta: "40 px · dotyk 44 px" },
                  { size: "default", label: "Default", meta: "44 px" },
                  { size: "lg", label: "Large", meta: "48 px" },
                ].map((item) => (
                  <div key={item.size}>
                    <Button
                      size={item.size as "sm" | "default" | "lg"}
                      variant="secondary"
                      onClick={() =>
                        setInteraction(`${item.label}: kliknutie prijaté.`)
                      }
                    >
                      {item.label}
                    </Button>
                    <code>{item.meta}</code>
                  </div>
                ))}
              </div>
            </div>
            <div className="ds-component-surface">
              <Typography as="h3" variant="title">
                Stavy, ktoré odpovedajú
              </Typography>
              <div className="ds-state-samples">
                <Button
                  variant="primary"
                  onPointerEnter={() =>
                    setInteraction("Hover: zvýraznenie reaguje na ukazovateľ.")
                  }
                  onFocus={() =>
                    setInteraction(
                      "Focus: tlačidlo je pripravené na Enter alebo medzerník.",
                    )
                  }
                  onClick={simulateLoading}
                  loading={busy}
                >
                  {busy ? "Načítavam…" : "Vyskúšať stav"}
                </Button>
                <Button variant="secondary" disabled>
                  Nedostupné
                </Button>
              </div>
              <p className="ds-interaction-status" role="status">
                {interaction}
              </p>
            </div>
          </div>
          <div className="ds-inline-rule">
            <Circle size={16} aria-hidden="true" />
            <Typography as="p" variant="caption">
              Hover a focus sú skutočné stavy komponentu. Počas načítania
              tlačidlo neprijíma ďalšie kliknutie.
            </Typography>
          </div>
        </section>

        <section id="patterns" className="ds-section">
          <SectionHeading number="04" title="Systém ožíva v súvislostiach.">
            Skús prepnúť režim alebo zmeniť cieľ. Všetky interakcie zostávajú
            iba na tejto stránke.
          </SectionHeading>
          <GuestPattern />
        </section>

        <section id="components" className="ds-section">
          <div className="mb-8">
            <Eyebrow>Your Oura history, made clearer.</Eyebrow>
            <p className="mt-3 text-sm text-muted-foreground">
              Homepage eyebrow · 14 / 16 px · väčší než stavový badge.
            </p>
          </div>
          <SectionHeading number="05" title="Drobnosti, na ktorých záleží.">
            Čitateľné formuláre, zreteľné stavy a nastavenia, ktoré hovoria
            ľudskou rečou.
          </SectionHeading>
          <div className="ds-components-grid">
            <Card>
              <CardHeader>
                <CardTitle>Nastavenia ukážky</CardTitle>
                <CardDescription>
                  Reálne ovládanie. Žiadny účet ani odber.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="settings">
                  <TabsList aria-label="Obsah komponentovej ukážky">
                    <TabsTrigger value="settings">Nastavenia</TabsTrigger>
                    <TabsTrigger value="states">Stavy</TabsTrigger>
                  </TabsList>
                  <TabsContent value="settings" className="ds-settings-panel">
                    <form
                      noValidate
                      onSubmit={(event) => {
                        event.preventDefault();
                        const invalid = !name.trim();
                        setError(invalid);
                        setSaved(
                          invalid
                            ? ""
                            : `Nastavenia pre ${name.trim()} sú použité iba v tejto ukážke.`,
                        );
                      }}
                    >
                      <div className="ds-field">
                        <Label htmlFor="ds-name">Ako ťa máme oslovovať?</Label>
                        <Input
                          id="ds-name"
                          value={name}
                          maxLength={50}
                          autoComplete="off"
                          onChange={(event) => {
                            setName(event.target.value);
                            setError(false);
                            setSaved("");
                          }}
                          aria-invalid={error}
                          aria-describedby={
                            error ? "ds-name-error" : "ds-name-hint"
                          }
                        />
                        <p id="ds-name-hint" className="ds-field-hint">
                          Použi vymyslené meno. Neodosiela sa.
                        </p>
                        {error && (
                          <p
                            id="ds-name-error"
                            className="ds-field-error"
                            role="alert"
                          >
                            Doplň meno pre túto ukážku.
                          </p>
                        )}
                      </div>
                      <div className="ds-field">
                        <Label htmlFor="ds-intention">Môj zámer</Label>
                        <Select value={intention} onValueChange={setIntention}>
                          <SelectTrigger id="ds-intention" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="observe">
                              Pravidelne si pozrieť svoje dni
                            </SelectItem>
                            <SelectItem value="sleep">
                              Sledovať vlastný spánkový cieľ
                            </SelectItem>
                            <SelectItem value="reports" disabled>
                              E-mailové prehľady · pripravujeme
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="ds-field-hint">
                          Šípky menia výber, Enter potvrdí, Escape zavrie.
                        </p>
                      </div>
                      <div className="ds-switch-row">
                        <div>
                          <Label htmlFor="ds-details">Podrobnejší náhľad</Label>
                          <p id="ds-details-hint">
                            Zobrazí ilustračnú hodnotu nižšie.
                          </p>
                        </div>
                        <Switch
                          id="ds-details"
                          checked={details}
                          onCheckedChange={setDetails}
                          aria-describedby="ds-details-hint"
                        />
                      </div>
                      <div className="ds-private-preview" aria-live="polite">
                        <Moon size={17} aria-hidden="true" />
                        <div>
                          <strong>
                            {details
                              ? "7 h 34 min"
                              : "Tvoj prehľad je pripravený."}
                          </strong>
                          <p>
                            {details
                              ? "Ilustračný hlavný spánok · žiadny skutočný záznam"
                              : "Diskrétny náhľad bez konkrétnych hodnôt."}
                          </p>
                        </div>
                      </div>
                      <Button type="submit" variant="primary">
                        Použiť v ukážke <Check aria-hidden="true" />
                      </Button>
                      <p className="ds-save-status" role="status">
                        {saved}
                      </p>
                    </form>
                  </TabsContent>
                  <TabsContent value="states" className="ds-settings-panel">
                    <div className="ds-status-example">
                      <Badge>Pripravené</Badge>
                      <p>Údaje sú dostupné na zobrazenie.</p>
                    </div>
                    <div className="ds-status-example">
                      <Badge variant="outline">Časť histórie</Badge>
                      <p>Ukáž dostupné záznamy a vysvetli medzery.</p>
                    </div>
                    <div className="ds-status-example">
                      <Badge variant="destructive">Prístup prerušený</Badge>
                      <p>Povedz, čo sa stalo a ako pokračovať.</p>
                    </div>
                    <div className="ds-empty-state">
                      <Circle size={24} aria-hidden="true" />
                      <Typography as="h3" variant="title">
                        Každý príbeh má začiatok.
                      </Typography>
                      <Typography as="p" variant="caption">
                        Bez údajov nevymýšľame priemery ani rekordy.
                      </Typography>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            <div className="ds-composition-column">
              <div className="ds-composition">
                <Typography as="p" variant="label">
                  Vzor úvodnej plochy
                </Typography>
                <Typography as="h3" variant="heading">
                  Tvoje dni.
                  <br />V širších
                  <br />
                  súvislostiach.
                </Typography>
                <Typography as="p" variant="body">
                  Viac priestoru pre históriu. Jasný ďalší krok.
                </Typography>
                <Button variant="primary" asChild>
                  <a href="#patterns">
                    Preskúmať ukážku <ArrowUpRight aria-hidden="true" />
                  </a>
                </Button>
                <div className="ds-composition-orbit" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <div className="ds-spacing">
                <Typography as="h3" variant="label">
                  Rytmus priestoru
                </Typography>
                <div>
                  {[4, 8, 12, 16, 24, 32].map((space) => (
                    <span key={space}>
                      <i style={{ width: space, height: space }} />
                      <code>{space}</code>
                    </span>
                  ))}
                </div>
                <Typography as="p" variant="caption" className="ds-muted">
                  Malé rozostupy spájajú. Veľké oddeľujú súvislosti.
                </Typography>
              </div>
            </div>
          </div>
        </section>
        <footer className="ds-footer">
          <p>{brand.name} · vizuálny systém</p>
          <p>Spoločné komponenty. Žiadne reálne údaje.</p>
          <a href="#ds-heading">Späť na začiatok ↑</a>
        </footer>
      </main>
    </div>
  );
}
