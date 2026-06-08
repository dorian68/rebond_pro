import { CheckEmailClient } from "./check-email-client";

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ email?: string; delivery?: string }> }) {
  const params = await searchParams;
  return <CheckEmailClient email={params.email ?? "votre adresse"} deliveryFailed={params.delivery === "failed"} />;
}
