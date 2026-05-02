export type CurriculumTrack = {
  number: string;
  title: string;
  description: string;
  code: string;
  bullets: string[];
  featured?: boolean;
};

export const curriculumTracks: CurriculumTrack[] = [
  {
    number: "01",
    title: "Spark Foundations",
    description: "Cluster roles, SparkSession, jobs, stages, tasks, and why distributed execution matters.",
    code: `spark = SparkSession.builder.appName("orders").getOrCreate()
df = spark.read.csv("orders.csv", header=True)`,
    bullets: ["Spark driver, executors, and cluster manager", "Transformations vs actions", "Jobs, stages, tasks, and partitions", "Local mode vs cluster mode"],
  },
  {
    number: "02",
    title: "DataFrames and Spark SQL",
    description: "The main API students should master first: schemas, columns, filtering, aggregation, and SQL.",
    code: `orders.where("amount >= 50")
  .groupBy("city")
  .agg(sum("amount").alias("revenue"))`,
    bullets: ["Schema inference and explicit schemas", "select, filter, withColumn", "Aggregations and window functions", "SQL views and query plans"],
    featured: true,
  },
  {
    number: "03",
    title: "RDD Mental Model",
    description: "Understand lineage, immutability, partition-level work, and the lower-level model beneath DataFrames.",
    code: `rdd = sc.textFile("logs")
errors = rdd.filter(lambda line: "ERROR" in line)
errors.count()`,
    bullets: ["RDD creation and lineage", "Narrow and wide dependencies", "Pair RDDs and key-value operations", "When RDDs still make sense"],
  },
  {
    number: "04",
    title: "Execution Internals",
    description: "See how Spark turns code into logical plans, optimized plans, physical plans, and tasks.",
    code: `orders.groupBy("city").count().explain("formatted")`,
    bullets: ["Lazy evaluation and DAGs", "Catalyst optimizer", "Tungsten execution engine", "Adaptive Query Execution"],
  },
  {
    number: "05",
    title: "Data Engineering Patterns",
    description: "Read, transform, validate, and write reliable datasets using production-friendly patterns.",
    code: `clean.write
  .partitionBy("event_date")
  .mode("overwrite")
  .parquet("s3://lake/silver/orders")`,
    bullets: ["CSV, JSON, Parquet, ORC, and Delta-style tables", "Partitioning and file layout", "Deduplication and data quality checks", "Incremental batch pipelines"],
  },
  {
    number: "06",
    title: "Performance and Scale",
    description: "Learn the causes of slow Spark jobs: shuffles, skew, spills, bad joins, tiny files, and poor partitioning.",
    code: `spark.conf.set("spark.sql.adaptive.enabled", "true")
large.join(broadcast(dim), "product_id")`,
    bullets: ["Shuffle cost and stage boundaries", "Broadcast, sort-merge, and shuffle hash joins", "Caching, persistence, and checkpointing", "Skew handling and partition tuning"],
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
