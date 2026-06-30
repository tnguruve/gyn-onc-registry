"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function ModuleEditShell({
  canWrite,
  hasData,
  view,
  children,
}: {
  canWrite: boolean;
  hasData: boolean;
  view: ReactNode;
  children: ReactNode;
}) {
  const [editing, setEditing] = useState(!hasData);

  if (!canWrite) return <>{view}</>;

  if (!editing && hasData) {
    return (
      <>
        {view}
        <Button type="button" size="sm" variant="secondary" className="mt-3" onClick={() => setEditing(true)}>
          Edit module
        </Button>
      </>
    );
  }

  return (
    <div className="space-y-3">
      {children}
      {hasData ? (
        <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      ) : null}
    </div>
  );
}
