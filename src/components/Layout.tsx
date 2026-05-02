import { NavLink, Outlet } from "react-router-dom";
import type { ReactNode } from "react";

const links = [
  ["Curriculum", "/curriculum"],
  ["Explorer", "/lazy-evaluation"],
  ["Execution Flow", "/execution-flow"],
  ["Concept Lab", "/concept-lab"],
  ["Advanced", "/advanced"],
  ["Roadmap", "/roadmap"],
] as const;

export function Layout() {
  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Interactive Apache Spark</p>
          <h1><NavLink to="/">Spark Studio</NavLink></h1>
        </div>
        <nav aria-label="Site pages">
          {links.map(([label, to]) => <NavLink key={to} to={to}>{label}</NavLink>)}
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
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
