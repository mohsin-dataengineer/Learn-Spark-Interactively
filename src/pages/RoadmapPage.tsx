import { SectionHeading } from "../components/Layout";

export function RoadmapPage() {
  return (
    <section className="section-block page-section roadmap">
      <SectionHeading eyebrow="Build Roadmap" title="How this site should grow." />
      <div className="timeline">
        <div><strong>Phase 1</strong><span>Static curriculum, lazy evaluation, DAG, and shuffle basics.</span></div>
        <div><strong>Phase 2</strong><span>Partition simulator, join strategy lab, caching lab, and Spark SQL explain plans.</span></div>
        <div><strong>Phase 3</strong><span>Structured Streaming, MLlib, AQE, skew tuning, and Spark UI debugging scenarios.</span></div>
      </div>
    </section>
  );
}
