import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type TourStep = {
  title: string;
  body: string;
  selector?: string;
  route?: string;
};

const storageKey = "spark-studio-tour-complete";

const baseSteps: TourStep[] = [
  {
    title: "Welcome to Spark Studio",
    body: "This site is organized as short interactive pages. You can learn Spark concepts by clicking through diagrams and changing simulator controls.",
    selector: "[data-tour='brand']",
    route: "/",
  },
  {
    title: "Use the page navigation",
    body: "The top navigation takes you directly to each learning area: curriculum, live explorer, execution flow, concept lab, advanced topics, and roadmap.",
    selector: "[data-tour='nav']",
  },
  {
    title: "Pick a learning path",
    body: "Start with Execution Flow if you are new to Spark internals. Use Explorer and Concept Lab when you want hands-on simulations.",
    selector: "[data-tour='learning-cards']",
    route: "/",
  },
  {
    title: "Start with job execution",
    body: "The Execution Flow page explains what happens from SparkSession initialization through task execution and shuffle.",
    selector: "[data-tour='start-execution']",
    route: "/",
  },
  {
    title: "Replay anytime",
    body: "Use the Tour button in the header whenever you want this walkthrough again.",
    selector: "[data-tour='tour-button']",
  },
];

const routeSteps: Record<string, TourStep[]> = {
  "/lazy-evaluation": [
    {
      title: "Lazy Evaluation Explorer",
      body: "Use this page to queue transformations first, then trigger an action to see Spark execute the plan.",
      selector: "[data-tour='lazy-builder']",
    },
    {
      title: "Build a query",
      body: "Click transformation buttons like filter, select, withColumn, or groupBy. The code preview updates without running a Spark job.",
      selector: "[data-tour='lazy-controls']",
    },
    {
      title: "Run an action",
      body: "Actions such as show() and count() trigger execution. Watch the status, DAG, and result table change.",
      selector: "[data-tour='lazy-actions']",
    },
  ],
  "/execution-flow": [
    {
      title: "Reveal the architecture gradually",
      body: "Use Reveal next step to uncover the Spark execution architecture one component at a time.",
      selector: "[data-tour='flow-overview']",
    },
    {
      title: "Click each execution step",
      body: "The step list lets students inspect SparkSession, cluster manager, executors, DAG Scheduler, Task Scheduler, shuffle, and result collection.",
      selector: "[data-tour='flow-map']",
    },
    {
      title: "Read the details",
      body: "Each click updates the explanation, internal call, cluster view, checkpoint, and practical tip.",
      selector: "[data-tour='flow-detail']",
    },
  ],
  "/concept-lab": [
    {
      title: "Choose a concept",
      body: "The sidebar switches between simulations for partitions, shuffle, joins, caching, skew, and streaming.",
      selector: "[data-tour='sim-tabs']",
    },
    {
      title: "Adjust controls",
      body: "Sliders and selectors change the simulation immediately, so students can explore cause and effect.",
      selector: "[data-tour='sim-controls']",
    },
    {
      title: "Connect code to behavior",
      body: "The visual execution panel and Spark example update together to connect syntax with Spark internals.",
      selector: "[data-tour='sim-visual']",
    },
  ],
};

function getRouteSteps(pathname: string) {
  return routeSteps[pathname] ?? [];
}

export function GuidedTour({ replayToken }: { replayToken: number }) {
  const location = useLocation();
  const navigate = useNavigate();
  const steps = useMemo(() => [...baseSteps, ...getRouteSteps(location.pathname)], [location.pathname]);
  const [isOpen, setIsOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = steps[index];

  useEffect(() => {
    if (!localStorage.getItem(storageKey)) {
      setIsOpen(true);
      setIndex(0);
    }
  }, []);

  useEffect(() => {
    if (replayToken > 0) {
      setIsOpen(true);
      setIndex(0);
    }
  }, [replayToken]);

  useEffect(() => {
    if (isOpen && step?.route && step.route !== location.pathname) {
      navigate(step.route);
    }
  }, [isOpen, location.pathname, navigate, step]);

  useLayoutEffect(() => {
    if (!isOpen || !step?.selector) {
      setRect(null);
      return;
    }

    const updateRect = () => {
      const element = document.querySelector(step.selector!);
      setRect(element ? element.getBoundingClientRect() : null);
    };

    const frame = window.requestAnimationFrame(updateRect);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [isOpen, location.pathname, step]);

  if (!isOpen || !step) return null;

  const finish = () => {
    localStorage.setItem(storageKey, "true");
    setIsOpen(false);
  };

  const next = () => {
    if (index >= steps.length - 1) finish();
    else setIndex(index + 1);
  };

  return (
    <div className="tour-layer" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div className="tour-scrim"></div>
      {rect ? (
        <div
          className="tour-highlight"
          style={{
            top: Math.max(8, rect.top - 8),
            left: Math.max(8, rect.left - 8),
            width: rect.width + 16,
            height: rect.height + 16,
          }}
        />
      ) : null}
      <div className="tour-card">
        <div className="tour-progress">Step {index + 1} of {steps.length}</div>
        <h2 id="tour-title">{step.title}</h2>
        <p>{step.body}</p>
        <div className="tour-actions">
          <button className="secondary" onClick={finish}>Skip</button>
          {index > 0 ? <button className="secondary" onClick={() => setIndex(index - 1)}>Back</button> : null}
          <button className="primary" onClick={next}>{index >= steps.length - 1 ? "Finish" : "Next"}</button>
        </div>
      </div>
    </div>
  );
}
