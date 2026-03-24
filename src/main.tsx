import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const clearLegacySessions = () => {
  const oldProjectRef = 'rhpsuqmmrqebiodvajto';
  const newProjectRef = 'mzmpsolbsbugidugyaje';
  let legacyDataFound = false;

  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.includes(`sb-${oldProjectRef}`)) {
      console.warn(`[Migration] Clearing legacy Supabase data: ${key}`);
      localStorage.removeItem(key);
      legacyDataFound = true;
    }
  }

  if (legacyDataFound) {
    console.warn('[Migration] Forcing a fresh login state.');
    localStorage.removeItem(`sb-${newProjectRef}-auth-token`);
    window.location.reload();
  }
};

clearLegacySessions();

createRoot(document.getElementById("root")!).render(<App />);
