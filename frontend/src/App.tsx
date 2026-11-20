
import { useEffect, useState } from "react";

function App() {
  const [status, setStatus] = useState("Checking API...");

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/health", {
      signal: controller.signal
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("API request failed");
        }

        return response.json();
      })
      .then(() => {
        if (!controller.signal.aborted) {
          setStatus("Connected to backend");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setStatus("Backend unavailable");
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <main style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>Lead Manager</h1>
      <p>Full-stack CRM application</p>

      <h2>API Connection</h2>
      <p>{status}</p>
    </main>
  );
}

export default App;
