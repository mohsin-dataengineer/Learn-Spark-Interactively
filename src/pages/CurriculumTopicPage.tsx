import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SectionHeading } from "../components/Layout";
import { curriculumTracks } from "../data/curriculum";

export function CurriculumTopicPage() {
  const { slug } = useParams();
  const topic = curriculumTracks.find(track => track.slug === slug) ?? curriculumTracks[0];
  const [selectedOption, setSelectedOption] = useState(0);

  const nextTopic = useMemo(() => {
    const currentIndex = curriculumTracks.findIndex(track => track.slug === topic.slug);
    return curriculumTracks[(currentIndex + 1) % curriculumTracks.length];
  }, [topic.slug]);

  const selected = topic.interactive.options[selectedOption];

  return (
    <section className="section-block page-section topic-page">
      <Link className="back-link" to="/curriculum">Back to curriculum</Link>
      <SectionHeading eyebrow={`Module ${topic.number}`} title={topic.title}>
        {topic.description}
      </SectionHeading>

      <div className="topic-layout">
        <aside className="topic-sidebar panel">
          <h3>Learning goals</h3>
          <ol>
            {topic.objectives.map(goal => <li key={goal}>{goal}</li>)}
          </ol>
          <div className="topic-code">
            <h3>Starter snippet</h3>
            <pre><code>{topic.code}</code></pre>
          </div>
        </aside>

        <div className="topic-main">
          <div className="deep-dive-grid">
            {topic.deepDive.map((section, index) => (
              <article key={section.title} className="deep-dive-card">
                <span className="track-number">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{section.title}</h3>
                  <p>{section.body}</p>
                  <pre><code>{section.example}</code></pre>
                </div>
              </article>
            ))}
          </div>

          <div className="topic-lab panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">{topic.interactive.label}</p>
                <h2>{topic.interactive.prompt}</h2>
              </div>
            </div>
            <div className="choice-grid">
              {topic.interactive.options.map((option, index) => (
                <button
                  key={option.label}
                  className={selectedOption === index ? "primary" : "secondary"}
                  onClick={() => setSelectedOption(index)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="interactive-result">
              <strong>{selected.result}</strong>
              <p>{selected.explanation}</p>
            </div>
          </div>

          <div className="next-topic">
            <span>Next module</span>
            <Link to={`/curriculum/${nextTopic.slug}`}>{nextTopic.title}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
