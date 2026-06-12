import Link from "next/link";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <h1
        style={{
          fontFamily: "'Newsreader', Georgia, serif",
          fontSize: "clamp(1.9rem, 3vw, 2.3rem)",
          fontWeight: 500,
          color: "#15314C",
          margin: "0 0 10px",
          letterSpacing: "-.02em",
        }}
      >
        Créer votre compte.
      </h1>
      <p style={{ color: "#5d6f7c", fontSize: "1.05rem", margin: "0 0 30px", lineHeight: 1.5 }}>
        Quelques informations, et nous construisons la suite ensemble.
      </p>

      <RegisterForm />

      <p style={{ textAlign: "center", marginTop: 26, color: "#5d6f7c", fontSize: ".98rem" }}>
        Déjà un compte ?{" "}
        <Link href="/login" style={{ color: "#23756e", fontWeight: 700, textDecoration: "none" }}>
          Se connecter
        </Link>
      </p>
    </div>
  );
}
