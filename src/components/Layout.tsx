import { NavLink, Outlet } from "react-router-dom";
import type { ReactNode } from "react";
import { useState } from "react";
import { GuidedTour } from "./GuidedTour";

const links = [
  ["Curriculum", "/curriculum"],
  ["Explorer", "/lazy-evaluation"],
  ["Execution Flow", "/execution-flow"],
  ["Concept Lab", "/concept-lab"],
  ["Advanced", "/advanced"],
  ["Roadmap", "/roadmap"],
] as const;

export function Layout() {
  const [tourReplayToken, setTourReplayToken] = useState(0);

  return (
    <>
      <header className="topbar">
        <div data-tour="brand">
          <p className="eyebrow">Interactive Apache Spark</p>
          <h1><NavLink to="/">Spark Studio</NavLink></h1>
        </div>
        <nav aria-label="Site pages" data-tour="nav">
          {links.map(([label, to]) => <NavLink key={to} to={to}>{label}</NavLink>)}
          <button
            className="tour-launch"
            data-tour="tour-button"
            onClick={() => setTourReplayToken(current => current + 1)}
          >
            Tour
          </button>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      <GuidedTour replayToken={tourReplayToken} />
    </>
  );
}

export function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {children ? <p>{children}</p> : null}
    </div>
  );
}
