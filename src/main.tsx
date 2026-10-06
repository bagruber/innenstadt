import { StrictMode, Suspense, lazy, useEffect, useState, type ComponentType, type LazyExoticComponent } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Prototypen hängen bis zum Start als Anker an der Platzhalterseite. Jede
// Station wird erst geladen, wenn man sie öffnet: Die Kartendaten der Altstadt
// braucht die Übersicht nicht.
const SEITEN: Record<string, LazyExoticComponent<ComponentType>> = {
  "#start": lazy(() => import("./Start")),
  "#baukasten": lazy(() => import("./baukasten/Baukasten")),
  "#markieren": lazy(() => import("./markieren/Markieren")),
  "#pins": lazy(() => import("./pins/Pins")),
  "#strassen": lazy(() => import("./strassen/Strassen")),
  "#swipe": lazy(() => import("./swipe/Swipe")),
  "#laerm": lazy(() => import("./laerm/Laerm")),
  "#anreise": lazy(() => import("./anreise/Anreise")),
  "#kalender": lazy(() => import("./kalender/Kalender")),
  "#bild": lazy(() => import("./bild/Bild")),
  "#abgeschaut": lazy(() => import("./abgeschaut/Abgeschaut")),
};

function Wahl() {
  const [anker, setAnker] = useState(location.hash);
  useEffect(() => {
    const f = () => { setAnker(location.hash); scrollTo(0, 0); };
    addEventListener("hashchange", f);
    return () => removeEventListener("hashchange", f);
  }, []);
  const Seite = SEITEN[anker];
  if (!Seite) return <App />;
  return (
    <Suspense fallback={<div className="min-h-dvh bg-cream" />}>
      <Seite key={anker} />
    </Suspense>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Wahl />
  </StrictMode>,
);
