import { Link } from "react-router-dom";
import { SectionHeading } from "../components/Layout";
import { curriculumTracks } from "../data/curriculum";

export function CurriculumPage() {
  return (
    <section className="section-block page-section">
      <SectionHeading eyebrow="Curriculum" title="Fundamentals first, then the internals that make Spark fast.">
        Each module is designed around a small dataset, a short Spark snippet,
        and an interactive visualization target.
      </SectionHeading>
      <div className="track-grid">
        {curriculumTracks.map(track => (
          <Link
            key={track.number}
            to={`/curriculum/${track.slug}`}
            className={`track-card page-card curriculum-card ${track.featured ? "featured-card" : ""}`}
          >
            <div className="track-number">{track.number}</div>
            <h3>{track.title}</h3>
            <p>{track.description}</p>
            <pre><code>{track.code}</code></pre>
            <ul>{track.bullets.map(item => <li key={item}>{item}</li>)}</ul>
            <span className="card-link-label">Open lesson</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
