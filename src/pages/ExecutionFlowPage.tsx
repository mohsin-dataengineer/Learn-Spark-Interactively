import { useRef, useState } from "react";
import { SectionHeading } from "../components/Layout";

type FlowKey = "session" | "cluster" | "executors" | "logical" | "dag" | "tasks" | "execute" | "shuffle" | "result";

const flowSteps: Record<FlowKey, { category: string; title: string; badge: string; code: string; explanation: string; checkpoint: string; tip: string; visual: FlowKey }> = {
  session: { category: "Initialization", title: "SparkSession creates SparkContext", badge: "Driver", code: `spark = SparkSession.builder\n  .appName("RevenueByCity")\n  .getOrCreate()\n\nsc = spark.sparkContext`, explanation: "The driver program starts first. SparkSession is the high-level entry point, and SparkContext is the connection between the driver and the Spark cluster.", checkpoint: "At this moment, no user data has been processed. Spark is preparing the application runtime.", tip: "Think of the driver as the coordinator that owns your code, query plan, and scheduling decisions.", visual: "session" },
  cluster: { category: "Resource Negotiation", title: "Driver asks the cluster manager for resources", badge: "YARN / Kubernetes / Standalone", code: `Driver -> Cluster Manager:\n  application name\n  executor count\n  executor memory\n  executor cores`, explanation: "The cluster manager decides where executor processes can run. It allocates CPU and memory containers or pods.", checkpoint: "Spark can run on different managers, but the scheduling model stays similar.", tip: "Cluster manager handles resources. Spark handles jobs, stages, tasks, and data processing.", visual: "cluster" },
  executors: { category: "Runtime Setup", title: "Executors launch and register with the driver", badge: "Executors", code: `Executor 1 -> Driver: registered\nExecutor 2 -> Driver: registered\nExecutor 3 -> Driver: registered`, explanation: "Executors are long-running worker processes. They store cached data, run tasks, write shuffle files, and report status.", checkpoint: "A Spark application usually has one driver and many executors.", tip: "More cores means more concurrent tasks, but not always faster jobs.", visual: "executors" },
  logical: { category: "Lazy Planning", title: "Transformations build a logical plan", badge: "No job yet", code: `query = orders\n  .filter(col("amount") >= 50)\n  .groupBy("city")\n  .sum("amount")\n\n// no action has run yet`, explanation: "Transformations are lazy. Spark records operations as a plan and waits for an action.", checkpoint: "If students only define transformations, the cluster remains idle for that query.", tip: "Actions include count(), show(), collect(), write(), take(), and foreach().", visual: "logical" },
  dag: { category: "DAG Planning", title: "Action triggers DAG Scheduler", badge: "Stages", code: `query.show()\n\nDAGScheduler:\n  split plan at shuffle boundaries\n  create Stage 0 and Stage 1`, explanation: "When an action runs, Spark converts lineage into a DAG. Wide dependencies split the DAG into stages.", checkpoint: "A stage is a group of tasks that can run without waiting for a shuffle.", tip: "Narrow transformations can be pipelined together inside the same stage.", visual: "dag" },
  tasks: { category: "Task Scheduling", title: "Task Scheduler creates one task per partition", badge: "TaskSet", code: `Stage 0:\n  partition 0 -> task 0\n  partition 1 -> task 1\n  partition 2 -> task 2\n  partition 3 -> task 3`, explanation: "For each stage, Spark creates tasks. A task is the smallest unit of execution and usually processes one partition.", checkpoint: "If a stage has 200 partitions, Spark schedules about 200 tasks.", tip: "Task locality matters: Spark tries to run tasks near the data when possible.", visual: "tasks" },
  execute: { category: "Distributed Work", title: "Executors run tasks against partitions", badge: "Parallelism", code: `Executor task:\n  read partition\n  apply filter\n  compute partial aggregate\n  write shuffle output`, explanation: "Executors deserialize the task, read assigned partitions, apply the stage pipeline, and report metrics.", checkpoint: "This is where CPU, memory, disk, and network costs show up in the Spark UI.", tip: "Slow tasks can reveal skew, insufficient memory, bad file layout, or overloaded nodes.", visual: "execute" },
  shuffle: { category: "Data Exchange", title: "Shuffle moves records to new partitions by key", badge: "Network", code: `groupBy("city")\n\nMap side:\n  write shuffle files\nReduce side:\n  fetch matching keys\n  aggregate city totals`, explanation: "Shuffle writes intermediate data from one stage and reads it in another. Rows with the same key move to the same reduce partition.", checkpoint: "Shuffles are often the most expensive part of Spark jobs.", tip: "Common shuffle operations: groupBy, distinct, repartition, orderBy, and most large joins.", visual: "shuffle" },
  result: { category: "Completion", title: "Final stage returns or writes the action result", badge: "Job done", code: `query.show()\n\nDriver receives:\n  city | sum(amount)\n  Austin | 106\n  Boston | 218`, explanation: "After the final stage finishes, Spark returns the action result to the driver or commits output files to storage.", checkpoint: "The job is complete when all required stages finish successfully.", tip: "For large outputs, prefer write() over collect() so data stays distributed.", visual: "result" },
};

const flowOrder: [FlowKey, string, string][] = [
  ["session", "SparkSession", "Driver starts SparkContext"],
  ["cluster", "Cluster Manager", "Resources requested"],
  ["executors", "Executors", "Processes launched"],
  ["logical", "Logical Plan", "Transformations recorded"],
  ["dag", "DAG Scheduler", "Stages created"],
  ["tasks", "Task Scheduler", "Tasks assigned"],
  ["execute", "Executor Work", "Tasks process partitions"],
  ["shuffle", "Shuffle", "Data moves by key"],
  ["result", "Result", "Action returns data"],
];
const overview = [
  ["session", 1, "driver-overview", "Driver Program", ["spark = SparkSession.builder...", "df.filter(...)", "df.groupBy(...)", "df.count()"], "Action creates the job"],
  ["session", 2, "context-overview", "SparkContext", [], "Application connection to the cluster"],
  ["cluster", 3, "manager-overview", "Cluster Manager", [], "Allocates resources and starts executors"],
  ["dag", 4, "scheduler-overview", "DAG Scheduler", [], "Builds the operator DAG and splits stages"],
  ["tasks", 5, "task-overview", "Task Scheduler", [], "Submits task sets when stages are ready"],
  ["executors", 6, "worker worker-one", "Worker Node", ["Executor"], "Task Task"],
  ["execute", 7, "worker worker-two", "Worker Node", ["Executor"], "Task Task"],
  ["shuffle", 8, "worker worker-three", "Worker Node", ["Executor"], "Shuffle files + tasks"],
] as const;

function FlowVisual({ type }: { type: FlowKey }) {
  if (type === "tasks") return <div className="task-grid">{Array.from({ length: 8 }, (_, i) => <div className="task-card" key={i}>Task {i}<small>partition {i}</small></div>)}</div>;
  if (type === "executors" || type === "execute") return <div className="executor-grid">{[1, 2, 3].map(id => <div className="executor-card active" key={id}>Executor {id}{type === "execute" ? <div className="mini-task-row"><i></i><i></i><i></i></div> : <small>registered</small>}</div>)}</div>;
  if (type === "dag") return <div className="stage-line"><div className="stage-card active">Stage 0<small>read + filter + partial aggregate</small></div><div className="cluster-link shuffle-link">shuffle boundary</div><div className="stage-card active">Stage 1<small>final aggregate + result</small></div></div>;
  if (type === "shuffle") return <div className="shuffle-visual"><div className="bucket"><strong>Map Stage</strong><div className="row-dots"><span className="key-1">A</span><span className="key-2">B</span><span className="key-1">A</span><span className="key-3">C</span></div></div><div className="cluster-link shuffle-link">network fetch</div><div className="bucket"><strong>Reduce Stage</strong><div className="row-dots"><span className="key-1">A</span><span className="key-1">A</span><span className="key-2">B</span><span className="key-3">C</span></div></div></div>;
  if (type === "logical") return <div className="plan-stack"><div>Read orders</div><div>Filter amount &gt;= 50</div><div>Group by city</div><div>Sum amount</div><div className="inactive-plan">Waiting for action</div></div>;
  if (type === "result") return <><div className="result-card active">Final Output<small>returned to driver or written to storage</small></div><div className="cluster-link">commits</div><div className="driver-card">Storage / Driver<small>action complete</small></div></>;
  return <><div className="driver-card active">Driver<br /><small>{type === "cluster" ? "resource request" : "SparkSession + SparkContext"}</small></div><div className="cluster-link">{type === "cluster" ? "asks" : "initializes"}</div><div className={`${type === "cluster" ? "manager-card" : "driver-card"} active`}>{type === "cluster" ? "Cluster Manager" : "Application"}<br /><small>{type === "cluster" ? "allocates CPU + memory" : "user code loaded"}</small></div></>;
}

export function ExecutionFlowPage() {
  const [active, setActive] = useState<FlowKey>("session");
  const [visibleStep, setVisibleStep] = useState(1);
  const detailRef = useRef<HTMLDivElement>(null);
  const step = flowSteps[active];
  const select = (key: FlowKey) => { setActive(key); detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };

  return (
    <section className="section-block page-section">
      <SectionHeading eyebrow="End-to-End Execution" title="Click through a Spark job from initialization to completion.">
        Follow SparkSession creation, cluster resource negotiation, DAG planning, stage boundaries, task scheduling, executor work, shuffle exchange, and result collection.
      </SectionHeading>
      <section className="flow-shell">
        <div className="job-overview" aria-label="Clickable Spark job execution overview">
          <div className="overview-title"><p className="eyebrow">Clickable Architecture Map</p><h3>Internals of Spark Job Execution</h3></div>
          <div className="overview-controls"><button className="primary" disabled={visibleStep === 8} onClick={() => setVisibleStep(Math.min(8, visibleStep + 1))}>Reveal next step</button><button className="secondary" onClick={() => setVisibleStep(8)}>Reveal all</button><button className="secondary" onClick={() => { setVisibleStep(1); setActive("session"); }}>Reset</button><span>Step {visibleStep} of 8</span></div>
          {overview.map(([key, reveal, className, title, codes, small]) => <button key={`${key}-${reveal}`} disabled={reveal > visibleStep} className={`overview-card ${className} ${reveal > visibleStep ? "is-hidden" : ""} ${key === active ? "active" : ""}`} onClick={() => select(key)}><strong>{title}</strong>{codes.map(code => className.includes("worker") ? <span key={code}>{code}</span> : <code key={code} className={code.includes("count") ? "action-code" : ""}>{code}</code>)}<small>{small}</small>{className.includes("scheduler") ? <div className="overview-mini-dag"><span>RDD 1</span><span>RDD 2</span><span>Shuffle</span><span>Stage 1</span></div> : null}{className.includes("task-overview") ? <div className="overview-task-stack"><span></span><span></span><span></span></div> : null}</button>)}
          {[["line-driver-manager", 3], ["line-driver-context", 2], ["line-context-scheduler", 4], ["line-scheduler-task", 5], ["line-manager-workers", 6], ["line-task-workers", 8]].map(([name, reveal]) => <div key={name} className={`overview-line ${name} ${Number(reveal) > visibleStep ? "is-hidden" : ""}`}></div>)}
        </div>
        <div className="flow-map" aria-label="Clickable Spark execution flow">{flowOrder.map(([key, label, description], index) => <button key={key} className={`flow-node ${active === key ? "active" : ""}`} onClick={() => select(key)}><span>{index + 1}</span><strong>{label}</strong><small>{description}</small></button>)}</div>
        <div className="flow-detail" ref={detailRef}>
          <div className="flow-detail-header"><div><p className="eyebrow">{step.category}</p><h3>{step.title}</h3></div><span className="badge">{step.badge}</span></div>
          <div className="flow-content-grid">
            <div className="panel-flat"><h4>What Happens</h4><p>{step.explanation}</p></div>
            <div className="panel-flat"><h4>Code or Internal Call</h4><pre><code>{step.code}</code></pre></div>
            <div className="panel-flat"><h4>Cluster View</h4><div className="cluster-visual"><FlowVisual type={step.visual} /></div></div>
            <div className="panel-flat"><h4>Student Checkpoint</h4><p>{step.checkpoint}</p><div className="flow-tip">{step.tip}</div></div>
          </div>
        </div>
      </section>
    </section>
  );
}
