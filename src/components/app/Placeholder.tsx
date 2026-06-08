import { PageHeader, Card, EmptyState } from "@/components/ui/primitives";

export function Placeholder({ title, subtitle, lot }: { title: string; subtitle?: string; lot?: string }) {
  return (
    <div className="fade-up">
      <PageHeader title={title} subtitle={subtitle} />
      <Card>
        <EmptyState
          icon="layers"
          title="Module en cours de développement"
          text={lot ? `Cette page sera livrée dans le ${lot}.` : "Cette page sera livrée prochainement."}
        />
      </Card>
    </div>
  );
}
