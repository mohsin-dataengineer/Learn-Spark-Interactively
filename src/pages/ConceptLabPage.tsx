import { useState } from "react";
import { SectionHeading } from "../components/Layout";

type SimKey = "partitions" | "shuffle" | "joins" | "cache" | "skew" | "streaming";
type Values = Record<string, number | string>;
type Control = { key: string; label: string; type: "range"; min: number; max: number } | { key: string; label: string; type: "select"; options: string[] };

const initialValues: Record<SimKey, Values> = {
  partitions: { partitions: 4, rows: 16 },
  shuffle: { partitions: 4, keys: 3 },
  joins: { strategy: "broadcast", factRows: 14, dimRows: 4 },
  cache: { cached: "no", runs: 2 },
  skew: { hotKey: 65, salt: "off" },
  streaming: { watermark: 10, lateEvents: 3 },
};

const tabs: [SimKey, string, string][] = [
  ["partitions", "Partitions", "Rows split across tasks"],
  ["shuffle", "Shuffle", "Records move by key"],
  ["joins", "Joins", "Strategy and movement"],
  ["cache", "Caching", "Reuse vs recompute"],
  ["skew", "Skew", "Hot keys slow stages"],
  ["streaming", "Streaming", "Watermarks and late data"],
];

function makeBuckets(rowCount: number, bucketCount: number, bucketFn: (index: number) => number) {
  const buckets = Array.from({ length: bucketCount }, () => [] as number[]);
  for (let index = 0; index < rowCount; index += 1) buckets[bucketFn(index)].push(index + 1);
  return buckets;
}

function Buckets({ buckets, label, keyed = false }: { buckets: number[][]; label: string; keyed?: boolean }) {
  return <div className="bucket-row">{buckets.map((bucket, index) => <div className="bucket" key={index}><strong>{label} {index + 1}</strong><div className="row-dots">{bucket.map(row => <span key={row} className={keyed ? `key-${row % 5}` : ""}>{row}</span>)}</div></div>)}</div>;
}

function renderSimulation(active: SimKey, values: Values) {
  if (active === "partitions") {
    const partitions = Number(values.partitions);
    const rows = Number(values.rows);
    return {
      level: "Fundamental", title: "Partitions Explorer", badge: "Narrow work",
      controls: [{ key: "partitions", label: "Partitions", type: "range", min: 2, max: 8 }, { key: "rows", label: "Rows", type: "range", min: 8, max: 28 }] as Control[],
      code: `orders = spark.read.parquet("orders")\n\norders.repartition(${partitions})\n  .filter(col("amount") >= 50)\n  .count()`,
      visual: <Buckets buckets={makeBuckets(rows, partitions, index => index % partitions)} label="Partition" />,
      explanation: `Spark splits ${rows} rows into ${partitions} partitions. A narrow transformation such as filter can run independently inside each partition without moving records across the network.`,
      result: `${partitions} tasks can process the partitions in parallel.`,
    };
  }
  if (active === "shuffle") {
    const partitions = Number(values.partitions);
    const keys = Number(values.keys);
    return {
      level: "Core Internal", title: "Shuffle Visualizer", badge: "Wide dependency",
      controls: [{ key: "partitions", label: "Output partitions", type: "range", min: 2, max: 6 }, { key: "keys", label: "Group keys", type: "range", min: 2, max: 5 }] as Control[],
      code: `orders\n  .groupBy("city")\n  .agg(sum("amount").alias("revenue"))\n  .show()`,
      visual: <><Buckets buckets={makeBuckets(18, partitions, index => index % partitions)} label="Before" /><div className="sim-arrow">Shuffle by key</div><Buckets buckets={makeBuckets(18, partitions, index => index % keys % partitions)} label="After" keyed /></>,
      explanation: "groupBy is a wide transformation. Spark must move rows with the same key to the same output partition, which creates a shuffle boundary and usually a new stage.",
      result: `${keys} keys are redistributed into ${partitions} output partitions.`,
    };
  }
  if (active === "joins") {
    const strategy = String(values.strategy);
    const factRows = Number(values.factRows);
    const dimRows = Number(values.dimRows);
    const movement = strategy === "broadcast" ? dimRows : factRows + dimRows;
    return {
      level: "Performance", title: "Join Strategy Lab", badge: "Join planning",
      controls: [{ key: "strategy", label: "Strategy", type: "select", options: ["broadcast", "sort-merge", "shuffle-hash"] }, { key: "factRows", label: "Fact rows", type: "range", min: 8, max: 30 }, { key: "dimRows", label: "Dimension rows", type: "range", min: 2, max: 10 }] as Control[],
      code: strategy === "broadcast" ? `orders.join(broadcast(products), "product_id")` : `orders.join(products, "product_id")\n\n-- Spark may shuffle both sides before joining`,
      visual: <div className="join-visual"><div><strong>Fact table</strong><div className="row-dots">{Array.from({ length: factRows }, (_, i) => <span key={i}>{i + 1}</span>)}</div></div><div className="sim-arrow">{strategy === "broadcast" ? "Broadcast small dimension table to every executor" : "Shuffle both tables by join key"}</div><div><strong>Dimension table</strong><div className="row-dots">{Array.from({ length: dimRows }, (_, i) => <span className="dim" key={i}>{i + 1}</span>)}</div></div></div>,
      explanation: strategy === "broadcast" ? "Broadcast joins copy the small table to each executor, avoiding a large shuffle of the fact table." : "Large joins shuffle both sides by key, then join matching rows inside partitions.",
      result: `${movement} visual row units move across the cluster in this scenario.`,
    };
  }
  if (active === "cache") {
    const cached = values.cached === "yes";
    const runs = Number(values.runs);
    const recomputes = cached ? 1 : runs;
    return {
      level: "Optimization", title: "Caching and Reuse", badge: "Storage memory",
      controls: [{ key: "cached", label: "Cache DataFrame", type: "select", options: ["no", "yes"] }, { key: "runs", label: "Repeated actions", type: "range", min: 1, max: 5 }] as Control[],
      code: `clean = raw.filter("amount >= 50").select("city", "amount")\n${cached ? "clean.cache()\n" : ""}\nclean.count()\nclean.groupBy("city").sum("amount").show()`,
      visual: <div className="cache-flow"><div className="cache-step">Read</div><div className="cache-step">Transform</div><div className={`cache-step ${cached ? "stored" : ""}`}>{cached ? "Cache" : "No cache"}</div>{Array.from({ length: runs }, (_, i) => <div className="cache-step action" key={i}>Action {i + 1}</div>)}</div>,
      explanation: cached ? "Spark materializes the DataFrame after the first action. Later actions can reuse cached partitions." : "Without caching, every action walks back through the lineage and recomputes upstream transformations.",
      result: `${recomputes} upstream recompute pass${recomputes === 1 ? "" : "es"} for ${runs} action${runs === 1 ? "" : "s"}.`,
    };
  }
  if (active === "skew") {
    const hotKey = Number(values.hotKey);
    const loads = values.salt === "on" ? [30, 28, 24, 18] : [hotKey, Math.round((100 - hotKey) / 3), Math.round((100 - hotKey) / 3), 100 - hotKey - Math.round((100 - hotKey) / 3) * 2];
    return {
      level: "Advanced", title: "Skew Clinic", badge: "Hot partition",
      controls: [{ key: "hotKey", label: "Hot key percent", type: "range", min: 25, max: 90 }, { key: "salt", label: "Salting", type: "select", options: ["off", "on"] }] as Control[],
      code: values.salt === "on" ? `salted = df.withColumn("salt", pmod(rand() * 8, 8))\nsalted.groupBy("customer_id", "salt").count()` : `df.groupBy("customer_id").count()\n\n-- one key owns most records`,
      visual: <div className="load-bars">{loads.map((load, i) => <div className="load-row" key={i}><span>Task {i + 1}</span><div><i style={{ width: `${load}%` }}></i></div><strong>{load}%</strong></div>)}</div>,
      explanation: values.salt === "on" ? "Salting splits the hot key into smaller artificial keys, spreading work across more tasks." : "One popular key sends too much data to one reducer, so one overloaded task controls stage runtime.",
      result: `Largest task handles ${Math.max(...loads)}% of the grouped data.`,
    };
  }
  const watermark = Number(values.watermark);
  const lateEvents = Number(values.lateEvents);
  return {
    level: "Advanced", title: "Structured Streaming Timeline", badge: "Stateful stream",
    controls: [{ key: "watermark", label: "Watermark minutes", type: "range", min: 2, max: 20 }, { key: "lateEvents", label: "Late events", type: "range", min: 0, max: 8 }] as Control[],
    code: `events\n  .withWatermark("event_time", "${watermark} minutes")\n  .groupBy(window("event_time", "5 minutes"), col("user_id"))\n  .count()`,
    visual: <div className="stream-timeline"><div className="timeline-line"></div><div className="watermark" style={{ left: `${Math.min(82, 18 + watermark * 3)}%` }}>watermark</div>{Array.from({ length: 10 }, (_, i) => <span key={i} className={i < lateEvents ? "late" : ""} style={{ left: `${8 + i * 8}%` }}>{i < lateEvents ? "late" : "on time"}</span>)}</div>,
    explanation: `Structured Streaming tracks event time and keeps state for windows that may still receive late data. A ${watermark}-minute watermark decides when old state can be closed.`,
    result: `${lateEvents} late event${lateEvents === 1 ? "" : "s"} tested against the watermark.`,
  };
}

export function ConceptLabPage() {
  const [active, setActive] = useState<SimKey>("partitions");
  const [valuesBySim, setValuesBySim] = useState(initialValues);
  const values = valuesBySim[active];
  const sim = renderSimulation(active, values);
  const update = (key: string, value: number | string) => setValuesBySim(current => ({ ...current, [active]: { ...current[active], [key]: value } }));

  return (
    <section className="section-block page-section">
      <SectionHeading eyebrow="Interactive Concept Lab" title="One simulation pattern for every Spark concept.">
        Select a concept, adjust controls, and watch code, execution visuals, and explanations update together.
      </SectionHeading>
      <section className="simulation-shell">
        <aside className="simulation-sidebar" data-tour="sim-tabs" aria-label="Spark concept selector">{tabs.map(([key, label, description]) => <button key={key} className={`sim-tab ${active === key ? "active" : ""}`} onClick={() => setActive(key)}><span>{label}</span><small>{description}</small></button>)}</aside>
        <div className="simulation-main">
          <div className="simulation-header"><div><p className="eyebrow">{sim.level}</p><h3>{sim.title}</h3></div><span className="badge">{sim.badge}</span></div>
          <div className="simulation-grid">
            <div className="sim-controls panel-flat" data-tour="sim-controls"><h4>Controls</h4>{sim.controls.map(control => <label className="sim-control" key={control.key}><span>{control.label}{control.type === "range" ? <>: <strong>{values[control.key]}</strong></> : null}</span>{control.type === "select" ? <select value={String(values[control.key])} onChange={event => update(control.key, event.target.value)}>{control.options.map(option => <option key={option} value={option}>{option}</option>)}</select> : <input type="range" min={control.min} max={control.max} value={Number(values[control.key])} onChange={event => update(control.key, Number(event.target.value))} />}</label>)}</div>
            <div className="sim-visual panel-flat" data-tour="sim-visual"><h4>Visual Execution</h4><div className="partition-visual">{sim.visual}</div></div>
            <div className="sim-code panel-flat"><h4>Spark Example</h4><pre><code>{sim.code}</code></pre></div>
            <div className="sim-explain panel-flat"><h4>What Spark Is Doing</h4><p>{sim.explanation}</p><div className="sim-result">{sim.result}</div></div>
          </div>
        </div>
      </section>
    </section>
  );
}
