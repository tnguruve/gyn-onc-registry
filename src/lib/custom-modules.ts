export const CUSTOM_FIELD_TYPES = [
  { id: "text", label: "Text", icon: "Aa" },
  { id: "textarea", label: "Long text", icon: "¶" },
  { id: "number", label: "Number", icon: "#" },
  { id: "date", label: "Date", icon: "📅" },
  { id: "dropdown", label: "Dropdown", icon: "▾" },
  { id: "checkbox", label: "Checkbox", icon: "☑" },
  { id: "boolean", label: "Yes / No", icon: "◉" },
] as const;

export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number]["id"];

export type CustomFieldDraft = {
  id?: string;
  label: string;
  fieldType: CustomFieldType;
  required: boolean;
  options: string[];
};

export type CustomModuleDraft = {
  id?: string;
  name: string;
  description: string;
  helperText: string;
  isPermanent: boolean;
  fields: CustomFieldDraft[];
};

export function slugifyModuleName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "module";
}

export function parseFieldOptions(options: string | null | undefined): string[] {
  if (!options) return [];
  try {
    const parsed = JSON.parse(options) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function parseModuleValues(values: string | null | undefined): Record<string, string> {
  if (!values) return {};
  try {
    const parsed = JSON.parse(values) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [k, v == null ? "" : String(v)]),
    );
  } catch {
    return {};
  }
}

export function customModuleAnchor(slug: string) {
  return `custom-${slug}`;
}
