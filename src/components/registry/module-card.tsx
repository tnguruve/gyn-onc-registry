import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ModuleCard({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-24">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <p className="text-sm text-slate-600">{description}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export const REGISTRY_MODULES = [
  { id: "demographics", label: "Demographics" },
  { id: "referral", label: "Referral & delays" },
  { id: "diagnosis", label: "Diagnosis" },
  { id: "mdt", label: "MDT" },
  { id: "imaging", label: "Imaging" },
  { id: "surgery", label: "Surgery" },
  { id: "histopathology", label: "Histopathology" },
  { id: "chemotherapy", label: "Chemotherapy" },
  { id: "radiotherapy", label: "Radiotherapy" },
  { id: "complications", label: "Complications" },
  { id: "followup", label: "Follow-up" },
  { id: "recurrence", label: "Recurrence" },
  { id: "survival", label: "Survival" },
  { id: "research", label: "Research / biobank" },
] as const;
