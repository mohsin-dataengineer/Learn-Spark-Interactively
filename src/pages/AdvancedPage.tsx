import { SectionHeading } from "../components/Layout";
import { advancedModules } from "../data/curriculum";

export function AdvancedPage() {
  return (
    <section className="section-block page-section">
      <SectionHeading eyebrow="Advanced Concepts" title="Modules to add after the first simulators." />
      <div className="concept-grid">
        {advancedModules.map(([title, description, code]) => (
          <article key={title}>
            <h3>{title}</h3>
            <p>{description}</p>
            <code>{code}</code>
          </article>
        ))}
      </div>
    </section>
  );
}
