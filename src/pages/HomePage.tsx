import { Link } from "react-router-dom";

const cards = [
  ["01", "End-to-End Execution Flow", "Click through SparkSession, SparkContext, cluster manager, DAG Scheduler, Task Scheduler, executors, tasks, shuffle, and result collection.", "/execution-flow", true],
  ["02", "Lazy Evaluation Explorer", "Build transformations, trigger actions, and watch the logical plan and DAG update.", "/lazy-evaluation", false],
  ["03", "Interactive Concept Lab", "Simulate partitions, shuffle, joins, caching, skew, and streaming with shared controls.", "/concept-lab", false],
  ["04", "Full Curriculum", "Review the complete path from Spark foundations to performance and scale.", "/curriculum", false],
  ["05", "Advanced Modules", "See planned labs for joins, skew, streaming, MLlib, and Spark UI debugging.", "/advanced", false],
  ["06", "Build Roadmap", "Track how the learning lab should grow across future phases.", "/roadmap", false],
] as const;

export function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="kicker">From first DataFrame to production-scale tuning</p>
          <h2>Learn Spark by watching data move.</h2>
          <p>
            A scalable React learning lab for Apache Spark fundamentals,
            execution internals, SQL, streaming, machine learning, and
            performance. Pick a module and learn at your pace.
          </p>
          <div className="hero-actions">
            <Link className="button-link primary-link" data-tour="start-execution" to="/execution-flow">Start with execution flow</Link>
            <Link className="button-link ghost-link" to="/lazy-evaluation">Open live explorer</Link>
          </div>
        </div>
        <div className="metric-strip" aria-label="Current site summary">
          <div><span>6</span><small>learning pages</small></div>
          <div><span>9</span><small>execution steps</small></div>
          <div><span>6</span><small>concept simulations</small></div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <p className="eyebrow">Learning Paths</p>
          <h2>Choose the page you want to study.</h2>
        </div>
        <div className="track-grid" data-tour="learning-cards">
          {cards.map(([number, title, description, to, featured]) => (
            <Link key={to} className={`track-card page-card ${featured ? "featured-card" : ""}`} to={to}>
              <div className="track-number">{number}</div>
              <h3>{title}</h3>
              <p>{description}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
