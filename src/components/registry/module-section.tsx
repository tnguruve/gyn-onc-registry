import type { ReactNode } from "react";

export function ModuleSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#E2DDD3] bg-[#FAF8F4] p-4">
      <div className="mb-3 border-b border-[#EAE5DA] pb-2">
        <h4 className="text-sm font-semibold text-[#1a2421]">{title}</h4>
        {description ? <p className="mt-0.5 text-xs leading-relaxed text-[#5C6B66]">{description}</p> : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
