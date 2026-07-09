const SAVED_LABELS: Record<string, string> = {
  demographics: "Demographics saved",
  referral: "Referral & delays saved",
  diagnosis: "Diagnosis saved",
  mdt: "MDT meeting recorded",
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
  notice,
}: {
  saved?: string | null;
  error?: string | null;
  notice?: string | null;
}) {
  if (!saved && !error && !notice) return null;

  if (notice === "existing-national-id") {
    return (
      <div className="rounded-lg border border-[#D5E4E2] bg-[#ECF3F2] px-4 py-3 text-sm text-[#0C4F4E]">
        This national ID is already registered — opened the existing patient record.
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </div>
    );
  }

  const label =
    SAVED_LABELS[saved!] ??
    (saved?.startsWith("custom-") ? "Custom module saved" : "Changes saved");
  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
      ✓ {label}. Data is stored in the registry database.
    </div>
  );
}
