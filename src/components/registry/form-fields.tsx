import { CodeOption } from "@/lib/codes";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/field";

export function CodedSelect({
  id,
  name,
  label,
  options,
  defaultValue,
  required,
}: {
  id: string;
  name: string;
  label: string;
  options: CodeOption[];
  defaultValue?: string | null;
  required?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Select id={id} name={name} defaultValue={defaultValue ?? ""} required={required}>
        <option value="">Select...</option>
        {options.map((o) => (
          <option key={o.code} value={o.code}>
            {o.code} — {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

export function CheckboxField({
  id,
  name,
  label,
  defaultChecked,
}: {
  id: string;
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm text-slate-700">
      <input id={id} type="checkbox" name={name} defaultChecked={defaultChecked} />
      {label}
    </label>
  );
}
