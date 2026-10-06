import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import Baukasten from "./baukasten/Baukasten";
import Markieren from "./markieren/Markieren";

// Prototypen hängen bis zum Start als Anker an der Platzhalterseite.
function Wahl() {
  const [anker, setAnker] = useState(location.hash);
  useEffect(() => {
    const f = () => setAnker(location.hash);
    addEventListener("hashchange", f);
    return () => removeEventListener("hashchange", f);
  }, []);
  if (anker === "#baukasten") return <Baukasten />;
  if (anker === "#markieren") return <Markieren />;
  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Wahl />
  </StrictMode>,
);
