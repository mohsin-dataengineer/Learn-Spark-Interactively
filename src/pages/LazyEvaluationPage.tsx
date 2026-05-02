import { useMemo, useState } from "react";
import { SectionHeading } from "../components/Layout";

type Row = Record<string, string | number>;
type Operation = {
  id: string;
  label: string;
  code: string;
  kind: "narrow" | "shuffle";
  apply: (rows: Row[]) => Row[];
};

const sourceRows: Row[] = [
  { id: 1, city: "Austin", category: "Books", amount: 42 },
  { id: 2, city: "Boston", category: "Games", amount: 88 },
  { id: 3, city: "Austin", category: "Games", amount: 64 },
  { id: 4, city: "Denver", category: "Books", amount: 25 },
  { id: 5, city: "Boston", category: "Music", amount: 73 },
  { id: 6, city: "Denver", category: "Games", amount: 51 },
  { id: 7, city: "Austin", category: "Music", amount: 19 },
  { id: 8, city: "Boston", category: "Books", amount: 57 },
];

const amountOf = (row: Row) => Number(row.amount ?? row.totalAmount ?? 0);

const operations: Operation[] = [
  { id: "filterHighValue", label: "Filter amount >= 50", code: '.filter(col("amount") >= 50)', kind: "narrow", apply: rows => rows.filter(row => amountOf(row) >= 50) },
  { id: "selectCityAmount", label: "Select city, amount", code: '.select("city", "amount")', kind: "narrow", apply: rows => rows.map(row => ({ city: row.city, amount: amountOf(row) })) },
  { id: "withTax", label: "Add tax column", code: '.withColumn("tax", round(col("amount") * 0.0825, 2))', kind: "narrow", apply: rows => rows.map(row => ({ ...row, tax: Number((amountOf(row) * 0.0825).toFixed(2)) })) },
  {
    id: "groupByCity",
    label: "Group by city",
    code: '.groupBy("city").sum("amount")',
    kind: "shuffle",
    apply: rows => Object.entries(rows.reduce<Record<string, number>>((acc, row) => {
      const city = String(row.city ?? "unknown");
      acc[city] = (acc[city] ?? 0) + amountOf(row);
      return acc;
    }, {})).map(([city, totalAmount]) => ({ city, totalAmount })),
  },
];

function DataTable({ rows }: { rows: Row[] }) {
  if (!rows.length) return <table><tbody><tr><td>No rows</td></tr></tbody></table>;
  const columns = Object.keys(rows[0]);
  return (
    <table>
      <thead><tr>{columns.map(column => <th key={column}>{column}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={index}>{columns.map(column => <td key={column}>{row[column]}</td>)}</tr>)}</tbody>
    </table>
  );
}

export function LazyEvaluationPage() {
  const [selectedOps, setSelectedOps] = useState<Operation[]>([]);
  const [lastAction, setLastAction] = useState<"show" | "count" | null>(null);
  const [hasExecuted, setHasExecuted] = useState(false);

  const resultRows = useMemo(() => selectedOps.reduce((rows, op) => op.apply(rows), sourceRows), [selectedOps]);
  const hasShuffle = selectedOps.some(op => op.kind === "shuffle");
  const stageCount = hasExecuted ? (hasShuffle ? 2 : 1) : 0;
  const code = ["orders", ...selectedOps.map(op => `  ${op.code}`), ...(lastAction ? [`  .${lastAction}()`] : [])].join("\n");
  const dagNodes = [
    ["Read", "orders dataset", ""],
    ...(selectedOps.some(op => op.kind === "narrow") ? [["Narrow transforms", `${selectedOps.filter(op => op.kind === "narrow").length} operation(s), same partition flow`, ""]] : []),
    ...(hasShuffle ? [["Shuffle", "move rows by city key", "shuffle"], ["Aggregate", "sum amount per city", ""]] : []),
    [lastAction ? `${lastAction}()` : "Action", hasExecuted ? "job executed" : "not run yet", "action"],
  ];

  const runAction = (action: "show" | "count") => {
    setLastAction(action);
    setHasExecuted(true);
  };

  return (
    <>
      <section className="section-block page-section">
        <SectionHeading eyebrow="Live Module" title="Lazy Evaluation Explorer">
          Add transformations, run an action, and watch Spark build and execute the queued plan.
        </SectionHeading>
      </section>

      <section className="workspace">
        <aside className="panel lesson-panel">
          <p className="eyebrow">Lesson</p>
          <h2>Transformations are lazy</h2>
          <ol>
            <li>Add transformations. Notice that the output does not change.</li>
            <li>Run an action. Spark executes the accumulated plan.</li>
            <li>Add <code>groupBy</code>. The DAG splits into two stages because a shuffle is required.</li>
          </ol>
          <div className="callout">Transformations are lazy. Actions are eager.</div>
          <div className="mini-metrics">
            <div><span>{selectedOps.length}</span><small>queued</small></div>
            <div><span>{stageCount}</span><small>stages</small></div>
            <div><span>{hasExecuted ? resultRows.length : sourceRows.length}</span><small>rows</small></div>
          </div>
        </aside>

        <section className="panel builder-panel">
          <div className="panel-heading">
            <h2>Query Builder</h2>
            <button className="secondary" onClick={() => { setSelectedOps([]); setLastAction(null); setHasExecuted(false); }}>Reset</button>
          </div>
          <div className="code-window" aria-label="Spark code preview">
            <div className="window-dots" aria-hidden="true"><span></span><span></span><span></span></div>
            <pre><code>{code}</code></pre>
          </div>
          <div className="controls" aria-label="Transformation controls">
            {operations.map(op => <button key={op.id} onClick={() => { setSelectedOps([...selectedOps, op]); setHasExecuted(false); }}>{op.label}</button>)}
          </div>
          <div className="action-row">
            <button className="primary" onClick={() => runAction("show")}>Run show()</button>
            <button className="primary" onClick={() => runAction("count")}>Run count()</button>
          </div>
          <div className={`status ${selectedOps.length && !hasExecuted ? "pending" : hasExecuted ? "executed" : ""}`}>
            {!selectedOps.length ? "Waiting for transformations. No Spark job has run yet." : hasExecuted ? `Action ${lastAction}() triggered a Spark job and executed the queued plan.` : `${selectedOps.length} transformation(s) queued. The source data is unchanged until an action runs.`}
          </div>
        </section>
      </section>

      <section className="panel dag-panel">
        <div className="panel-heading"><h2>Logical Plan and DAG</h2><span className={`badge ${hasShuffle ? "shuffle" : ""}`}>{hasShuffle ? "Shuffle boundary" : "No shuffle"}</span></div>
        <div className="dag-grid">
          <div><h3>Queued Plan</h3><div className="plan-list">{selectedOps.length ? selectedOps.map((op, index) => <div className="plan-item" key={`${op.id}-${index}`}>{index + 1}. {op.label}</div>) : <div className="empty-state">No transformations queued.</div>}</div></div>
          <div><h3>Execution Graph</h3><div className="dag-canvas" aria-label="Spark execution graph">{dagNodes.map(([title, detail, className]) => <div key={`${title}-${detail}`} className={`dag-node ${className}`}><strong>{title}</strong><small>{detail}</small></div>)}</div></div>
        </div>
      </section>

      <section className="results-grid">
        <section className="panel"><h2>Source Data</h2><div className="table-wrap"><DataTable rows={sourceRows} /></div></section>
        <section className="panel"><h2>Output After Action</h2>{!hasExecuted ? <div className="empty-state">Add transformations, then run an action.</div> : lastAction === "count" ? <div className="empty-state">count() returned {resultRows.length}</div> : <div className="table-wrap"><DataTable rows={resultRows} /></div>}</section>
      </section>
    </>
  );
}
