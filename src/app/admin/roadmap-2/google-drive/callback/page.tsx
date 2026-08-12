import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { getRoadmap2DriveStatus } from "@/server/roadmap2-drive-actions";
import styles from "../../roadmap2.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Google Drive — Roadmap 2", robots: { index: false, follow: false } };

function safeRoadmapKey(value?: string) {
  return value && /^[a-z0-9][a-z0-9-]{0,119}$/.test(value) ? value : null;
}

export default async function Roadmap2DriveCallbackPage({ searchParams }: {
  searchParams: Promise<{ status?: string; roadmap?: string }>;
}) {
  const params = await searchParams;
  const roadmapKey = safeRoadmapKey(params.roadmap);
  const verified = params.status === "success" && roadmapKey ? await getRoadmap2DriveStatus(roadmapKey) : null;
  const ok = Boolean(verified?.ok && verified.data.connected);
  const returnTo = roadmapKey ? `/admin/roadmap-2?roadmap=${encodeURIComponent(roadmapKey)}&drive=setup` : "/admin/roadmap-2?drive=setup";

  return (
    <section className={`${styles.workspace} ${styles.driveCallback}`}>
      <div className={styles.driveCallbackMark}><Icon name={ok ? "check-circle" : "alert-circle"} size={34} /></div>
      <div className={styles.eyebrow}>Google Drive · Roadmap 2</div>
      <h1>{ok ? "Google Drive est connecté" : "Connexion non finalisée"}</h1>
      <p>{ok
        ? "Vous pouvez maintenant créer l’arborescence Le Bon Rebond, afficher son contenu et préparer les dossiers de chaque résultat."
        : "La connexion active n’a pas pu être confirmée. Aucun succès n’est supposé : revenez à Roadmap 2 pour vérifier ou relancer l’autorisation Google."}</p>
      <Link href={returnTo} className={styles.primaryButton}>{ok ? "Créer l’arborescence Drive" : "Retour à Roadmap 2"}</Link>
    </section>
  );
}
