"use client";

import { useState } from "react";
import Link from "next/link";
import type { BlogArticle } from "@/content/blog-data";

const CATEGORIES = ["Tout", "Reconversion", "Bilan de compétences", "Orientation", "Formation", "Conseils carrière"];

function Cover({ slug, alt, className }: { slug: string; alt: string; className: string }) {
  return (
    <div className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/blog/${slug}.webp`} alt={alt} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
    </div>
  );
}

function PostCard({ a }: { a: BlogArticle }) {
  return (
    <article className="post-card">
      <Cover slug={a.slug} alt={a.coverAlt} className="pc-photo" />
      <div className="pc-body">
        <div className="post-meta">
          <span className="cat">{a.category}</span>
          <span className="dot" />
          <span>{a.readingMin}</span>
          <span className="dot" />
          <span>{a.date}</span>
        </div>
        <h3>{a.title}</h3>
        <p>{a.excerpt}</p>
        <Link className="txtlink" href={`/blog/${a.slug}`}>
          Lire l&apos;article <span className="arrow">→</span>
        </Link>
      </div>
    </article>
  );
}

export function BlogList({ articles }: { articles: BlogArticle[] }) {
  const [active, setActive] = useState("Tout");
  const featured = articles.find((a) => a.featured);
  const showFeatured = active === "Tout" && featured;

  const grid = articles.filter((a) => {
    if (active === "Tout") return !a.featured;
    return a.category === active;
  });

  return (
    <>
      <div className="blog-filters" role="group" aria-label="Catégories">
        {CATEGORIES.map((c) => (
          <button key={c} type="button" className={`chip${active === c ? " on" : ""}`} onClick={() => setActive(c)}>
            {c}
          </button>
        ))}
      </div>

      {showFeatured && featured && (
        <article className="feat-post">
          <Cover slug={featured.slug} alt={featured.coverAlt} className="fp-photo" />
          <div className="fp-body">
            <div className="post-meta">
              <span className="cat">{featured.category}</span>
              <span className="dot" />
              <span>Lecture {featured.readingMin}</span>
            </div>
            <h2>{featured.title}</h2>
            <p>{featured.excerpt}</p>
            <Link className="txtlink" href={`/blog/${featured.slug}`}>
              Lire l&apos;article <span className="arrow">→</span>
            </Link>
            <div className="post-author">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <div className="av"><img src="/brand/logo-mark-le-bon-rebond.png" alt="Le Bon Rebond" style={{ width: "100%", height: "100%", objectFit: "contain", background: "#fff", padding: 7 }} /></div>
              <div>
                <div className="who">L&apos;équipe Le Bon Rebond</div>
                <div className="role">Publié le {featured.date}</div>
              </div>
            </div>
          </div>
        </article>
      )}

      {grid.length > 0 ? (
        <div className="posts-grid">
          {grid.map((a) => <PostCard key={a.slug} a={a} />)}
        </div>
      ) : (
        <p style={{ color: "var(--muted)", padding: "20px 0 60px" }}>Aucun article dans cette catégorie pour le moment.</p>
      )}
    </>
  );
}
