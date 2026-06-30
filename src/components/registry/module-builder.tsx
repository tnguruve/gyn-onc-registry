"use client";

import { useMemo, useState } from "react";
import { deleteCustomModuleAction, upsertCustomModuleAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label, FormField } from "@/components/ui/field";
import {
  CUSTOM_FIELD_TYPES,
  type CustomFieldDraft,
  type CustomFieldType,
  type CustomModuleDraft,
} from "@/lib/custom-modules";

export type BuilderModule = {
  id: string;
  name: string;
  description: string | null;
  helperText: string | null;
  slug: string;
  isPermanent: boolean;
  fields: Array<{
    id: string;
    label: string;
    fieldType: string;
    required: boolean;
    options: string | null;
  }>;
  _count: { patientData: number };
};

function toDraft(mod?: BuilderModule): CustomModuleDraft {
  if (!mod) {
    return { name: "", description: "", helperText: "", isPermanent: true, fields: [] };
  }
  return {
    id: mod.id,
    name: mod.name,
    description: mod.description ?? "",
    helperText: mod.helperText ?? "",
    isPermanent: mod.isPermanent,
    fields: mod.fields.map((f) => ({
      id: f.id,
      label: f.label,
      fieldType: f.fieldType as CustomFieldType,
      required: f.required,
      options: f.options ? (JSON.parse(f.options) as string[]) : [],
    })),
  };
}

function newField(type: CustomFieldType): CustomFieldDraft {
  return {
    label: "",
    fieldType: type,
    required: false,
    options: type === "dropdown" ? ["", ""] : [],
  };
}

export function ModuleBuilder({ modules, selectedId, saved, deleted }: {
  modules: BuilderModule[];
  selectedId?: string;
  saved?: boolean;
  deleted?: boolean;
}) {
  const initial = useMemo(
    () => toDraft(modules.find((m) => m.id === selectedId) ?? modules[0]),
    [modules, selectedId],
  );
  const [draft, setDraft] = useState<CustomModuleDraft>(initial);
  const [activeId, setActiveId] = useState<string | undefined>(selectedId ?? modules[0]?.id);

  function selectModule(id?: string) {
    setActiveId(id);
    setDraft(toDraft(modules.find((m) => m.id === id)));
  }

  function startNew() {
    setActiveId(undefined);
    setDraft(toDraft());
  }

  function updateField(index: number, patch: Partial<CustomFieldDraft>) {
    setDraft((d) => ({
      ...d,
      fields: d.fields.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    }));
  }

  function removeField(index: number) {
    setDraft((d) => ({ ...d, fields: d.fields.filter((_, i) => i !== index) }));
  }

  function addField(type: CustomFieldType) {
    setDraft((d) => ({ ...d, fields: [...d.fields, newField(type)] }));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Module builder</h1>
          <p className="mt-1 text-sm text-[#5C6B66]">
            Create custom registry modules and edit their fields. Saved modules appear on every patient record.
          </p>
        </div>
        <Button type="button" onClick={startNew}>+ New module</Button>
      </div>

      {saved ? (
        <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">✓ Module saved.</div>
      ) : null}
      {deleted ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Module deleted.</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-2xl border border-[#EAE5DA] bg-white p-3">
          <p className="mb-2 px-2 text-[11px] font-semibold tracking-wide text-[#7C8983] uppercase">Your modules</p>
          <div className="flex flex-col gap-1">
            {modules.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => selectModule(m.id)}
                className={`rounded-lg px-3 py-2 text-left text-sm transition ${
                  activeId === m.id ? "bg-[#ECF3F2] font-semibold text-[#0C4F4E]" : "hover:bg-[#FBFAF6] text-[#45524D]"
                }`}
              >
                {m.name}
                <span className="mt-0.5 block text-[11px] font-normal text-[#9aa5a0]">
                  {m.fields.length} field{m.fields.length === 1 ? "" : "s"} · {m._count.patientData} record{m._count.patientData === 1 ? "" : "s"}
                </span>
              </button>
            ))}
            {modules.length === 0 ? (
              <p className="px-2 py-4 text-sm text-[#9aa5a0]">No custom modules yet.</p>
            ) : null}
          </div>
        </aside>

        <div className="rounded-2xl border border-[#EAE5DA] bg-white p-5">
          <form
            action={(formData) => {
              formData.set("payload", JSON.stringify(draft));
              return upsertCustomModuleAction(formData);
            }}
            className="space-y-5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField className="sm:col-span-2">
                <Label htmlFor="moduleName">Module name *</Label>
                <Input
                  id="moduleName"
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="e.g. Recurrence tracking"
                  required
                />
              </FormField>
              <FormField className="sm:col-span-2">
                <Label htmlFor="moduleDescription">Description</Label>
                <Input
                  id="moduleDescription"
                  value={draft.description}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  placeholder="Shown under the module title on patient records"
                />
              </FormField>
              <FormField className="sm:col-span-2">
                <Label htmlFor="moduleHelper">Helper text</Label>
                <Textarea
                  id="moduleHelper"
                  rows={2}
                  value={draft.helperText}
                  onChange={(e) => setDraft((d) => ({ ...d, helperText: e.target.value }))}
                  placeholder="Instructions for clinicians filling in this module"
                />
              </FormField>
            </div>

            <div className="rounded-xl border border-[#E2DDD3] bg-[#FAF8F4] p-4">
              <p className="mb-3 text-sm font-semibold text-[#1a2421]">Module scope</p>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="scope"
                  checked={draft.isPermanent}
                  onChange={() => setDraft((d) => ({ ...d, isPermanent: true }))}
                />
                <span>
                  <strong>Permanent core module</strong> — included in the registry long term and exports
                </span>
              </label>
              <label className="mt-2 flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="scope"
                  checked={!draft.isPermanent}
                  onChange={() => setDraft((d) => ({ ...d, isPermanent: false }))}
                />
                <span>
                  <strong>Study-only module</strong> — for a specific research period; can be archived later
                </span>
              </label>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">Add fields</p>
              <div className="flex flex-wrap gap-2">
                {CUSTOM_FIELD_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => addField(t.id)}
                    className="rounded-lg border border-[#E2DDD3] bg-white px-3 py-1.5 text-xs font-medium text-[#45524D] hover:border-[#0C4F4E] hover:text-[#0C4F4E]"
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {draft.fields.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#D5E4E2] px-4 py-10 text-center text-sm text-[#9aa5a0]">
                  No fields yet — click a field type above to add one.
                </div>
              ) : null}
              {draft.fields.map((field, index) => (
                <div key={index} className="rounded-xl border border-[#EAE5DA] bg-[#FBFAF6] p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-[#7A3B5E]">
                      {CUSTOM_FIELD_TYPES.find((t) => t.id === field.fieldType)?.label ?? field.fieldType}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeField(index)}
                      className="text-xs text-[#B23A48] hover:underline"
                    >
                      Remove field
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField>
                      <Label>Field label *</Label>
                      <Input
                        value={field.label}
                        onChange={(e) => updateField(index, { label: e.target.value })}
                        placeholder="e.g. Recurrence site"
                        required
                      />
                    </FormField>
                    <FormField>
                      <Label>Field type</Label>
                      <select
                        className="rg-input h-11 w-full rounded-[10px] border-[1.5px] border-[#E2DDD3] bg-white px-3 text-sm"
                        value={field.fieldType}
                        onChange={(e) =>
                          updateField(index, {
                            fieldType: e.target.value as CustomFieldType,
                            options: e.target.value === "dropdown" ? ["", ""] : [],
                          })
                        }
                      >
                        {CUSTOM_FIELD_TYPES.map((t) => (
                          <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                      </select>
                    </FormField>
                  </div>
                  <label className="mt-3 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => updateField(index, { required: e.target.checked })}
                    />
                    Required field
                  </label>
                  {field.fieldType === "dropdown" ? (
                    <div className="mt-3 space-y-2">
                      <Label>Dropdown options (one per line)</Label>
                      <Textarea
                        rows={3}
                        value={field.options.join("\n")}
                        onChange={(e) =>
                          updateField(index, {
                            options: e.target.value.split("\n"),
                          })
                        }
                        placeholder={"Option A\nOption B"}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-[#F0ECE3] pt-4">
              <Button type="submit">{draft.id ? "Save changes" : "Save module"}</Button>
              {draft.id ? (
                <form action={deleteCustomModuleAction.bind(null, draft.id)}>
                  <Button type="submit" variant="secondary">Delete module</Button>
                </form>
              ) : null}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
