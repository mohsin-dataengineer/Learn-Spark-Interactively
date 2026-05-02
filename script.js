const sourceRows = [
  { id: 1, city: "Austin", category: "Books", amount: 42 },
  { id: 2, city: "Boston", category: "Games", amount: 88 },
  { id: 3, city: "Austin", category: "Games", amount: 64 },
  { id: 4, city: "Denver", category: "Books", amount: 25 },
  { id: 5, city: "Boston", category: "Music", amount: 73 },
  { id: 6, city: "Denver", category: "Games", amount: 51 },
  { id: 7, city: "Austin", category: "Music", amount: 19 },
  { id: 8, city: "Boston", category: "Books", amount: 57 },
];

const operations = {
  filterHighValue: {
    label: "Filter amount >= 50",
    code: '.filter(col("amount") >= 50)',
    kind: "narrow",
    apply: rows => rows.filter(row => row.amount >= 50),
  },
  selectCityAmount: {
    label: "Select city, amount",
    code: '.select("city", "amount")',
    kind: "narrow",
    apply: rows => rows.map(row => ({ city: row.city, amount: row.amount ?? row.totalAmount ?? 0 })),
  },
  withTax: {
    label: "Add tax column",
    code: '.withColumn("tax", round(col("amount") * 0.0825, 2))',
    kind: "narrow",
    apply: rows => rows.map(row => {
      const amount = row.amount ?? row.totalAmount ?? 0;
      return { ...row, tax: Number((amount * 0.0825).toFixed(2)) };
    }),
  },
  groupByCity: {
    label: "Group by city",
    code: '.groupBy("city").sum("amount")',
    kind: "shuffle",
    apply: rows => {
      const grouped = rows.reduce((acc, row) => {
        const city = row.city || "unknown";
        acc[city] = (acc[city] || 0) + (row.amount ?? row.totalAmount ?? 0);
        return acc;
      }, {});

      return Object.entries(grouped).map(([city, totalAmount]) => ({ city, totalAmount }));
    },
  },
};

if (document.getElementById("codePreview")) {
  const state = {
    selectedOps: [],
    lastAction: null,
    resultRows: sourceRows,
    hasExecuted: false,
  };

  const elements = {
    codePreview: document.getElementById("codePreview"),
    queuedCount: document.getElementById("queuedCount"),
    stageCount: document.getElementById("stageCount"),
    rowCount: document.getElementById("rowCount"),
    executionStatus: document.getElementById("executionStatus"),
    planList: document.getElementById("planList"),
    dagCanvas: document.getElementById("dagCanvas"),
    shuffleBadge: document.getElementById("shuffleBadge"),
    sourceTable: document.getElementById("sourceTable"),
    resultTable: document.getElementById("resultTable"),
    resultHint: document.getElementById("resultHint"),
  };

  document.querySelectorAll("[data-op]").forEach(button => {
    button.addEventListener("click", () => {
      const op = operations[button.dataset.op];
      state.selectedOps.push(op);
      state.hasExecuted = false;
      render();
    });
  });

  document.getElementById("showButton").addEventListener("click", () => runAction("show"));
  document.getElementById("countButton").addEventListener("click", () => runAction("count"));
  document.getElementById("resetButton").addEventListener("click", () => {
    state.selectedOps = [];
    state.lastAction = null;
    state.resultRows = sourceRows;
    state.hasExecuted = false;
    render();
  });

function runAction(action) {
  state.lastAction = action;
  state.resultRows = executePlan();
  state.hasExecuted = true;
  render();
}

function executePlan() {
  return state.selectedOps.reduce((rows, op) => op.apply(rows), sourceRows);
}

function getStageCount() {
  if (!state.hasExecuted) return 0;
  return state.selectedOps.some(op => op.kind === "shuffle") ? 2 : 1;
}

function render() {
  renderCode();
  renderMetrics();
  renderStatus();
  renderPlan();
  renderDag();
  renderTable(elements.sourceTable, sourceRows);
  renderResults();
}

function renderCode() {
  const lines = ["orders"];
  state.selectedOps.forEach(op => lines.push(`  ${op.code}`));
  if (state.lastAction) lines.push(`  .${state.lastAction}()`);
  elements.codePreview.textContent = lines.join("\n");
}

function renderMetrics() {
  elements.queuedCount.textContent = state.selectedOps.length;
  elements.stageCount.textContent = getStageCount();
  elements.rowCount.textContent = state.hasExecuted ? state.resultRows.length : sourceRows.length;
}

function renderStatus() {
  elements.executionStatus.className = "status";

  if (!state.selectedOps.length) {
    elements.executionStatus.textContent = "Waiting for transformations. No Spark job has run yet.";
    return;
  }

  if (!state.hasExecuted) {
    elements.executionStatus.classList.add("pending");
    elements.executionStatus.textContent =
      `${state.selectedOps.length} transformation(s) queued. The source data is unchanged until an action runs.`;
    return;
  }

  elements.executionStatus.classList.add("executed");
  elements.executionStatus.textContent =
    `Action ${state.lastAction}() triggered a Spark job and executed the queued plan.`;
}

function renderPlan() {
  if (!state.selectedOps.length) {
    elements.planList.innerHTML = '<div class="empty-state">No transformations queued.</div>';
    return;
  }

  elements.planList.innerHTML = state.selectedOps
    .map((op, index) => `<div class="plan-item">${index + 1}. ${op.label}</div>`)
    .join("");
}

function renderDag() {
  const hasShuffle = state.selectedOps.some(op => op.kind === "shuffle");
  elements.shuffleBadge.textContent = hasShuffle ? "Shuffle boundary" : "No shuffle";
  elements.shuffleBadge.className = hasShuffle ? "badge shuffle" : "badge";

  const nodes = [{ title: "Read", detail: "orders dataset", className: "" }];

  if (state.selectedOps.length) {
    const narrowOps = state.selectedOps.filter(op => op.kind === "narrow");
    if (narrowOps.length) {
      nodes.push({
        title: "Narrow transforms",
        detail: `${narrowOps.length} operation(s), same partition flow`,
        className: "",
      });
    }
  }

  if (hasShuffle) {
    nodes.push({ title: "Shuffle", detail: "move rows by city key", className: "shuffle" });
    nodes.push({ title: "Aggregate", detail: "sum amount per city", className: "" });
  }

  nodes.push({
    title: state.lastAction ? `${state.lastAction}()` : "Action",
    detail: state.hasExecuted ? "job executed" : "not run yet",
    className: "action",
  });

  elements.dagCanvas.innerHTML = nodes
    .map(
      node =>
        `<div class="dag-node ${node.className}"><strong>${node.title}</strong><small>${node.detail}</small></div>`,
    )
    .join("");
}

function renderResults() {
  elements.resultTable.innerHTML = "";

  if (!state.hasExecuted) {
    elements.resultHint.style.display = "block";
    elements.resultHint.textContent = "Add transformations, then run an action.";
    return;
  }

  if (state.lastAction === "count") {
    elements.resultHint.style.display = "block";
    elements.resultHint.textContent = `count() returned ${state.resultRows.length}`;
    return;
  }

  elements.resultHint.style.display = "none";
  renderTable(elements.resultTable, state.resultRows);
}

function renderTable(table, rows) {
  if (!rows.length) {
    table.innerHTML = "<tbody><tr><td>No rows</td></tr></tbody>";
    return;
  }

  const columns = Object.keys(rows[0]);
  const header = columns.map(column => `<th>${column}</th>`).join("");
  const body = rows
    .map(row => `<tr>${columns.map(column => `<td>${row[column]}</td>`).join("")}</tr>`)
    .join("");

  table.innerHTML = `<thead><tr>${header}</tr></thead><tbody>${body}</tbody>`;
}

  render();
}

const flowSteps = {
  session: {
    category: "Initialization",
    title: "SparkSession creates SparkContext",
    badge: "Driver",
    code: `spark = SparkSession.builder
  .appName("RevenueByCity")
  .getOrCreate()

sc = spark.sparkContext`,
    explanation: "The driver program starts first. SparkSession is the high-level entry point, and SparkContext is the connection between the driver and the Spark cluster.",
    checkpoint: "At this moment, no user data has been processed. Spark is preparing the application runtime.",
    tip: "Think of the driver as the coordinator that owns your code, query plan, and scheduling decisions.",
    visual: "session",
  },
  cluster: {
    category: "Resource Negotiation",
    title: "Driver asks the cluster manager for resources",
    badge: "YARN / Kubernetes / Standalone",
    code: `Driver -> Cluster Manager:
  application name
  executor count
  executor memory
  executor cores`,
    explanation: "The cluster manager decides where executor processes can run. It does not execute Spark transformations itself; it allocates CPU and memory containers or pods.",
    checkpoint: "Spark can run on different managers, but the scheduling model stays similar: driver requests resources, executors run tasks.",
    tip: "Cluster manager handles resources. Spark handles jobs, stages, tasks, and data processing.",
    visual: "cluster",
  },
  executors: {
    category: "Runtime Setup",
    title: "Executors launch and register with the driver",
    badge: "Executors",
    code: `Executor 1 -> Driver: registered
Executor 2 -> Driver: registered
Executor 3 -> Driver: registered`,
    explanation: "Executors are long-running worker processes. They store cached data, run tasks, write shuffle files, and report status back to the driver.",
    checkpoint: "A Spark application usually has one driver and many executors. Each executor has slots based on available cores.",
    tip: "More cores means more concurrent tasks, but not always faster jobs if the bottleneck is shuffle, skew, or I/O.",
    visual: "executors",
  },
  logical: {
    category: "Lazy Planning",
    title: "Transformations build a logical plan",
    badge: "No job yet",
    code: `query = orders
  .filter(col("amount") >= 50)
  .groupBy("city")
  .sum("amount")

// no action has run yet`,
    explanation: "Transformations are lazy. Spark records the operations as a plan, but it does not schedule tasks until an action asks for a result.",
    checkpoint: "If students only define transformations, the cluster remains idle for that query.",
    tip: "Actions include count(), show(), collect(), write(), take(), and foreach().",
    visual: "logical",
  },
  dag: {
    category: "DAG Planning",
    title: "Action triggers DAG Scheduler",
    badge: "Stages",
    code: `query.show()

DAGScheduler:
  split plan at shuffle boundaries
  create Stage 0 and Stage 1`,
    explanation: "When an action runs, Spark converts the lineage into a DAG. Wide dependencies such as groupBy and join create shuffle boundaries, which split the DAG into stages.",
    checkpoint: "A stage is a group of tasks that can run without waiting for a shuffle from another stage.",
    tip: "Narrow transformations can be pipelined together inside the same stage.",
    visual: "dag",
  },
  tasks: {
    category: "Task Scheduling",
    title: "Task Scheduler creates one task per partition",
    badge: "TaskSet",
    code: `Stage 0:
  partition 0 -> task 0
  partition 1 -> task 1
  partition 2 -> task 2
  partition 3 -> task 3`,
    explanation: "For each stage, Spark creates tasks. A task is the smallest unit of execution and usually processes one partition of data.",
    checkpoint: "If a stage has 200 partitions, Spark schedules about 200 tasks for that stage.",
    tip: "Task locality matters: Spark tries to run tasks near the data when possible.",
    visual: "tasks",
  },
  execute: {
    category: "Distributed Work",
    title: "Executors run tasks against partitions",
    badge: "Parallelism",
    code: `Executor task:
  read partition
  apply filter
  compute partial aggregate
  write shuffle output`,
    explanation: "Executors deserialize the task, read their assigned partition, apply the stage's pipeline, and report metrics such as runtime, bytes read, and spill.",
    checkpoint: "This is where CPU, memory, disk, and network costs show up in the Spark UI.",
    tip: "Slow tasks can reveal skew, insufficient memory, bad file layout, or overloaded nodes.",
    visual: "execute",
  },
  shuffle: {
    category: "Data Exchange",
    title: "Shuffle moves records to new partitions by key",
    badge: "Network",
    code: `groupBy("city")

Map side:
  write shuffle files
Reduce side:
  fetch matching keys
  aggregate city totals`,
    explanation: "Shuffle writes intermediate data from one stage and reads it in another. Rows with the same key move to the same reduce partition.",
    checkpoint: "Shuffles are often the most expensive part of Spark jobs because they use network, disk, and serialization.",
    tip: "Common shuffle operations: groupBy, distinct, repartition, orderBy, and most large joins.",
    visual: "shuffle",
  },
  result: {
    category: "Completion",
    title: "Final stage returns or writes the action result",
    badge: "Job done",
    code: `query.show()

Driver receives:
  city | sum(amount)
  Austin | 106
  Boston | 218`,
    explanation: "After the final stage finishes, Spark returns the action result to the driver or commits output files to storage.",
    checkpoint: "The job is complete when all required stages finish successfully and the action has its result.",
    tip: "For large outputs, prefer write() over collect() so data stays distributed instead of overwhelming the driver.",
    visual: "result",
  },
};

if (document.querySelector(".flow-node")) {
  const flowElements = {
    nodes: Array.from(document.querySelectorAll(".flow-node")),
    overviewNodes: Array.from(document.querySelectorAll("[data-flow-jump]")),
    revealItems: Array.from(document.querySelectorAll("[data-reveal-step]")),
    revealNext: document.getElementById("revealNextFlow"),
    revealAll: document.getElementById("revealAllFlow"),
    revealReset: document.getElementById("resetFlowReveal"),
    revealProgress: document.getElementById("revealProgress"),
    detail: document.querySelector(".flow-detail"),
    category: document.getElementById("flowCategory"),
    title: document.getElementById("flowTitle"),
    badge: document.getElementById("flowBadge"),
    explanation: document.getElementById("flowExplanation"),
    code: document.getElementById("flowCode"),
    visual: document.getElementById("flowVisual"),
    checkpoint: document.getElementById("flowCheckpoint"),
    tip: document.getElementById("flowTip"),
  };

  let activeFlowStep = "session";
  let visibleFlowStep = 1;
  const maxFlowRevealStep = 8;

  flowElements.nodes.forEach(node => {
    node.addEventListener("click", () => {
      activeFlowStep = node.dataset.flow;
      renderFlowStep();
      scrollFlowDetailIntoView();
    });
  });

  flowElements.overviewNodes.forEach(node => {
    node.addEventListener("click", () => {
      if (Number(node.dataset.revealStep) > visibleFlowStep) return;
      activeFlowStep = node.dataset.flowJump;
      renderFlowStep();
      scrollFlowDetailIntoView();
    });
  });

  flowElements.revealNext.addEventListener("click", () => {
    visibleFlowStep = Math.min(maxFlowRevealStep, visibleFlowStep + 1);
    renderFlowReveal();
  });

  flowElements.revealAll.addEventListener("click", () => {
    visibleFlowStep = maxFlowRevealStep;
    renderFlowReveal();
  });

  flowElements.revealReset.addEventListener("click", () => {
    visibleFlowStep = 1;
    activeFlowStep = "session";
    renderFlowReveal();
    renderFlowStep();
  });

function renderFlowStep() {
  const step = flowSteps[activeFlowStep];
  flowElements.nodes.forEach(node => node.classList.toggle("active", node.dataset.flow === activeFlowStep));
  flowElements.overviewNodes.forEach(node => node.classList.toggle("active", node.dataset.flowJump === activeFlowStep));
  flowElements.category.textContent = step.category;
  flowElements.title.textContent = step.title;
  flowElements.badge.textContent = step.badge;
  flowElements.explanation.textContent = step.explanation;
  flowElements.code.textContent = step.code;
  flowElements.checkpoint.textContent = step.checkpoint;
  flowElements.tip.textContent = step.tip;
  flowElements.visual.innerHTML = renderFlowVisual(step.visual);
}

function renderFlowReveal() {
  flowElements.revealItems.forEach(item => {
    const isVisible = Number(item.dataset.revealStep) <= visibleFlowStep;
    item.classList.toggle("is-hidden", !isVisible);
    if ("disabled" in item) item.disabled = !isVisible;
  });

  flowElements.revealProgress.textContent = `Step ${visibleFlowStep} of ${maxFlowRevealStep}`;
  flowElements.revealNext.disabled = visibleFlowStep === maxFlowRevealStep;
}

function scrollFlowDetailIntoView() {
  if (!flowElements.detail) return;
  flowElements.detail.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderFlowVisual(type) {
  const visuals = {
    session: `
      <div class="driver-card active">Driver<br><small>SparkSession + SparkContext</small></div>
      <div class="cluster-link muted-link">initializes</div>
      <div class="driver-card">Application<br><small>user code loaded</small></div>`,
    cluster: `
      <div class="driver-card active">Driver<br><small>resource request</small></div>
      <div class="cluster-link">asks</div>
      <div class="manager-card active">Cluster Manager<br><small>allocates CPU + memory</small></div>`,
    executors: `
      <div class="manager-card active">Cluster Manager</div>
      <div class="cluster-link">launches</div>
      <div class="executor-grid">${[1, 2, 3].map(id => `<div class="executor-card active">Executor ${id}<small>registered</small></div>`).join("")}</div>`,
    logical: `
      <div class="plan-stack">
        <div>Read orders</div>
        <div>Filter amount >= 50</div>
        <div>Group by city</div>
        <div>Sum amount</div>
        <div class="inactive-plan">Waiting for action</div>
      </div>`,
    dag: `
      <div class="stage-line">
        <div class="stage-card active">Stage 0<small>read + filter + partial aggregate</small></div>
        <div class="cluster-link shuffle-link">shuffle boundary</div>
        <div class="stage-card active">Stage 1<small>final aggregate + result</small></div>
      </div>`,
    tasks: `
      <div class="task-grid">${Array.from({ length: 8 }, (_, index) => `<div class="task-card">Task ${index}<small>partition ${index}</small></div>`).join("")}</div>`,
    execute: `
      <div class="executor-grid">${[1, 2, 3].map(id => `<div class="executor-card active">Executor ${id}<div class="mini-task-row"><i></i><i></i><i></i></div></div>`).join("")}</div>`,
    shuffle: `
      <div class="shuffle-visual">
        <div class="bucket"><strong>Map Stage</strong><div class="row-dots"><span class="key-1">A</span><span class="key-2">B</span><span class="key-1">A</span><span class="key-3">C</span></div></div>
        <div class="cluster-link shuffle-link">network fetch</div>
        <div class="bucket"><strong>Reduce Stage</strong><div class="row-dots"><span class="key-1">A</span><span class="key-1">A</span><span class="key-2">B</span><span class="key-3">C</span></div></div>
      </div>`,
    result: `
      <div class="result-card active">Final Output<small>returned to driver or written to storage</small></div>
      <div class="cluster-link">commits</div>
      <div class="driver-card">Storage / Driver<small>action complete</small></div>`,
  };

  return visuals[type];
}

  renderFlowStep();
  renderFlowReveal();
}

if (document.getElementById("simControls")) {
  const simState = {
    active: "partitions",
    values: {
      partitions: { partitions: 4, rows: 16 },
      shuffle: { partitions: 4, keys: 3 },
      joins: { strategy: "broadcast", factRows: 14, dimRows: 4 },
      cache: { cached: "no", runs: 2 },
      skew: { hotKey: 65, salt: "off" },
      streaming: { watermark: 10, lateEvents: 3 },
    },
  };

  const simElements = {
    tabs: Array.from(document.querySelectorAll(".sim-tab")),
    level: document.getElementById("simLevel"),
    title: document.getElementById("simTitle"),
    badge: document.getElementById("simBadge"),
    controls: document.getElementById("simControls"),
    visual: document.getElementById("simVisual"),
    code: document.getElementById("simCode"),
    explanation: document.getElementById("simExplanation"),
    result: document.getElementById("simResult"),
  };

const simulations = {
  partitions: {
    level: "Fundamental",
    title: "Partitions Explorer",
    badge: "Narrow work",
    controls: [
      { key: "partitions", label: "Partitions", type: "range", min: 2, max: 8 },
      { key: "rows", label: "Rows", type: "range", min: 8, max: 28 },
    ],
    render: values => {
      const buckets = makeBuckets(values.rows, values.partitions, index => index % values.partitions);
      return {
        code: `orders = spark.read.parquet("orders")\n\norders.repartition(${values.partitions})\n  .filter(col("amount") >= 50)\n  .count()`,
        visual: renderBuckets(buckets, "Partition", false),
        explanation: `Spark splits ${values.rows} rows into ${values.partitions} partitions. A narrow transformation such as filter can run independently inside each partition without moving records across the network.`,
        result: `${values.partitions} tasks can process the partitions in parallel.`,
      };
    },
  },
  shuffle: {
    level: "Core Internal",
    title: "Shuffle Visualizer",
    badge: "Wide dependency",
    controls: [
      { key: "partitions", label: "Output partitions", type: "range", min: 2, max: 6 },
      { key: "keys", label: "Group keys", type: "range", min: 2, max: 5 },
    ],
    render: values => {
      const rows = 18;
      const buckets = makeBuckets(rows, values.partitions, index => index % values.partitions);
      const shuffled = makeBuckets(rows, values.partitions, index => index % values.keys % values.partitions);
      return {
        code: `orders\n  .groupBy("city")\n  .agg(sum("amount").alias("revenue"))\n  .show()`,
        visual: `${renderBuckets(buckets, "Before", false)}<div class="sim-arrow">Shuffle by key</div>${renderBuckets(shuffled, "After", true)}`,
        explanation: `groupBy is a wide transformation. Spark must move rows with the same key to the same output partition, which creates a shuffle boundary and usually a new stage.`,
        result: `${values.keys} keys are redistributed into ${values.partitions} output partitions.`,
      };
    },
  },
  joins: {
    level: "Performance",
    title: "Join Strategy Lab",
    badge: "Join planning",
    controls: [
      { key: "strategy", label: "Strategy", type: "select", options: ["broadcast", "sort-merge", "shuffle-hash"] },
      { key: "factRows", label: "Fact rows", type: "range", min: 8, max: 30 },
      { key: "dimRows", label: "Dimension rows", type: "range", min: 2, max: 10 },
    ],
    render: values => {
      const movement = values.strategy === "broadcast" ? values.dimRows : values.factRows + values.dimRows;
      const visual = renderJoinVisual(values.strategy, values.factRows, values.dimRows);
      const code =
        values.strategy === "broadcast"
          ? `orders.join(broadcast(products), "product_id")`
          : `orders.join(products, "product_id")\n\n-- Spark may shuffle both sides before joining`;
      return {
        code,
        visual,
        explanation: joinExplanation(values.strategy),
        result: `${movement} visual row units move across the cluster in this scenario.`,
      };
    },
  },
  cache: {
    level: "Optimization",
    title: "Caching and Reuse",
    badge: "Storage memory",
    controls: [
      { key: "cached", label: "Cache DataFrame", type: "select", options: ["no", "yes"] },
      { key: "runs", label: "Repeated actions", type: "range", min: 1, max: 5 },
    ],
    render: values => {
      const recomputes = values.cached === "yes" ? 1 : values.runs;
      return {
        code: `clean = raw.filter("amount >= 50").select("city", "amount")\n${values.cached === "yes" ? "clean.cache()\n" : ""}\nclean.count()\nclean.groupBy("city").sum("amount").show()`,
        visual: renderCacheVisual(values.cached === "yes", values.runs),
        explanation: values.cached === "yes"
          ? "Spark materializes the DataFrame after the first action. Later actions can reuse cached partitions instead of rebuilding the full lineage."
          : "Without caching, every action walks back through the lineage and recomputes the same upstream transformations.",
        result: `${recomputes} upstream recompute pass${recomputes === 1 ? "" : "es"} for ${values.runs} action${values.runs === 1 ? "" : "s"}.`,
      };
    },
  },
  skew: {
    level: "Advanced",
    title: "Skew Clinic",
    badge: "Hot partition",
    controls: [
      { key: "hotKey", label: "Hot key percent", type: "range", min: 25, max: 90 },
      { key: "salt", label: "Salting", type: "select", options: ["off", "on"] },
    ],
    render: values => {
      const loads = values.salt === "on"
        ? [30, 28, 24, 18]
        : [values.hotKey, Math.round((100 - values.hotKey) / 3), Math.round((100 - values.hotKey) / 3), 100 - values.hotKey - Math.round((100 - values.hotKey) / 3) * 2];
      return {
        code: values.salt === "on"
          ? `salted = df.withColumn("salt", pmod(rand() * 8, 8))\nsalted.groupBy("customer_id", "salt").count()`
          : `df.groupBy("customer_id").count()\n\n-- one key owns most records`,
        visual: renderLoadBars(loads),
        explanation: values.salt === "on"
          ? "Salting splits the hot key into smaller artificial keys, spreading work across more tasks before combining the result."
          : "One popular key sends too much data to one reducer. Most tasks finish quickly, but the overloaded task controls the stage runtime.",
        result: `Largest task handles ${Math.max(...loads)}% of the grouped data.`,
      };
    },
  },
  streaming: {
    level: "Advanced",
    title: "Structured Streaming Timeline",
    badge: "Stateful stream",
    controls: [
      { key: "watermark", label: "Watermark minutes", type: "range", min: 2, max: 20 },
      { key: "lateEvents", label: "Late events", type: "range", min: 0, max: 8 },
    ],
    render: values => {
      return {
        code: `events\n  .withWatermark("event_time", "${values.watermark} minutes")\n  .groupBy(window("event_time", "5 minutes"), col("user_id"))\n  .count()`,
        visual: renderStreamingTimeline(values.watermark, values.lateEvents),
        explanation: `Structured Streaming tracks event time and keeps state for windows that may still receive late data. A ${values.watermark}-minute watermark decides when old state can be closed.`,
        result: `${values.lateEvents} late event${values.lateEvents === 1 ? "" : "s"} tested against the watermark.`,
      };
    },
  },
};

simElements.tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    simState.active = tab.dataset.sim;
    renderSimulation();
  });
});

function renderSimulation() {
  const config = simulations[simState.active];
  const values = simState.values[simState.active];
  const output = config.render(values);

  simElements.tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.sim === simState.active));
  simElements.level.textContent = config.level;
  simElements.title.textContent = config.title;
  simElements.badge.textContent = config.badge;
  simElements.code.textContent = output.code;
  simElements.visual.innerHTML = output.visual;
  simElements.explanation.textContent = output.explanation;
  simElements.result.textContent = output.result;
  simElements.controls.innerHTML = config.controls.map(control => renderControl(control, values[control.key])).join("");

  simElements.controls.querySelectorAll("[data-control]").forEach(input => {
    input.addEventListener("input", event => {
      const key = event.target.dataset.control;
      const value = event.target.type === "range" ? Number(event.target.value) : event.target.value;
      simState.values[simState.active][key] = value;
      renderSimulation();
    });
  });
}

function renderControl(control, value) {
  if (control.type === "select") {
    const options = control.options
      .map(option => `<option value="${option}" ${option === value ? "selected" : ""}>${option}</option>`)
      .join("");
    return `<label class="sim-control"><span>${control.label}</span><select data-control="${control.key}">${options}</select></label>`;
  }

  return `<label class="sim-control"><span>${control.label}: <strong>${value}</strong></span><input data-control="${control.key}" type="range" min="${control.min}" max="${control.max}" value="${value}"></label>`;
}

function makeBuckets(rowCount, bucketCount, bucketFn) {
  const buckets = Array.from({ length: bucketCount }, () => []);
  for (let index = 0; index < rowCount; index += 1) {
    buckets[bucketFn(index)].push(index + 1);
  }
  return buckets;
}

function renderBuckets(buckets, label, keyed) {
  return `<div class="bucket-row">${buckets.map((bucket, index) => `
    <div class="bucket">
      <strong>${label} ${index + 1}</strong>
      <div class="row-dots">
        ${bucket.map(row => `<span class="${keyed ? `key-${row % 5}` : ""}">${row}</span>`).join("")}
      </div>
    </div>`).join("")}</div>`;
}

function renderJoinVisual(strategy, factRows, dimRows) {
  const fact = Array.from({ length: factRows }, (_, index) => `<span>${index + 1}</span>`).join("");
  const dim = Array.from({ length: dimRows }, (_, index) => `<span class="dim">${index + 1}</span>`).join("");
  const movement = strategy === "broadcast" ? "Broadcast small dimension table to every executor" : "Shuffle both tables by join key";
  return `<div class="join-visual">
    <div><strong>Fact table</strong><div class="row-dots">${fact}</div></div>
    <div class="sim-arrow">${movement}</div>
    <div><strong>Dimension table</strong><div class="row-dots">${dim}</div></div>
  </div>`;
}

function joinExplanation(strategy) {
  if (strategy === "broadcast") {
    return "Broadcast joins copy the small table to each executor, avoiding a large shuffle of the fact table.";
  }

  if (strategy === "sort-merge") {
    return "Sort-merge joins shuffle both sides by key, sort each partition, then merge matching keys. This is common for large joins.";
  }

  return "Shuffle hash joins shuffle both sides by key, then build hash tables inside partitions. It can be fast when partition sizes fit memory.";
}

function renderCacheVisual(cached, runs) {
  const actions = Array.from({ length: runs }, (_, index) => `<div class="cache-step action">Action ${index + 1}</div>`).join("");
  return `<div class="cache-flow">
    <div class="cache-step">Read</div>
    <div class="cache-step">Transform</div>
    <div class="cache-step ${cached ? "stored" : ""}">${cached ? "Cache" : "No cache"}</div>
    ${actions}
  </div>`;
}

function renderLoadBars(loads) {
  return `<div class="load-bars">${loads.map((load, index) => `
    <div class="load-row">
      <span>Task ${index + 1}</span>
      <div><i style="width: ${load}%"></i></div>
      <strong>${load}%</strong>
    </div>`).join("")}</div>`;
}

function renderStreamingTimeline(watermark, lateEvents) {
  const events = Array.from({ length: 10 }, (_, index) => {
    const late = index < lateEvents;
    return `<span class="${late ? "late" : ""}" style="left: ${8 + index * 8}%">${late ? "late" : "on time"}</span>`;
  }).join("");

  return `<div class="stream-timeline">
    <div class="timeline-line"></div>
    <div class="watermark" style="left: ${Math.min(82, 18 + watermark * 3)}%">watermark</div>
    ${events}
  </div>`;
}

  renderSimulation();
}
