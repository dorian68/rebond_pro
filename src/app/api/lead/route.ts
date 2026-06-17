import { NextResponse } from "next/server";
import { z } from "zod";
import { sendLeadNotificationEmail } from "@/lib/email";

export const runtime = "nodejs";

// Lead public capturé via la carte de visite événement (/decouvrir). Pas d'auth (visiteur anonyme).
const schema = z.object({
  name: z.string().trim().min(2, "Nom requis.").max(120),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z.string().trim().email("Email invalide.").max(160).optional().or(z.literal("")),
  profil: z.enum(["centre", "particulier"]).optional(),
  source: z.string().trim().max(120).optional(),
  date: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = schema.safeParse(await req.json());
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
  }
  const d = parsed.data;
  if (!d.phone && !d.email) {
    return NextResponse.json({ error: "Indiquez au moins un téléphone ou un email." }, { status: 400 });
  }

  try {
    await sendLeadNotificationEmail({
      firstName: d.name,
      email: d.email || undefined,
      phone: d.phone || undefined,
      profileType: d.profil,
      intent: "contact_request",
      source: d.source || "Carte de visite — événement",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[lead] notification échouée", e);
    return NextResponse.json({ error: "Envoi impossible. Réessayez." }, { status: 500 });
  }
}
