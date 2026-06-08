import "./_env";
import { prisma } from "../src/lib/prisma";
import { createTestTenant, step, assert, runner } from "./_tenant";
import { hashPassword, verifyPassword } from "../src/lib/password";
import { createPasswordResetToken, consumePasswordReset, resetTokenHash } from "../src/server/password-reset";
import { isLocked, recordFailedLogin, recordSuccessfulLogin, MAX_ATTEMPTS } from "../src/server/login-throttle";

runner("password_reset_smoke", async () => {
  const t = await createTestTenant("pwd");
  try {
    // Le user de test doit avoir un mot de passe initial
    await prisma.user.update({ where: { id: t.userId }, data: { passwordHash: await hashPassword("ancien-mdp-123"), emailVerified: new Date() } });

    // 1. Création du jeton : stocké HACHÉ, jamais en clair
    const created = await createPasswordResetToken(t.email!);
    assert(created?.token, "Jeton de reset non créé.");
    const stored = await prisma.passwordResetToken.findFirst({ where: { userId: t.userId } });
    assert(stored, "Jeton non persisté.");
    assert(stored.tokenHash === resetTokenHash(created.token), "Le jeton n'est pas stocké sous forme de hash.");
    assert(stored.tokenHash !== created.token, "Le jeton clair ne doit pas être stocké.");
    assert(!stored.usedAt, "Le jeton ne doit pas être marqué utilisé à la création.");
    step("token_created_hashed", { hashed: true });

    // 2. Jeton invalide → refusé
    const bad = await consumePasswordReset("jeton-bidon", "nouveau-mdp-123");
    assert(!bad.ok, "Un jeton invalide ne doit pas être accepté.");
    // Mot de passe trop court → refusé
    const short = await consumePasswordReset(created.token, "court");
    assert(!short.ok, "Un mot de passe trop court doit être refusé.");
    step("invalid_inputs_rejected");

    // 3. Consommation valide → mot de passe changé + jeton consommé
    const ok = await consumePasswordReset(created.token, "nouveau-mdp-123");
    assert(ok.ok, "La réinitialisation valide a échoué.");
    const user = await prisma.user.findUnique({ where: { id: t.userId } });
    assert(user && (await verifyPassword("nouveau-mdp-123", user.passwordHash!)), "Le nouveau mot de passe n'est pas actif.");
    assert(!(await verifyPassword("ancien-mdp-123", user!.passwordHash!)), "L'ancien mot de passe fonctionne encore.");
    const consumed = await prisma.passwordResetToken.findUnique({ where: { id: stored.id } });
    assert(consumed?.usedAt, "Le jeton n'a pas été marqué utilisé.");
    step("password_changed_token_consumed");

    // 4. Réutilisation du jeton → refusée
    const reuse = await consumePasswordReset(created.token, "encore-un-mdp-123");
    assert(!reuse.ok, "Un jeton déjà utilisé ne doit pas être réutilisable.");
    step("token_reuse_blocked");

    // 5. Expiration logique
    const exp = await createPasswordResetToken(t.email!);
    await prisma.passwordResetToken.updateMany({ where: { userId: t.userId, usedAt: null }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const expired = await consumePasswordReset(exp!.token, "mdp-apres-expiration-123");
    assert(!expired.ok, "Un jeton expiré ne doit pas être accepté.");
    step("expired_token_rejected");

    // 6. Anti-bruteforce : verrouillage après MAX_ATTEMPTS échecs
    let locked = false;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const r = await recordFailedLogin(t.userId);
      locked = r.locked;
    }
    assert(locked, "Le compte aurait dû être verrouillé après le seuil d'échecs.");
    const lockedUser = await prisma.user.findUnique({ where: { id: t.userId } });
    assert(isLocked(lockedUser!), "isLocked devrait renvoyer true.");
    step("bruteforce_lock_engaged", { maxAttempts: MAX_ATTEMPTS });

    // 7. Connexion réussie → réinitialise le verrou
    await recordSuccessfulLogin(t.userId);
    const unlocked = await prisma.user.findUnique({ where: { id: t.userId } });
    assert(!isLocked(unlocked!) && unlocked!.failedLoginCount === 0, "Le verrou n'a pas été réinitialisé après succès.");
    step("lock_reset_on_success");
  } finally {
    await t.cleanup();
    step("tenant_cleanup");
  }
});
