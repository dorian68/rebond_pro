import { requirePlatformAdmin } from "@/lib/platform";
import QuestionnairesDashboard from "./questionnaires-dashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Questionnaires | Administration Le Bon Rebond", robots: { index: false, follow: false } };
export default async function QuestionnairesPage() {
  await requirePlatformAdmin();
  return <QuestionnairesDashboard />;
}
