import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import RecallForm from "./RecallForm";
import { isSainteLucieOpen, SAINTE_LUCIE_PATH } from "./opportunity";
import styles from "./sainte-lucie.module.css";

export const dynamic = "force-dynamic";

const title = "Service Civique à Sainte-Lucie | Le Bon Rebond";
const description = "Une mission de Service Civique international à Sainte-Lucie autour de la participation citoyenne. Le Bon Rebond t'accompagne de la découverte de l'offre jusqu'à la fin de la mission et facilite le lien avec la CARL.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: SAINTE_LUCIE_PATH },
  openGraph: {
    title,
    description,
    url: SAINTE_LUCIE_PATH,
    siteName: "Le Bon Rebond",
    locale: "fr_FR",
    type: "article",
    images: [{ url: "/photos/sainte-lucie-pitons-illustration.png", alt: "Vue illustrative des Pitons de Sainte-Lucie" }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/photos/sainte-lucie-pitons-illustration.png"] },
};

const missionTasks = [
  "Participer à l’organisation d’ateliers avec des associations et des communautés locales.",
  "Prendre part à des échanges avec les habitants et observer leurs façons de participer aux décisions.",
  "Réaliser des observations et des enquêtes de terrain.",
  "Repérer puis documenter des initiatives utiles autour de la participation citoyenne et de la biodiversité.",
  "Contribuer à des fiches de bonnes pratiques et à un kit de démocratie participative destiné à la CARL.",
];

const conditions = [
  ["Lieu", "Castries, Sainte-Lucie"],
  ["Durée", "Mission présentée sur 6 mois ; l’annonce officielle indique une plage de 6 à 12 mois"],
  ["Départ prévu", "Décembre 2026"],
  ["Rythme", "30 heures par semaine"],
  ["Âge recherché", "18 à 25 ans"],
  ["Expérience", "Aucune expérience professionnelle particulière exigée"],
  ["Anglais", "Maîtrise souhaitée"],
  ["Service Civique antérieur", "Ne pas avoir déjà effectué de Service Civique"],
  ["Indemnisation", "Indemnisation mensuelle prévue dans le cadre du dispositif"],
  ["Départ et séjour", "Trajet aller-retour pris en charge ; hébergement remboursé selon les modalités prévues, notamment sur justificatif"],
];

const steps = [
  ["01", "Tu nous parles de ton projet", "Tu laisses tes coordonnées et tes premières questions. Nous échangeons avec toi sur la mission et ta situation."],
  ["02", "Nous construisons la suite avec toi", "Nous regardons ensemble tes motivations, ton anglais, ta disponibilité et ce que cette expérience peut apporter à ton parcours."],
  ["03", "Nous faisons le lien avec la CARL", "Nous sommes en contact direct avec la CARL, qui recherche un volontaire. Avec ton accord, nous lui transmettons ton adresse e-mail pour faciliter la mise en relation."],
  ["04", "Nous t’aidons dans les démarches", "Nous t’accompagnons pour présenter ton parcours, préparer ton CV et ta motivation, comprendre les échanges et te préparer à un éventuel entretien."],
  ["05", "Nous restons à tes côtés jusqu’au bout", "Si tu es sélectionné, notre accompagnement se poursuit pendant la mission et jusqu’à sa fin, pour faire le point sur ton expérience et préparer la suite. La sélection appartient aux organismes responsables."],
];

function RecallLink({ light = false }: { light?: boolean }) {
  return <a className={light ? styles.buttonLight : styles.button} href="#rappel">Je souhaite être recontacté(e) <span aria-hidden="true">↗</span></a>;
}

export default function SainteLuciePage() {
  const open = isSainteLucieOpen();

  return (
    <article className={styles.page}>
      <section className={styles.hero} aria-labelledby="opportunity-title">
        <div className={styles.wrap}>
          <nav className={styles.breadcrumb} aria-label="Fil d’Ariane">
            <Link href="/">Accueil</Link><span aria-hidden="true">/</span><span>Cap sur Sainte-Lucie</span>
          </nav>
          <div className={styles.heroIntro}>
            <p className={styles.kicker}><span /> Une opportunité de volontariat international</p>
            <h1 id="opportunity-title">Service Civique international à <em>Sainte-Lucie</em> : <span className={styles.titleTail}>une expérience au cœur de la Caraïbe</span></h1>
            <p className={styles.heroLead}>Vis plusieurs mois à Sainte-Lucie et engage-toi dans un projet qui a du sens.</p>
            <div className={styles.heroEssentials}>
              <div className={styles.heroMeta} aria-label="Informations clés">
                <span>Castries, Sainte-Lucie</span><span>Environ 6 mois</span><span>Départ décembre 2026</span>
              </div>
              {open ? (
                <div className={styles.heroAction}>
                  <RecallLink />
                  <p>Date limite de candidature officielle : <strong>11 octobre 2026</strong>. Nous t’accompagnons dans les démarches et faisons le lien avec la CARL, avec ton accord.</p>
                </div>
              ) : (
                <div className={styles.closedNotice} role="status">
                  <strong>La date limite du 11 octobre 2026 est passée.</strong> Cette page reste disponible pour découvrir la mission. <Link href="/contact">Parlons d’autres opportunités</Link>.
                </div>
              )}
            </div>
          </div>
        </div>
        <figure className={styles.heroImage}>
          <Image src="/photos/sainte-lucie-pitons-illustration.png" alt="Vue illustrative des Pitons et de la côte de Sainte-Lucie" fill priority sizes="(max-width: 800px) 100vw, 1240px" className={styles.heroPhoto} />
          <figcaption>Vue illustrative de Sainte-Lucie</figcaption>
        </figure>
        <div className={styles.wrap}>
          <p className={styles.heroCopy}>Le Bon Rebond t’accompagne dans cette mission à Castries, de tes premières questions jusqu’à la fin de l’expérience si tu es sélectionné. Tu participeras à un projet d’intérêt général autour de la participation citoyenne, de la coopération caribéenne et de la biodiversité. Nous prenons le temps de comprendre ton projet, faisons le lien avec la CARL, qui recherche un volontaire, et restons à tes côtés à chaque étape.</p>
        </div>
      </section>

      <div className={styles.narrative}>
        <section className={styles.section} aria-labelledby="service-civique">
          <div className={styles.wrapNarrow}>
            <p className={styles.eyebrow}>Comprendre avant de partir</p>
            <h2 id="service-civique">Avant tout, ce n’est pas un emploi classique.</h2>
            <p>Un <strong>Service Civique</strong> est un engagement au service de l’intérêt général. Tu rejoins une organisation pour contribuer à une mission utile, découvrir un nouvel environnement et développer des compétences. Ce n’est pas un poste salarié.</p>
            <p>Le dispositif est accessible sans condition de diplôme ni d’expérience. À l’international, il permet de vivre cet engagement dans un autre pays : tu découvres une culture, tu participes aux activités d’une organisation locale et tu apprends en faisant.</p>
            <p>Tu bénéficies d’un cadre avec indemnisation mensuelle, accompagnement, tutorat et formations. Pour cette mission précise, les critères de l’annonce incluent <strong>18 à 25 ans</strong> et l’absence de Service Civique antérieur.</p>
          </div>
        </section>

        <section className={`${styles.section} ${styles.cream}`} aria-labelledby="mission">
          <div className={styles.wrapNarrow}>
            <p className={styles.eyebrow}>La mission à Castries</p>
            <h2 id="mission">Contribue à une société plus participative.</h2>
            <p>La mission, proposée dans le cadre du programme TEVO par la Communauté d’Agglomération La Riviera du Levant (CARL), avec France Volontaires Antilles comme organisme d’envoi, porte sur la <strong>démocratie participative en milieu caribéen</strong>.</p>
            <p>À Sainte-Lucie, tu découvriras comment des organisations locales mobilisent les habitants et créent des espaces de dialogue. Le travail s’appuie notamment sur un projet régional de conservation de la biodiversité entre Sainte-Lucie et la Dominique, avec des acteurs locaux dont Impact Caribbean.</p>
            <blockquote>Tu vas apprendre en faisant, au contact des personnes et des projets sur le terrain.</blockquote>
            <h3>Ce que tu pourras faire au quotidien</h3>
            <ul className={styles.taskList}>{missionTasks.map((task) => <li key={task}>{task}</li>)}</ul>
            <p>Tu ne seras pas là uniquement pour observer : tu pourras rencontrer, participer, analyser et restituer. Les activités exactes seront précisées par la structure d’accueil.</p>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="apports">
          <div className={styles.wrapNarrow}>
            <p className={styles.eyebrow}>Ce que tu peux en retirer</p>
            <h2 id="apports">Une première expérience qui peut clarifier la suite.</h2>
            <p>Cette mission peut t’aider à gagner en autonomie, à travailler en équipe dans un environnement interculturel, à communiquer en anglais et à mieux organiser ce que tu observes sur le terrain.</p>
            <p>Elle peut aussi t’ouvrir des pistes dans le développement local, l’environnement, la communication, la vie associative ou la coopération internationale. Tu n’as pas besoin d’avoir déjà tout prévu pour commencer à en parler.</p>
            <div className={styles.question}>
              <h3>Et si mon anglais n’est pas parfait ?</h3>
              <p>Ne t’auto-élimine pas : la maîtrise de l’anglais est <strong>souhaitée</strong>. Il faut avoir envie de le pratiquer au quotidien, mais ton niveau et tes inquiétudes peuvent être abordés lors de notre échange.</p>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.deep}`} aria-labelledby="conditions">
          <div className={styles.wrapNarrow}>
            <p className={styles.eyebrow}>Les repères pratiques</p>
            <h2 id="conditions">Les conditions de la mission</h2>
            <dl className={styles.conditions}>{conditions.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
            <p className={styles.conditionsNote}>Une couverture sociale, des formations obligatoires et des démarches liées à la mobilité internationale sont également prévues. Les conditions contractuelles définitives, la durée exacte et les modalités financières sont celles confirmées par les organismes responsables lors de la sélection.</p>
            <p className={styles.source}>Informations vérifiées le 29 septembre 2026 dans <a href="https://france-volontaires.org/mission/france-volontaires-antilles-caraibes-sainte-lucie-castries-appui-a-la-democratie-participative-en-milieu-caribeen/" target="_blank" rel="noopener noreferrer">l’annonce officielle de France Volontaires</a>.</p>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="profil">
          <div className={styles.wrapNarrow}>
            <p className={styles.eyebrow}>Et toi dans tout ça ?</p>
            <h2 id="profil">Cette mission peut-elle te correspondre ?</h2>
            <p>Tu peux l’envisager si tu as entre 18 et 25 ans, n’as pas déjà effectué de Service Civique, et es prêt à vivre plusieurs mois à Sainte-Lucie. La curiosité, l’envie d’apprendre et l’intérêt pour la Caraïbe, l’environnement ou la participation citoyenne comptent davantage qu’un CV déjà rempli.</p>
            <p>Tu hésites à cause de l’anglais, du départ ou de la suite de ton parcours ? L’échange avec Le Bon Rebond sert justement à regarder ces questions avec toi.</p>
            {open && <div className={styles.midCta}><RecallLink /><span>Un accompagnement personnalisé tout au long de tes démarches.</span></div>}
          </div>
        </section>

        <section className={`${styles.section} ${styles.cream}`} aria-labelledby="acteurs">
          <div className={styles.wrapNarrow}>
            <p className={styles.eyebrow}>Qui fait quoi ?</p>
            <h2 id="acteurs">Des rôles complémentaires autour de ton projet.</h2>
            <div className={styles.actor}>
              <h3>France Volontaires Antilles</h3>
              <p>France Volontaires est la plateforme française du volontariat international d’échange et de solidarité. Pour cette mission, son antenne Antilles est <strong>l’organisme d’envoi</strong> et intervient dans la préparation du départ et les étapes de la mobilité internationale si tu es sélectionné.</p>
            </div>
            <div className={styles.actor}>
              <h3>Le Bon Rebond</h3>
              <p>Nous sommes <strong>en relation directe avec la CARL</strong>, qui recherche un volontaire pour cette mission. Nous prenons le temps de comprendre ton parcours, tes motivations, ton niveau d’anglais et ce que cette expérience pourrait t’apporter. Avec ton accord, nous lui communiquons ton adresse e-mail pour faciliter la prise de contact.</p>
              <p>Notre accompagnement se poursuit dans les démarches : présentation de ton parcours, CV, motivation, préparation des échanges et suivi des réponses. Si tu es sélectionné, <strong>nous restons présents pendant la mission et jusqu’à sa fin</strong> pour faire le point sur cette expérience et préparer la suite. Si cette mission ne correspond finalement pas à ton projet, nous cherchons avec toi une autre piste. La décision finale de sélection ne relève pas du Bon Rebond.</p>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="parcours">
          <div className={styles.wrapNarrow}>
            <p className={styles.eyebrow}>Un parcours simple et humain</p>
            <h2 id="parcours">Comment ça se passe avec nous ?</h2>
            <ol className={styles.steps}>{steps.map(([number, heading, body]) => <li key={number}><span aria-hidden="true">{number}</span><div><h3>{heading}</h3><p>{body}</p></div></li>)}</ol>
          </div>
        </section>

        <section className={`${styles.section} ${styles.finalSection}`} id="rappel" aria-labelledby="rappel-title">
          <div className={styles.wrapNarrow}>
            <p className={styles.eyebrow}>Intéressé(e) ?</p>
            {open ? (
              <>
                <h2 id="rappel-title">Avançons ensemble vers Sainte-Lucie.</h2>
                <p className={styles.finalLead}>Parle-nous de toi et de ce qui t’attire dans cette expérience. Nous reviendrons vers toi, répondrons à tes questions et t’accompagnerons dans les démarches, puis jusqu’à la fin de la mission si tu es sélectionné.</p>
                <RecallForm />
                <p className={styles.transparency}>Le Bon Rebond t’accompagne dans les démarches et peut transmettre ton adresse e-mail à la CARL avec ton accord. La sélection finale relève exclusivement des organismes responsables de la mission.</p>
              </>
            ) : (
              <>
                <h2 id="rappel-title">La date limite de cette mission est passée.</h2>
                <p className={styles.finalLead}>Tu souhaites parler d’un projet de volontariat ou de ta prochaine étape ? Notre équipe peut échanger avec toi.</p>
                <Link href="/contact" className={styles.buttonLight}>Contacter Le Bon Rebond <span aria-hidden="true">↗</span></Link>
              </>
            )}
          </div>
        </section>
      </div>
    </article>
  );
}
