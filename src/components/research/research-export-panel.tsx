"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FormField } from "@/components/ui/field";
import Link from "next/link";

type Preset = {
  name: string;
  cancer: string;
  province: string;
  figo: string;
  hiv: string;
  consentOnly: boolean;
  dateFrom: string;
  dateTo: string;
  omitDistrict: boolean;
};

const PRESET_KEY = "gynonc-export-presets";

function buildExportUrl(opts: {
  cancer: string;
  province: string;
  figo: string;
  hiv: string;
  consentOnly: boolean;
  dateFrom: string;
  dateTo: string;
  omitDistrict: boolean;
  format?: string;
}) {
  const params = new URLSearchParams();
  if (opts.cancer.trim()) params.set("cancer", opts.cancer.trim());
  if (opts.province.trim()) params.set("province", opts.province.trim());
  if (opts.figo.trim()) params.set("figo", opts.figo.trim());
  if (opts.hiv.trim()) params.set("hiv", opts.hiv.trim());
  if (opts.consentOnly) params.set("consent", "1");
  if (opts.dateFrom.trim()) params.set("from", opts.dateFrom.trim());
  if (opts.dateTo.trim()) params.set("to", opts.dateTo.trim());
  if (opts.omitDistrict) params.set("omitDistrict", "1");
  if (opts.format && opts.format !== "csv") params.set("format", opts.format);
  const qs = params.toString();
  return qs ? `/api/export?${qs}` : `/api/export`;
}

export function ResearchExportPanel({
  rowEstimate,
  defaultCancer,
  defaultProvince,
  defaultFigo,
  defaultHiv,
  defaultDateFrom,
  defaultDateTo,
  consentOnlyDefault = false,
}: {
  rowEstimate: number;
  defaultCancer?: string;
  defaultProvince?: string;
  defaultFigo?: string;
  defaultHiv?: string;
  defaultDateFrom?: string;
  defaultDateTo?: string;
  consentOnlyDefault?: boolean;
}) {
  const [cancer, setCancer] = useState(defaultCancer ?? "");
  const [province, setProvince] = useState(defaultProvince ?? "");
  const [figo, setFigo] = useState(defaultFigo ?? "");
  const [hiv, setHiv] = useState(defaultHiv ?? "");
  const [dateFrom, setDateFrom] = useState(defaultDateFrom ?? "");
  const [dateTo, setDateTo] = useState(defaultDateTo ?? "");
  const [consentOnly, setConsentOnly] = useState(consentOnlyDefault);
  const [omitDistrict, setOmitDistrict] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetName, setPresetName] = useState("");

  useEffect(() => {
    let frame = 0;
    try {
      const raw = localStorage.getItem(PRESET_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Preset[];
        frame = requestAnimationFrame(() => setPresets(saved));
      }
    } catch {
      /* ignore */
    }
    return () => cancelAnimationFrame(frame);
  }, []);

  const base = useMemo(
    () => ({ cancer, province, figo, hiv, consentOnly, dateFrom, dateTo, omitDistrict }),
    [cancer, province, figo, hiv, consentOnly, dateFrom, dateTo, omitDistrict],
  );

  const csvUrl = useMemo(() => buildExportUrl(base), [base]);
  const spssUrl = useMemo(() => buildExportUrl({ ...base, format: "spss" }), [base]);
  const stataUrl = useMemo(() => buildExportUrl({ ...base, format: "stata" }), [base]);

  function savePreset() {
    if (!presetName.trim()) return;
    const next = [...presets.filter((p) => p.name !== presetName.trim()), { name: presetName.trim(), ...base }];
    setPresets(next);
    localStorage.setItem(PRESET_KEY, JSON.stringify(next));
    setPresetName("");
  }

  function loadPreset(p: Preset) {
    setCancer(p.cancer);
    setProvince(p.province);
    setFigo(p.figo ?? "");
    setHiv(p.hiv ?? "");
    setConsentOnly(p.consentOnly);
    setDateFrom(p.dateFrom);
    setDateTo(p.dateTo);
    setOmitDistrict(p.omitDistrict ?? false);
  }

  return (
    <div id="export" className="scroll-mt-24 rounded-2xl border border-[#EAE5DA] bg-white p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold">Export de-identified data</h2>
          <p className="text-sm text-[#5C6B66]">
            CSV plus SPSS/Stata syntax. Download CSV and syntax together for analysis.
          </p>
        </div>
        <Link
          href={`/research/report?${new URLSearchParams({
            ...(cancer ? { cancer } : {}),
            ...(province ? { province } : {}),
            ...(figo ? { figo } : {}),
            ...(hiv ? { hiv } : {}),
            ...(consentOnly ? { consent: "yes" } : {}),
            ...(dateFrom ? { from: dateFrom } : {}),
            ...(dateTo ? { to: dateTo } : {}),
          }).toString()}`}
          className="text-[13px] font-medium text-[#7A3B5E] underline"
          target="_blank"
        >
          Ethics summary (print/PDF) →
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <FormField>
          <Label htmlFor="export-cancer">Cancer type code</Label>
          <Input id="export-cancer" value={cancer} onChange={(e) => setCancer(e.target.value)} placeholder="1–7" />
        </FormField>
        <FormField>
          <Label htmlFor="export-province">Province code</Label>
          <Input id="export-province" value={province} onChange={(e) => setProvince(e.target.value)} placeholder="1–10" />
        </FormField>
        <FormField>
          <Label htmlFor="export-figo">FIGO stage code</Label>
          <Input id="export-figo" value={figo} onChange={(e) => setFigo(e.target.value)} placeholder="1–13" />
        </FormField>
        <FormField>
          <Label htmlFor="export-hiv">HIV status code</Label>
          <Input id="export-hiv" value={hiv} onChange={(e) => setHiv(e.target.value)} placeholder="1–3" />
        </FormField>
        <FormField>
          <Label htmlFor="export-from">Diagnosis from</Label>
          <Input id="export-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </FormField>
        <FormField>
          <Label htmlFor="export-to">Diagnosis to</Label>
          <Input id="export-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </FormField>
        <FormField>
          <Label htmlFor="export-consent">Consent</Label>
          <label className="flex h-11 cursor-pointer items-center gap-2 rounded-[10px] border border-[#E2DDD3] bg-white px-3 text-sm">
            <input
              id="export-consent"
              type="checkbox"
              checked={consentOnly}
              onChange={(e) => setConsentOnly(e.target.checked)}
              className="h-4 w-4 accent-[#0C4F4E]"
            />
            Consented patients only
          </label>
        </FormField>
        <FormField>
          <Label htmlFor="export-district">Location detail</Label>
          <label className="flex h-11 cursor-pointer items-center gap-2 rounded-[10px] border border-[#E2DDD3] bg-white px-3 text-sm">
            <input
              id="export-district"
              type="checkbox"
              checked={omitDistrict}
              onChange={(e) => setOmitDistrict(e.target.checked)}
              className="h-4 w-4 accent-[#0C4F4E]"
            />
            Omit district
          </label>
        </FormField>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <a href={csvUrl}>
          <Button type="button">CSV (~{rowEstimate} rows)</Button>
        </a>
        <a href={spssUrl}>
          <Button type="button" variant="secondary">
            SPSS syntax (.sps)
          </Button>
        </a>
        <a href={stataUrl}>
          <Button type="button" variant="secondary">
            Stata do-file (.do)
          </Button>
        </a>
      </div>

      <div className="mt-5 border-t border-[#F0ECE3] pt-4">
        <p className="mb-2 text-xs font-semibold tracking-wide text-[#7C8983] uppercase">Saved export presets</p>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => loadPreset(p)}
              className="rounded-full border border-[#E2DDD3] bg-white px-3 py-1 text-[12px] text-[#45524D] hover:border-[#0C4F4E]"
            >
              {p.name}
            </button>
          ))}
          {presets.length === 0 ? <span className="text-xs text-[#9aa5a0]">No presets saved yet.</span> : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Preset name"
            className="max-w-[200px]"
          />
          <Button type="button" variant="secondary" size="sm" onClick={savePreset}>
            Save current filters
          </Button>
        </div>
      </div>

      <p className="mt-4 text-xs text-[#9aa5a0]">
        <Link href="/dictionary" className="text-[#7A3B5E] underline">
          Data dictionary
        </Link>
      </p>
    </div>
  );
}
