import type { ReactNode } from "react";

export function EmptyPanel({ body, title }: { body: string; title: string }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-6 text-center shadow-sm">
      <p className="font-black">{title}</p>
      <p className="mt-1 text-sm text-stone-600">{body}</p>
    </section>
  );
}

export function EmptyText({ children }: { children: ReactNode }) {
  return <p className="rounded-lg bg-stone-50 p-3 text-sm text-stone-600">{children}</p>;
}
