import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/app/Logo";
import QuestionnaireForm from "./questionnaire-form";
import styles from "./questionnaire.module.css";

export const metadata: Metadata = {
  title: "Votre prochaine étape professionnelle | Le Bon Rebond",
  description: "Quelques questions pour préparer une prochaine étape adaptée à votre projet professionnel.",
  robots: { index: false, follow: false },
};

export default function QuestionnairePage() {
  return <div className={styles.page}>
    <header className={styles.header}><Link href="/" aria-label="Le Bon Rebond, accueil"><Logo size={48} priority /></Link><span>Votre projet professionnel</span></header>
    <main className={styles.main}><QuestionnaireForm /></main>
    <footer className={styles.footer}><span>Le Bon Rebond</span><Link href="/legal/confidentialite">Confidentialité</Link><a href="mailto:contact.lebonrebond@gmail.com">Nous contacter</a></footer>
  </div>;
}
