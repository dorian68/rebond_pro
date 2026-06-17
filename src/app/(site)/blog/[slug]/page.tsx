import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blogArticles, blogBySlug } from "@/content/blog-data";
import "../blog.css";

export function generateStaticParams() {
  return blogArticles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = blogBySlug(slug);
  if (!a) return { title: "Article introuvable — Le Bon Rebond" };
  return {
    title: a.metaTitle,
    description: a.metaDescription,
    openGraph: { title: a.metaTitle, description: a.metaDescription, type: "article" },
  };
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = blogBySlug(slug);
  if (!a) notFound();

  return (
    <div className="blog-scope">
      <article className="article">
        <div className="article-wrap article-head">
          <div className="crumb">
            <Link href="/">Accueil</Link> · <Link href="/blog">Le journal</Link> · <b>{a.category}</b>
          </div>
          <div className="post-meta center">
            <span className="cat">{a.category}</span>
            <span className="dot" />
            <span>{a.readingMin}</span>
            <span className="dot" />
            <span>{a.date}</span>
          </div>
          <h1 className="article-title">{a.title}</h1>
        </div>

        <div className="article-cover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="cov"><img src={`/blog/${a.slug}.webp`} alt={a.coverAlt} decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></div>
        </div>

        <div className="article-wrap">
          <div className="article-body" dangerouslySetInnerHTML={{ __html: a.bodyHtml }} />
          <div className="article-cta" dangerouslySetInnerHTML={{ __html: a.ctaHtml }} />

          <div className="article-foot">
            <div className="author">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <div className="av"><img src="/brand/logo-mark-le-bon-rebond.png" alt="Le Bon Rebond" style={{ width: "100%", height: "100%", objectFit: "contain", background: "#fff", padding: 7 }} /></div>
              <div>
                <div className="who">L&apos;équipe Le Bon Rebond</div>
                <div className="role">Publié le {a.date}</div>
              </div>
            </div>
            <Link className="txtlink" href="/blog">← Tous les articles</Link>
          </div>

          {a.related.length > 0 && (
            <div className="related">
              <h4 className="related-h">À lire aussi</h4>
              <div className="related-grid">
                {a.related.map((r) => (
                  <Link key={r.slug} className="rel-card" href={`/blog/${r.slug}`}>
                    <span className="rel-cat">{r.category}</span>
                    <span className="rel-t">{r.title}</span>
                    <span className="rel-link">Lire →</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
