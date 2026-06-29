"use client";

import { deletePatientAction } from "@/app/actions";

export function DeletePatientButton({
  patientId,
  patientLabel,
  variant = "button",
}: {
  patientId: string;
  patientLabel: string;
  variant?: "button" | "inline";
}) {
  return (
    <form
      action={deletePatientAction.bind(null, patientId)}
      onSubmit={(e) => {
        const message = `Delete ${patientLabel}?\n\nThis permanently removes the patient and all registry modules. This cannot be undone.`;
        if (!confirm(message)) e.preventDefault();
      }}
      className={variant === "inline" ? "inline" : undefined}
      onClick={variant === "inline" ? (e) => e.stopPropagation() : undefined}
    >
      <button
        type="submit"
        className={
          variant === "inline"
            ? "rounded-[8px] border border-[#F2D6D6] bg-[#FBEAEC] px-2.5 py-1 text-[11.5px] font-semibold text-[#B23A48] transition hover:bg-[#f5d5d9]"
            : "rounded-[10px] border border-[#F2D6D6] bg-[#FBEAEC] px-3.5 py-2 text-sm font-semibold text-[#B23A48] transition hover:bg-[#f5d5d9]"
        }
      >
        Delete
      </button>
    </form>
  );
}
