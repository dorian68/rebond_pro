import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { resolvePostLoginDestination } from "@/server/auth-routing";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?oauth=session_missing");

  const url = new URL(request.url);
  const destination = await resolvePostLoginDestination({
    userId: session.user.id,
    requestedSpace: url.searchParams.get("space"),
    next: url.searchParams.get("next"),
  });

  redirect(destination);
}
