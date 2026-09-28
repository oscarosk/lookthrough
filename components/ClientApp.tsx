"use client";
import dynamic from "next/dynamic";

// Holdings live in localStorage, so the dashboard renders in the browser only.
const Dashboard = dynamic(() => import("./Dashboard"), {
  ssr: false,
  loading: () => (
    <main>
      <p className="muted" style={{ paddingTop: 48 }}>Loading Lookthrough…</p>
    </main>
  ),
});

export default function ClientApp() {
  return <Dashboard />;
}
