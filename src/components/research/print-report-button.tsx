"use client";

import { Button } from "@/components/ui/button";

export function PrintReportButton() {
  return (
    <Button type="button" onClick={() => window.print()}>
      Print / Save PDF
    </Button>
  );
}
