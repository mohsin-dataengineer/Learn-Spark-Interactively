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
          <article key={track.number} className={`track-card ${track.featured ? "featured-card" : ""}`}>
            <div className="track-number">{track.number}</div>
            <h3>{track.title}</h3>
            <p>{track.description}</p>
            <pre><code>{track.code}</code></pre>
            <ul>{track.bullets.map(item => <li key={item}>{item}</li>)}</ul>
          </article>
        ))}
      </div>
    </section>
  );
}
