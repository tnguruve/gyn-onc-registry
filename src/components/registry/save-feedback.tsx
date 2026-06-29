const SAVED_LABELS: Record<string, string> = {
  demographics: "Demographics saved",
  referral: "Referral & delays saved",
  diagnosis: "Diagnosis saved",
  imaging: "Imaging saved",
  histopathology: "Histopathology saved",
  radiotherapy: "Radiotherapy saved",
  recurrence: "Recurrence saved",
  survival: "Survival outcomes saved",
  research: "Research module saved",
};

export function SaveFeedback({
  saved,
  error,
}: {
  saved?: string | null;
  error?: string | null;
}) {
  if (!saved && !error) return null;

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </div>
    );
  }

  const label = SAVED_LABELS[saved!] ?? "Changes saved";
  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
      ✓ {label}. Data is stored in the registry database.
    </div>
  );
}
