#!/usr/bin/env node
// ============================================================================
// deploy.mjs — CI/CD RebondPro : push git + déploiement VPS (build + release).
//
// Reproduit la mécanique de prod observée sur le VPS Hetzner :
//   /opt/rebondpro/releases/<commit>/   (source d'une release, build sur le VPS)
//   docker build -> rebondpro-app:<commit> (+ :latest)
//   docker compose up -d                  (app Next.js 127.0.0.1:3000 + Postgres local)
//   Caddy SYSTÈME (non touché)            (HTTPS -> 127.0.0.1:3000)
//   DEPLOYED_COMMIT                       (commit actuellement en prod)
//
// GARANTIES DE SÉCURITÉ
//   • Aucun fichier .env* n'est transféré (git archive = fichiers suivis only,
//     et .env* est gitignored). => La prod garde SON .env.production / SA base VPS.
//   • Dry-run PAR DÉFAUT : rien ne s'exécute tant que --yes n'est pas passé.
//   • Rollback automatique si le health-check échoue après bascule.
//   • Sauvegarde DB avant toute migration (--migrate).
//
// USAGE
//   node scripts/deploy.mjs --dry-run                 # aperçu (défaut)
//   node scripts/deploy.mjs --yes                     # déploie le HEAD courant
//   node scripts/deploy.mjs --yes --commit "msg"      # commit+push puis déploie
//   node scripts/deploy.mjs --yes --migrate           # + prisma migrate deploy
//   node scripts/deploy.mjs --yes --skip-build        # saute le build local (gate)
//   node scripts/deploy.mjs --rollback                # revient au commit précédent
//
// Config surchargeable par variables d'env (sinon valeurs ci-dessous).
// ============================================================================

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

// ----------------------------- Configuration --------------------------------
const CFG = {
  vpsHost: process.env.DEPLOY_VPS_HOST ?? "root@204.168.138.243",
  sshKey: process.env.DEPLOY_SSH_KEY ?? resolve(homedir(), ".ssh", "rebondpro_deploy"),
  remoteDir: process.env.DEPLOY_REMOTE_DIR ?? "/opt/rebondpro",
  healthUrl: process.env.DEPLOY_HEALTH_URL ?? "https://lebonrebond.optiquant-ia.com/api/health",
  image: process.env.DEPLOY_IMAGE ?? "rebondpro-app",
  composeNet: process.env.DEPLOY_COMPOSE_NET ?? "rebondpro_default",
  dbService: process.env.DEPLOY_DB_SERVICE ?? "rebondpro-db",
  // Épinglé sur la version du projet : `npx prisma` sinon tire Prisma 7 (datasource `url` non supporté).
  prismaVersion: process.env.DEPLOY_PRISMA_VERSION ?? "6.19.3",
  branch: process.env.DEPLOY_BRANCH ?? "main",
  remote: process.env.DEPLOY_GIT_REMOTE ?? "origin",
  keepReleases: Number(process.env.DEPLOY_KEEP_RELEASES ?? 5),
  healthRetries: Number(process.env.DEPLOY_HEALTH_RETRIES ?? 12),
  healthDelayMs: Number(process.env.DEPLOY_HEALTH_DELAY_MS ?? 4000),
};

// ------------------------------- CLI args -----------------------------------
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const valOf = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };

const opts = {
  execute: has("--yes") || has("--execute"),
  dryRun: !(has("--yes") || has("--execute")) || has("--dry-run"),
  commitMsg: valOf("--commit"),
  migrate: has("--migrate"),
  skipBuild: has("--skip-build"),
  skipLint: has("--skip-lint"),
  allowDirty: has("--allow-dirty"),
  rollback: has("--rollback"),
};

// ------------------------------- Helpers ------------------------------------
const C = { reset: "\x1b[0m", dim: "\x1b[2m", red: "\x1b[31m", grn: "\x1b[32m", ylw: "\x1b[33m", cyn: "\x1b[36m", bold: "\x1b[1m" };
const log = (m) => console.log(m);
const step = (m) => console.log(`\n${C.cyn}${C.bold}▶ ${m}${C.reset}`);
const ok = (m) => console.log(`${C.grn}✓${C.reset} ${m}`);
const warn = (m) => console.log(`${C.ylw}⚠ ${m}${C.reset}`);
const die = (m) => { console.error(`${C.red}✗ ${m}${C.reset}`); process.exit(1); };

// Sur Windows, npm/npx sont des scripts .cmd : Node refuse de les lancer sans shell:true
// (sécurité CVE-2024-27980). git/ssh/scp/node sont des .exe, lancés directement.
const isWin = process.platform === "win32";
const winShellCmd = (cmd) => isWin && (cmd === "npm" || cmd === "npx");

/** Exécute une commande locale. En dry-run, log seulement. */
function local(cmd, cmdArgs, { capture = false, allowFail = false } = {}) {
  const printable = `${cmd} ${cmdArgs.join(" ")}`;
  if (opts.dryRun) { log(`${C.dim}[local] ${printable}${C.reset}`); return ""; }
  const useShell = winShellCmd(cmd);
  const opt = { shell: useShell, stdio: capture ? undefined : "inherit", encoding: capture ? "utf8" : undefined };
  const r = spawnSync(useShell ? `${cmd}.cmd` : cmd, cmdArgs, opt);
  if (r.status !== 0 && !allowFail) die(`Échec : ${printable}${capture ? "\n" + (r.stderr || r.stdout || "") : ""}`);
  return capture ? (r.stdout || "").trim() : "";
}

/** Construit les args ssh/scp avec la clé dédiée. */
const sshBase = ["-i", CFG.sshKey, "-o", "BatchMode=yes", "-o", "ConnectTimeout=15", "-o", "StrictHostKeyChecking=accept-new"];

/** Exécute une commande SHELL sur le VPS. */
function remote(shellCmd, { capture = false, allowFail = false } = {}) {
  if (opts.dryRun) { log(`${C.dim}[vps] ${shellCmd}${C.reset}`); return ""; }
  const r = spawnSync("ssh", [...sshBase, CFG.vpsHost, shellCmd], { encoding: capture ? "utf8" : undefined, stdio: capture ? "pipe" : "inherit" });
  if (r.status !== 0 && !allowFail) die(`Échec VPS : ${shellCmd}\n${capture ? r.stderr : ""}`);
  return capture ? (r.stdout || "").trim() : "";
}

function gitShort() {
  return execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
}

async function healthCheck() {
  for (let i = 1; i <= CFG.healthRetries; i++) {
    if (opts.dryRun) { log(`${C.dim}[health] GET ${CFG.healthUrl} (essai ${i})${C.reset}`); return true; }
    try {
      const res = await fetch(CFG.healthUrl, { signal: AbortSignal.timeout(8000) });
      const body = await res.json().catch(() => ({}));
      if (res.status === 200 && body.ok && body.db === "up") { ok(`Health OK (essai ${i}) — db:${body.db} latency:${body.latencyMs}ms`); return true; }
      warn(`Health pas encore prêt (essai ${i}/${CFG.healthRetries}) — status ${res.status} db ${body.db ?? "?"}`);
    } catch (e) { warn(`Health injoignable (essai ${i}/${CFG.healthRetries}) — ${String(e.message || e)}`); }
    await new Promise((r) => setTimeout(r, CFG.healthDelayMs));
  }
  return false;
}

// --------------------------------- Banner -----------------------------------
log(`${C.bold}RebondPro — déploiement${C.reset}`);
log(`  VPS        : ${CFG.vpsHost}`);
log(`  Remote dir : ${CFG.remoteDir}`);
log(`  Health     : ${CFG.healthUrl}`);
log(`  Mode       : ${opts.dryRun ? `${C.ylw}DRY-RUN (aucune action — ajouter --yes pour exécuter)${C.reset}` : `${C.grn}EXÉCUTION${C.reset}`}`);
if (!existsSync(CFG.sshKey) && !opts.dryRun) die(`Clé SSH introuvable : ${CFG.sshKey} (définir DEPLOY_SSH_KEY)`);

// =============================== ROLLBACK ===================================
if (opts.rollback) {
  step("ROLLBACK vers le commit précédent");
  const cur = remote(`cat ${CFG.remoteDir}/DEPLOYED_COMMIT 2>/dev/null || echo ""`, { capture: true });
  log(`  Commit déployé actuel : ${cur || "(inconnu)"}`);
  const prev = remote(`ls -1 ${CFG.remoteDir}/releases 2>/dev/null | grep -v "^${cur}$" | tail -1`, { capture: true });
  if (!prev && !opts.dryRun) die("Aucune release précédente trouvée pour rollback.");
  log(`  Cible rollback : ${prev || "<précédent>"}`);
  remote(`docker tag ${CFG.image}:${prev} ${CFG.image}:latest && cd ${CFG.remoteDir} && docker compose up -d`);
  const healthy = await healthCheck();
  if (!healthy) die("Rollback effectué mais health-check KO — intervention manuelle requise.");
  remote(`echo "${prev}" > ${CFG.remoteDir}/DEPLOYED_COMMIT`);
  ok(`Rollback terminé sur ${prev}`);
  process.exit(0);
}

// =============================== DÉPLOIEMENT ================================
(async () => {
  // --- 0. État git local ---
  step("Préflight — état git local");
  const dirty = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim();
  if (dirty && !opts.commitMsg && !opts.allowDirty) {
    die("Arbre de travail non commité. Utilise --commit \"message\" pour committer, ou --allow-dirty pour déployer le dernier commit tel quel.");
  }
  if (dirty && opts.commitMsg) {
    local("git", ["add", "-A"]);
    local("git", ["commit", "-m", opts.commitMsg]);
    ok("Changements commités");
  } else if (dirty) {
    warn("Arbre sale ignoré (--allow-dirty) : seul le dernier commit sera déployé.");
  } else {
    ok("Arbre de travail propre");
  }

  // --- 1. Gate qualité local (build) ---
  if (!opts.skipBuild) {
    if (!opts.skipLint) { step("Préflight — lint"); local("npm", ["run", "lint"], { allowFail: true }); }
    step("Préflight — build local (gate, échec rapide avant la prod)");
    local("npm", ["run", "build"]);
    ok("Build local OK");
  } else {
    warn("Build local sauté (--skip-build)");
  }

  // --- 2. Push git ---
  step(`Git push -> ${CFG.remote}/${CFG.branch}`);
  local("git", ["push", CFG.remote, `HEAD:${CFG.branch}`]);
  const commit = opts.dryRun ? "<commit>" : gitShort();
  ok(`Poussé (${commit})`);

  // --- 3. Transfert de la source vers une nouvelle release (archive tar, sans secrets) ---
  step(`Transfert source -> ${CFG.remoteDir}/releases/${commit}`);
  const tarball = resolve(process.cwd(), `.deploy-${commit}.tar`);
  local("git", ["archive", "--format=tar", "-o", tarball, "HEAD"]);            // fichiers suivis only
  remote(`mkdir -p ${CFG.remoteDir}/releases/${commit}`);
  if (!opts.dryRun) local("scp", [...sshBase, tarball, `${CFG.vpsHost}:${CFG.remoteDir}/releases/${commit}/src.tar`]);
  else log(`${C.dim}[local] scp .deploy-${commit}.tar -> ${CFG.vpsHost}:.../releases/${commit}/src.tar${C.reset}`);
  remote(`cd ${CFG.remoteDir}/releases/${commit} && tar -xf src.tar && rm -f src.tar`);
  local("node", ["-e", `require('fs').rmSync(${JSON.stringify(tarball)},{force:true})`], { allowFail: true });
  ok("Source transférée (aucun .env transféré — la prod garde sa config VPS)");

  // --- 4. Sauvegarde de l'image courante pour rollback + build de la nouvelle ---
  step("Build de l'image sur le VPS");
  const prevCommit = remote(`cat ${CFG.remoteDir}/DEPLOYED_COMMIT 2>/dev/null || echo ""`, { capture: true });
  if (prevCommit) log(`  (rollback possible vers ${prevCommit} via : node scripts/deploy.mjs --rollback)`);
  remote(`cd ${CFG.remoteDir} && docker build -t ${CFG.image}:${commit} -t ${CFG.image}:latest releases/${commit}`);
  ok(`Image construite : ${CFG.image}:${commit}`);

  // --- 5. (option) Sauvegarde DB + migrations ---
  if (opts.migrate) {
    step("Sauvegarde DB avant migration");
    remote(`${CFG.remoteDir}/backup.sh >> ${CFG.remoteDir}/backups/backup.log 2>&1 || echo "(backup.sh absent/échoué — poursuite prudente)"`);
    step("Migrations Prisma (conteneur jetable node:22-alpine, mot de passe lu sur le VPS)");
    const migrateCmd =
      `cd ${CFG.remoteDir} && PW=$(grep -E '^POSTGRES_PASSWORD=' .env | cut -d= -f2-) && ` +
      `docker run --rm --network ${CFG.composeNet} ` +
      `-e DATABASE_URL="postgresql://rebondpro:$PW@${CFG.dbService}:5432/rebondpro?schema=public" ` +
      `-v ${CFG.remoteDir}/releases/${commit}/prisma:/prisma ` +
      `node:22-alpine sh -c "npx --yes prisma@${CFG.prismaVersion} migrate deploy --schema=/prisma/schema.prisma"`;
    remote(migrateCmd);
    ok("Migrations appliquées");
  } else {
    warn("Migrations sautées (aucun changement de schéma attendu — ajouter --migrate si besoin)");
  }

  // --- 6. Bascule (recrée l'app avec la nouvelle image latest) ---
  step("Bascule — docker compose up -d");
  remote(`cd ${CFG.remoteDir} && docker compose up -d`);

  // --- 7. Health-check + rollback auto ---
  step("Vérification santé");
  const healthy = await healthCheck();
  if (!healthy) {
    warn("Health-check KO — ROLLBACK automatique");
    if (prevCommit) {
      remote(`docker tag ${CFG.image}:${prevCommit} ${CFG.image}:latest && cd ${CFG.remoteDir} && docker compose up -d`);
      const back = await healthCheck();
      if (back) { remote(`echo "${prevCommit}" > ${CFG.remoteDir}/DEPLOYED_COMMIT`); die(`Déploiement annulé : rollback sur ${prevCommit} effectué et sain.`); }
      die("Rollback tenté mais toujours KO — intervention manuelle requise (ssh VPS, docker logs rebondpro-app).");
    }
    die("Health KO et pas d'image précédente pour rollback — intervention manuelle.");
  }

  // --- 8. Finalisation ---
  step("Finalisation");
  remote(`echo "${commit}" > ${CFG.remoteDir}/DEPLOYED_COMMIT`);
  // Prune des vieilles releases (garde les N dernières)
  remote(`cd ${CFG.remoteDir}/releases && ls -1t | tail -n +${CFG.keepReleases + 1} | xargs -r rm -rf`);
  // Purge Docker — évite la saturation disque du VPS (cache de build + vieux tags de l'app).
  // Non bloquant : une purge qui échoue ne doit JAMAIS faire échouer un déploiement.
  // Ne cible QUE les images `${CFG.image}` : les autres applications du serveur ne sont jamais touchées.
  step("Purge Docker (cache de build + vieilles images de l'app)");
  const keepTags = [commit, "latest", prevCommit].filter(Boolean).join("|");
  remote(`docker builder prune -f --keep-storage=3GB 2>/dev/null || docker builder prune -af`, { allowFail: true });
  remote(`docker images ${CFG.image} --format '{{.Repository}}:{{.Tag}}' | grep -vE ':(${keepTags})$' | xargs -r docker rmi`, { allowFail: true });
  const disk = remote(`df -h / | awk 'NR==2{print $5" utilisé, "$4" libre"}'`, { capture: true, allowFail: true });
  ok(`Purge effectuée${disk ? ` — disque : ${disk.trim()}` : ""}`);
  ok(`Déploiement terminé — ${commit} en production`);
  log(`\n${C.grn}${C.bold}✓ ${CFG.healthUrl} sert maintenant ${commit}${C.reset}`);
  if (opts.dryRun) log(`\n${C.ylw}(DRY-RUN : rien n'a été exécuté. Relance avec --yes pour déployer réellement.)${C.reset}`);
})();
