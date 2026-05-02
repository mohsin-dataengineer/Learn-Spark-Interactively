export type CurriculumTrack = {
  number: string;
  slug: string;
  title: string;
  description: string;
  code: string;
  bullets: string[];
  objectives: string[];
  deepDive: Array<{
    title: string;
    body: string;
    example: string;
  }>;
  interactive: {
    label: string;
    prompt: string;
    options: Array<{
      label: string;
      explanation: string;
      result: string;
    }>;
  };
  featured?: boolean;
};

export const curriculumTracks: CurriculumTrack[] = [
  {
    number: "01",
    slug: "spark-foundations",
    title: "Spark Foundations",
    description: "Cluster roles, SparkSession, jobs, stages, tasks, and why distributed execution matters.",
    code: `spark = SparkSession.builder.appName("orders").getOrCreate()
df = spark.read.csv("orders.csv", header=True)`,
    bullets: ["Spark driver, executors, and cluster manager", "Transformations vs actions", "Jobs, stages, tasks, and partitions", "Local mode vs cluster mode"],
    objectives: ["Explain driver, executor, and cluster manager responsibilities", "Predict when Spark creates a job", "Connect partitions to parallel task execution"],
    deepDive: [
      {
        title: "SparkSession starts the application",
        body: "SparkSession is the user-facing entry point. It owns SparkContext, SQL configuration, catalog access, and the connection to the execution engine.",
        example: `spark = SparkSession.builder
  .appName("orders")
  .master("local[*]")
  .getOrCreate()`,
      },
      {
        title: "The driver plans, executors run",
        body: "The driver runs your program, tracks metadata, builds execution plans, and asks executors to perform partition-level work. Executors hold task slots, cache data, and report status back.",
        example: `df.filter("amount > 100").count()
# driver plans the job
# executors run tasks over partitions`,
      },
      {
        title: "Parallelism comes from partitions",
        body: "A task usually processes one partition. More partitions can increase parallelism, but too many partitions create scheduling overhead and small output files.",
        example: `df = spark.read.parquet("orders")
df.rdd.getNumPartitions()`,
      },
    ],
    interactive: {
      label: "Cluster role check",
      prompt: "A student clicks Run on df.count(). Which component decides the work plan?",
      options: [
        { label: "Driver", explanation: "Correct. The driver builds the query plan, creates the job, and coordinates scheduling.", result: "Job plan created on the driver" },
        { label: "Executor", explanation: "Executors run task code, but they do not decide the global plan.", result: "Task execution only" },
        { label: "Storage system", explanation: "Storage provides input data, but Spark still plans the work in the driver.", result: "Data source scanned later" },
      ],
    },
  },
  {
    number: "02",
    slug: "dataframes-and-sql",
    title: "DataFrames and Spark SQL",
    description: "The main API students should master first: schemas, columns, filtering, aggregation, and SQL.",
    code: `orders.where("amount >= 50")
  .groupBy("city")
  .agg(sum("amount").alias("revenue"))`,
    bullets: ["Schema inference and explicit schemas", "select, filter, withColumn", "Aggregations and window functions", "SQL views and query plans"],
    objectives: ["Use DataFrame transformations fluently", "Read schemas and column expressions", "Compare DataFrame code with equivalent SQL"],
    deepDive: [
      {
        title: "DataFrames are structured distributed tables",
        body: "A DataFrame has named columns and a schema. That structure lets Spark validate expressions, optimize the plan, and choose efficient physical operators.",
        example: `orders.printSchema()
orders.select("city", "amount")`,
      },
      {
        title: "Column expressions build a plan",
        body: "Operations like filter, select, and withColumn are transformations. They append nodes to a logical plan instead of scanning data immediately.",
        example: `from pyspark.sql.functions import col
orders.where(col("amount") >= 50)`,
      },
      {
        title: "SQL and DataFrames share the engine",
        body: "Spark SQL and the DataFrame API both compile through Catalyst, so students can choose the syntax that is clearest while learning the same execution model.",
        example: `orders.createOrReplaceTempView("orders")
spark.sql("""
  select city, sum(amount) as revenue
  from orders
  group by city
""")`,
      },
    ],
    interactive: {
      label: "API translation",
      prompt: "Which DataFrame call matches SQL: where amount >= 50?",
      options: [
        { label: `orders.where("amount >= 50")`, explanation: "Correct. where and filter are aliases for row filtering.", result: "Filter node added to the logical plan" },
        { label: `orders.select("amount >= 50")`, explanation: "select chooses columns or expressions. It does not remove rows by itself.", result: "Projection, not filtering" },
        { label: `orders.groupBy("amount >= 50")`, explanation: "groupBy creates aggregation groups. It is not a row-level filter.", result: "Aggregation grouping" },
      ],
    },
    featured: true,
  },
  {
    number: "03",
    slug: "rdd-mental-model",
    title: "RDD Mental Model",
    description: "Understand lineage, immutability, partition-level work, and the lower-level model beneath DataFrames.",
    code: `rdd = sc.textFile("logs")
errors = rdd.filter(lambda line: "ERROR" in line)
errors.count()`,
    bullets: ["RDD creation and lineage", "Narrow and wide dependencies", "Pair RDDs and key-value operations", "When RDDs still make sense"],
    objectives: ["Describe RDD lineage and immutability", "Classify narrow vs wide dependencies", "Know when RDD APIs are still useful"],
    deepDive: [
      {
        title: "RDDs record lineage",
        body: "Each RDD knows how it was derived from previous RDDs. Spark uses this lineage to recompute lost partitions after failures.",
        example: `base = sc.textFile("logs")
errors = base.filter(lambda x: "ERROR" in x)
print(errors.toDebugString())`,
      },
      {
        title: "Narrow dependencies stay local",
        body: "map and filter can process each input partition independently. These narrow transformations can often remain inside the same stage.",
        example: `logs.filter(lambda x: "ERROR" in x)
    .map(lambda x: x.lower())`,
      },
      {
        title: "Wide dependencies cause shuffle",
        body: "Operations like reduceByKey and groupByKey need records with the same key to meet on the same reducer partition. That network movement creates a stage boundary.",
        example: `pairs.reduceByKey(lambda a, b: a + b)`,
      },
    ],
    interactive: {
      label: "Dependency classifier",
      prompt: "Which operation usually creates a wide dependency?",
      options: [
        { label: "reduceByKey", explanation: "Correct. Records with the same key may live on different partitions, so Spark must shuffle.", result: "Shuffle boundary and new stage" },
        { label: "map", explanation: "map transforms records partition by partition without moving data across the network.", result: "Narrow dependency" },
        { label: "filter", explanation: "filter keeps or drops rows locally inside each partition.", result: "Narrow dependency" },
      ],
    },
  },
  {
    number: "04",
    slug: "execution-internals",
    title: "Execution Internals",
    description: "See how Spark turns code into logical plans, optimized plans, physical plans, and tasks.",
    code: `orders.groupBy("city").count().explain("formatted")`,
    bullets: ["Lazy evaluation and DAGs", "Catalyst optimizer", "Tungsten execution engine", "Adaptive Query Execution"],
    objectives: ["Trace code from logical plan to physical tasks", "Understand stage boundaries and task sets", "Use explain output for debugging"],
    deepDive: [
      {
        title: "Lazy evaluation delays work",
        body: "Spark records transformations until an action appears. The action gives Spark enough context to optimize the whole plan before execution.",
        example: `query = orders.filter("amount > 100").groupBy("city").count()
query.explain("formatted")
query.collect()`,
      },
      {
        title: "Catalyst rewrites the plan",
        body: "Catalyst resolves columns, pushes filters, prunes unused fields, simplifies expressions, and chooses join strategies before physical execution.",
        example: `orders.select("city", "amount")
  .where("amount > 100")
  .explain(True)`,
      },
      {
        title: "Stages break at shuffle boundaries",
        body: "A wide dependency requires data exchange. Spark finishes upstream tasks, materializes shuffle files, then launches downstream tasks that read the shuffle output.",
        example: `orders.repartition("city")
  .groupBy("city")
  .count()`,
      },
    ],
    interactive: {
      label: "Plan trigger",
      prompt: "Which line actually starts execution?",
      options: [
        { label: "query.collect()", explanation: "Correct. collect is an action, so Spark creates a job and starts task scheduling.", result: "Job submitted" },
        { label: `orders.filter("amount > 100")`, explanation: "filter is lazy. It only adds a node to the logical plan.", result: "Plan updated, no job yet" },
        { label: `orders.groupBy("city")`, explanation: "groupBy prepares an aggregation plan, but it still waits for an action.", result: "Plan updated, no job yet" },
      ],
    },
  },
  {
    number: "05",
    slug: "data-engineering-patterns",
    title: "Data Engineering Patterns",
    description: "Read, transform, validate, and write reliable datasets using production-friendly patterns.",
    code: `clean.write
  .partitionBy("event_date")
  .mode("overwrite")
  .parquet("s3://lake/silver/orders")`,
    bullets: ["CSV, JSON, Parquet, ORC, and Delta-style tables", "Partitioning and file layout", "Deduplication and data quality checks", "Incremental batch pipelines"],
    objectives: ["Choose file formats and partition columns intentionally", "Design bronze, silver, and gold transformations", "Add validation before writes"],
    deepDive: [
      {
        title: "Use columnar formats for analytics",
        body: "Parquet and ORC store data by column with schema and compression. Spark can read only needed columns and skip row groups when statistics allow it.",
        example: `spark.read.parquet("s3://lake/silver/orders")`,
      },
      {
        title: "Partition for common filters",
        body: "Partition columns should match high-value filters like dates. Bad partition choices create too many folders or force full scans.",
        example: `events.write.partitionBy("event_date").parquet(path)`,
      },
      {
        title: "Validate before publishing",
        body: "Production pipelines should check row counts, null keys, duplicate business keys, and expected ranges before writing downstream tables.",
        example: `bad = clean.where("order_id is null")
assert bad.count() == 0`,
      },
    ],
    interactive: {
      label: "Partition choice",
      prompt: "A dashboard filters daily order data by date. Which partition column is most useful?",
      options: [
        { label: "event_date", explanation: "Correct. Date filters can prune folders and reduce the amount of data scanned.", result: "Partition pruning enabled" },
        { label: "order_id", explanation: "Usually too high-cardinality. It can create too many tiny partitions.", result: "Too many folders" },
        { label: "amount", explanation: "Amounts are often high-cardinality and not stable as a folder layout.", result: "Poor file layout" },
      ],
    },
  },
  {
    number: "06",
    slug: "performance-and-scale",
    title: "Performance and Scale",
    description: "Learn the causes of slow Spark jobs: shuffles, skew, spills, bad joins, tiny files, and poor partitioning.",
    code: `spark.conf.set("spark.sql.adaptive.enabled", "true")
large.join(broadcast(dim), "product_id")`,
    bullets: ["Shuffle cost and stage boundaries", "Broadcast, sort-merge, and shuffle hash joins", "Caching, persistence, and checkpointing", "Skew handling and partition tuning"],
    objectives: ["Spot expensive shuffles and skew", "Choose join strategies based on table size", "Use caching and partition tuning with discipline"],
    deepDive: [
      {
        title: "Shuffles dominate many slow jobs",
        body: "Shuffle writes data to disk, transfers it across the network, and reads it in downstream tasks. Reduce unnecessary shuffles before tuning anything else.",
        example: `df.groupBy("customer_id").count()`,
      },
      {
        title: "Join strategy matters",
        body: "Broadcast joins avoid shuffling a large table when one side is small enough to send to every executor. Sort-merge joins are safer for two large tables.",
        example: `from pyspark.sql.functions import broadcast
fact.join(broadcast(dim), "product_id")`,
      },
      {
        title: "Skew creates straggler tasks",
        body: "If one key owns a huge fraction of records, one task may run far longer than the rest. AQE, salting, and better keys can reduce the imbalance.",
        example: `spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")`,
      },
    ],
    interactive: {
      label: "Tuning decision",
      prompt: "A 4 GB fact table joins a 5 MB dimension table. Which strategy is likely best?",
      options: [
        { label: "Broadcast the dimension", explanation: "Correct. Sending the tiny dimension to each executor can avoid a large shuffle.", result: "Broadcast hash join" },
        { label: "Repartition both to 10,000 partitions", explanation: "This may create heavy scheduling overhead and many tiny files.", result: "Over-partitioned job" },
        { label: "Cache both tables first", explanation: "Caching can help reuse, but it does not automatically fix an inefficient join strategy.", result: "Memory pressure risk" },
      ],
    },
  },
];

export const advancedModules = [
  ["Join Strategy Lab", "Compare broadcast, sort-merge, and shuffle hash joins with table sizes and partition counts.", `fact.join(broadcast(dim), "id")`],
  ["Shuffle Visualizer", "Animate records moving across partitions during groupBy, distinct, and joins.", `events.repartition("user_id")`],
  ["Skew Clinic", "Show one overloaded key slowing a whole stage, then fix it with salting and AQE.", `df.groupBy("country").count()`],
  ["Structured Streaming", "Teach micro-batches, watermarks, state, late data, and output modes with a moving event stream.", `stream.withWatermark("event_time", "10 minutes")`],
  ["MLlib Pipeline", "Build a visual pipeline for feature transforms, estimators, models, and evaluators.", `Pipeline(stages=[indexer, assembler, model])`],
  ["Production Debugging", "Read Spark UI symptoms: long tasks, spill, skew, failed stages, storage pressure, and tiny files.", `df.explain("cost")`],
] as const;
