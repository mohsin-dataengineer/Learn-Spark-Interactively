import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { CurriculumPage } from "./pages/CurriculumPage";
import { LazyEvaluationPage } from "./pages/LazyEvaluationPage";
import { ExecutionFlowPage } from "./pages/ExecutionFlowPage";
import { ConceptLabPage } from "./pages/ConceptLabPage";
import { AdvancedPage } from "./pages/AdvancedPage";
import { RoadmapPage } from "./pages/RoadmapPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="curriculum" element={<CurriculumPage />} />
        <Route path="lazy-evaluation" element={<LazyEvaluationPage />} />
        <Route path="execution-flow" element={<ExecutionFlowPage />} />
        <Route path="concept-lab" element={<ConceptLabPage />} />
        <Route path="advanced" element={<AdvancedPage />} />
        <Route path="roadmap" element={<RoadmapPage />} />
      </Route>
    </Routes>
  );
}
