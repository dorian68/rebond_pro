import Link from "next/link";
import { breadcrumbData, type BreadcrumbItem } from "@/lib/site-seo";
import { StructuredData } from "./StructuredData";

export function PageBreadcrumbs({ items, className }: { items: readonly BreadcrumbItem[]; className?: string }) {
  return (
    <>
      <nav aria-label="Fil d'Ariane" className={className}>
        <ol style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: ".4rem", listStyle: "none", padding: 0, margin: 0, fontSize: ".85rem", lineHeight: 1.6 }}>
          {items.map((item, index) => (
            <li key={item.path} style={{ display: "inline-flex", alignItems: "center", gap: ".4rem" }}>
              {index > 0 && <span aria-hidden="true">›</span>}
              {index === items.length - 1
                ? <span aria-current="page">{item.name}</span>
                : <Link href={item.path} style={{ color: "inherit" }}>{item.name}</Link>}
            </li>
          ))}
        </ol>
      </nav>
      <StructuredData data={breadcrumbData(items)} />
    </>
  );
}
