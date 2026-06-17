import type { Metadata } from "next";
import { blogArticles } from "@/content/blog-data";
import { BlogList } from "./blog-list";
import "./blog.css";

export const metadata: Metadata = {
  title: "Blog — Le Bon Rebond",
  description:
    "Conseils, témoignages et repères concrets pour s'orienter, se former et reprendre la main sur son parcours professionnel.",
};

export default function BlogPage() {
  return (
    <div className="blog-scope">
      <section className="subhero center" style={{ paddingBottom: 40 }}>
        <div className="blob" style={{ width: 380, height: 380, background: "radial-gradient(circle,rgba(44,142,134,.14),transparent 70%)", top: -120, left: "50%", transform: "translateX(-50%)" }} />
        <div className="wrap">
          <div className="subhero-inner">
            <div className="crumb"><a href="/">Accueil</a> · <b>Le journal</b></div>
            <h1>Le journal du <span className="accent">rebond.</span></h1>
            <p className="lead">Conseils, témoignages et repères concrets pour s&apos;orienter, se former et reprendre la main sur son parcours professionnel.</p>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 40 }}>
        <div className="wrap">
          <BlogList articles={blogArticles} />
        </div>
      </section>
    </div>
  );
}
