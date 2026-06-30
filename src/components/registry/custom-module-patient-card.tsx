"use client";

import { useState } from "react";
import { savePatientCustomModuleAction } from "@/app/actions";
import { ModuleCard } from "@/components/registry/module-card";
import { CheckboxField } from "@/components/registry/form-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label, FormField } from "@/components/ui/field";
import { customModuleAnchor, parseFieldOptions, parseModuleValues } from "@/lib/custom-modules";

export type CustomModuleForPatient = {
  id: string;
  name: string;
  description: string | null;
  helperText: string | null;
  slug: string;
  fields: Array<{
    id: string;
    label: string;
    fieldType: string;
    required: boolean;
    options: string | null;
  }>;
  patientData: { values: string } | null;
};

export function CustomModulePatientCard({
  patientId,
  module: mod,
  canWrite,
}: {
  patientId: string;
  module: CustomModuleForPatient;
  canWrite: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const values = parseModuleValues(mod.patientData?.values);
  const hasData = mod.fields.some((f) => values[f.id]);

  return (
    <ModuleCard
      id={customModuleAnchor(mod.slug)}
      title={mod.name}
      description={mod.description ?? mod.helperText ?? "Custom registry module"}
    >
      {mod.helperText && mod.description ? (
        <p className="mb-3 text-sm text-slate-600">{mod.helperText}</p>
      ) : null}

      {!canWrite ? (
        <ReadonlyValues module={mod} values={values} />
      ) : !editing && hasData ? (
        <>
          <ReadonlyValues module={mod} values={values} />
          <Button type="button" size="sm" variant="secondary" className="mt-3" onClick={() => setEditing(true)}>
            Edit module
          </Button>
        </>
      ) : (
        <>
          {!hasData ? (
            <p className="mb-3 text-sm text-slate-600">No data saved yet. Fill in the fields below.</p>
          ) : null}
          <form
            action={savePatientCustomModuleAction.bind(null, patientId, mod.id)}
            className="space-y-3"
          >
            {mod.fields.map((field) => (
              <DynamicField key={field.id} field={field} defaultValue={values[field.id]} />
            ))}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="submit" size="sm">Save {mod.name}</Button>
              {hasData ? (
                <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </>
      )}
    </ModuleCard>
  );
}

function ReadonlyValues({
  module: mod,
  values,
}: {
  module: CustomModuleForPatient;
  values: Record<string, string>;
}) {
  if (!mod.fields.length) {
    return <p className="text-sm text-slate-500">This module has no fields.</p>;
  }
  return (
    <div className="grid gap-2 text-sm sm:grid-cols-2">
      {mod.fields.map((field) => (
        <p key={field.id}>
          <span className="text-slate-500">{field.label}:</span>{" "}
          {formatValue(field, values[field.id])}
        </p>
      ))}
    </div>
  );
}

function formatValue(field: CustomModuleForPatient["fields"][number], raw?: string) {
  if (!raw) return "—";
  if (field.fieldType === "boolean" || field.fieldType === "checkbox") return raw === "1" ? "Yes" : "No";
  return raw;
}

function DynamicField({
  field,
  defaultValue,
}: {
  field: CustomModuleForPatient["fields"][number];
  defaultValue?: string;
}) {
  const name = `field_${field.id}`;
  const label = (
    <>
      {field.label}
      {field.required ? <span className="text-[#B23A48]"> *</span> : null}
    </>
  );

  if (field.fieldType === "textarea") {
    return (
      <FormField>
        <Label>{label}</Label>
        <Textarea name={name} rows={3} defaultValue={defaultValue} required={field.required} />
      </FormField>
    );
  }

  if (field.fieldType === "boolean" || field.fieldType === "checkbox") {
    return (
      <CheckboxField
        id={name}
        name={name}
        label={field.label + (field.required ? " *" : "")}
        defaultChecked={defaultValue === "1"}
      />
    );
  }

  if (field.fieldType === "dropdown") {
    const options = parseFieldOptions(field.options);
    return (
      <FormField>
        <Label>{label}</Label>
        <select
          name={name}
          defaultValue={defaultValue ?? ""}
          required={field.required}
          className="rg-input h-11 w-full rounded-[10px] border-[1.5px] border-[#E2DDD3] bg-white px-3 text-sm"
        >
          <option value="">Select…</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </FormField>
    );
  }

  return (
    <FormField>
      <Label>{label}</Label>
      <Input
        name={name}
        type={field.fieldType === "number" ? "number" : field.fieldType === "date" ? "date" : "text"}
        defaultValue={defaultValue}
        required={field.required}
        step={field.fieldType === "number" ? "any" : undefined}
      />
    </FormField>
  );
}
