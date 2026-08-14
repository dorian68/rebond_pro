"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import {
  grantPlatformAdminByEmail,
  revokePlatformAdmin,
  type PlatformAdminAccessActionResult,
} from "@/server/platform-admin-access-actions";
import type { PlatformAdminManagementData, PlatformAdminSource } from "@/server/platform-admin-access";
import styles from "./super-admins.module.css";

const SOURCE_LABELS: Record<PlatformAdminSource, string> = {
  database: "Géré depuis cet écran",
  configuration: "Configuration serveur",
  database_and_configuration: "Écran + configuration serveur",
};

function formatDate(value: string | null) {
  if (!value) return "Jamais";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function displayName(person: { name: string | null; email: string } | null) {
  if (!person) return "Compte supprimé";
  return person.name?.trim() || person.email;
}

export function PlatformAdminAccessManager({ data }: { data: PlatformAdminManagementData }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<PlatformAdminAccessActionResult | null>(null);

  const grant = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;
    const confirmed = window.confirm(
      `Accorder à ${normalizedEmail} un accès complet à toutes les données et actions de l’administration plateforme ?`,
    );
    if (!confirmed) return;

    setPendingUserId("grant");
    setFeedback(null);
    startTransition(async () => {
      const result = await grantPlatformAdminByEmail(normalizedEmail);
      setFeedback(result);
      setPendingUserId(null);
      if (result.ok) {
        setEmail("");
        router.refresh();
      }
    });
  };

  const revoke = (admin: PlatformAdminManagementData["admins"][number]) => {
    const confirmed = window.confirm(
      `Retirer l’accès super-admin de ${admin.email} ? Cette personne perdra immédiatement l’accès à tout l’espace /admin.`,
    );
    if (!confirmed) return;

    setPendingUserId(admin.id);
    setFeedback(null);
    startTransition(async () => {
      const result = await revokePlatformAdmin(admin.id);
      setFeedback(result);
      setPendingUserId(null);
      if (result.ok) router.refresh();
    });
  };

  return (
    <div className={styles.stack}>
      <section className={styles.warning} aria-label="Portée du rôle super-admin">
        <div className={styles.warningIcon}><Icon name="shield" size={22} /></div>
        <div>
          <strong>Accès global et sensible</strong>
          <p>
            Un super-admin peut consulter les données de tous les centres et utiliser les actions plateforme,
            notamment Roadmap 2, les bénéficiaires et les flux financiers. N’accordez ce rôle qu’à une personne de confiance.
          </p>
        </div>
      </section>

      <div className={styles.grid}>
        <section className={styles.card} aria-labelledby="grant-title">
          <div className={styles.sectionHeading}>
            <div className={styles.sectionIcon}><Icon name="user-check" size={20} /></div>
            <div>
              <h2 id="grant-title">Ajouter un super-admin</h2>
              <p>Le compte doit déjà exister et son adresse email doit être vérifiée.</p>
            </div>
          </div>
          <form onSubmit={grant} className={styles.form}>
            <label htmlFor="platform-admin-email">Adresse email exacte</label>
            <div className={styles.formRow}>
              <input
                id="platform-admin-email"
                type="email"
                autoComplete="email"
                placeholder="collegue@entreprise.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={pending}
                required
              />
              <button type="submit" className="btn btn-primary" disabled={pending || !email.trim()}>
                <Icon name="plus" size={16} />
                {pendingUserId === "grant" ? "Attribution…" : "Accorder l’accès"}
              </button>
            </div>
          </form>
          <p className={styles.hint}>
            Si le compte n’existe pas encore, demandez à la personne de se connecter une première fois avec Google ou de finaliser son inscription.
            L’attribution est immédiate, mais n’envoie aucune invitation ni notification : transmettez-lui ensuite le lien de connexion.
          </p>
        </section>

        <section className={styles.card} aria-labelledby="summary-title">
          <div className={styles.sectionHeading}>
            <div className={styles.sectionIcon}><Icon name="users" size={20} /></div>
            <div>
              <h2 id="summary-title">Situation actuelle</h2>
              <p>{data.admins.length} compte{data.admins.length > 1 ? "s" : ""} avec un accès effectif.</p>
            </div>
          </div>
          <dl className={styles.summary}>
            <div><dt>Gérés ici</dt><dd>{data.admins.filter((admin) => admin.source === "database").length}</dd></div>
            <div><dt>Configuration serveur</dt><dd>{data.admins.filter((admin) => admin.source !== "database").length}</dd></div>
          </dl>
        </section>
      </div>

      {feedback && (
        <div className={feedback.ok ? styles.success : styles.error} role={feedback.ok ? "status" : "alert"}>
          <Icon name={feedback.ok ? "check-circle" : "alert-circle"} size={18} />
          {feedback.message ?? feedback.error}
        </div>
      )}

      <section className={styles.card} aria-labelledby="admins-title">
        <div className={styles.sectionHeading}>
          <div className={styles.sectionIcon}><Icon name="shield" size={20} /></div>
          <div>
            <h2 id="admins-title">Super-admins actifs</h2>
            <p>
              Les accès provenant de la configuration serveur sont visibles, mais ne peuvent pas être retirés depuis cet écran.
              Leur retrait exige de modifier <code>PLATFORM_ADMIN_EMAILS</code>, puis de redéployer ou redémarrer l’application.
            </p>
          </div>
        </div>

        <div className={styles.adminList}>
          {data.admins.map((admin) => (
            <article className={styles.adminRow} key={admin.id}>
              <div className={styles.identity}>
                <div className={styles.avatar} aria-hidden="true">
                  {(admin.name?.trim() || admin.email).slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div className={styles.nameLine}>
                    <strong>{admin.name?.trim() || admin.email}</strong>
                    {admin.isCurrentUser && <span className="badge badge-primary">Vous</span>}
                    {!admin.emailVerified && <span className="badge badge-warn">Email non vérifié</span>}
                  </div>
                  {admin.name && <div className={styles.email}>{admin.email}</div>}
                </div>
              </div>
              <div className={styles.metadata}>
                <span>{SOURCE_LABELS[admin.source]}</span>
                <span>Dernière connexion : {formatDate(admin.lastLoginAt)}</span>
              </div>
              <div className={styles.action}>
                {admin.canRevoke ? (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => revoke(admin)}
                    disabled={pending}
                  >
                    <Icon name="user-x" size={15} />
                    {pendingUserId === admin.id ? "Retrait…" : "Retirer l’accès"}
                  </button>
                ) : (
                  <span className={styles.lockedReason}>
                    {admin.isCurrentUser ? "Auto-retrait bloqué" : "Géré côté serveur"}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>

        {data.configuredWithoutAccount.length > 0 && (
          <div className={styles.configNotice}>
            <strong>Adresses configurées sans compte actif</strong>
            <p>{data.configuredWithoutAccount.join(", ")}</p>
            <p>
              Ces adresses n’ont pas encore accès. Elles deviendront automatiquement super-admin dès qu’un compte correspondant existera.
            </p>
          </div>
        )}
      </section>

      <section className={styles.card} aria-labelledby="history-title">
        <div className={styles.sectionHeading}>
          <div className={styles.sectionIcon}><Icon name="clock" size={20} /></div>
          <div>
            <h2 id="history-title">Historique des modifications</h2>
            <p>Les 25 dernières attributions et révocations enregistrées.</p>
          </div>
        </div>
        {data.recentActivity.length === 0 ? (
          <p className={styles.empty}>Aucune modification effectuée depuis cet écran.</p>
        ) : (
          <div className={styles.historyList}>
            {data.recentActivity.map((entry) => (
              <div className={styles.historyRow} key={entry.id}>
                <span className={`badge ${entry.action.endsWith("granted") ? "badge-positive" : "badge-neutral"}`}>
                  {entry.action.endsWith("granted") ? "Accès accordé" : "Accès retiré"}
                </span>
                <span><strong>{displayName(entry.actor)}</strong> → {displayName(entry.target)}</span>
                <time dateTime={entry.createdAt}>{formatDate(entry.createdAt)}</time>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
