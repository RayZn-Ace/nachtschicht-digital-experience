import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export default function PagedItems<T>({ items, children, pageSize = 100, tableColumns }: { items: T[]; children: (item: T, index: number) => ReactNode; pageSize?: number; tableColumns?: number }) {
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [items]);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pages - 1);
  const controls = <div className="flex flex-wrap justify-between items-center gap-2 py-3"><span className="text-sm text-muted-foreground">Seite {current + 1}/{pages} · {items.length} Einträge</span><div className="flex gap-2"><Button variant="outline" disabled={current === 0} onClick={() => setPage(current - 1)}>Zurück</Button><Button variant="outline" disabled={current === pages - 1} onClick={() => setPage(current + 1)}>Weiter</Button></div></div>;
  return <>{items.slice(current * pageSize, (current + 1) * pageSize).map((item, index) => children(item, index))}
    {pages > 1 && (tableColumns ? <tr><td colSpan={tableColumns}>{controls}</td></tr> : controls)}
  </>;
}