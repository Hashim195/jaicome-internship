import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: DashboardComponent,
});

// Intentional warning on module load — missing config
const API_KEY = undefined;
if (!API_KEY) {
  console.warn("Missing API_KEY config value — some features may not work");
}

function DashboardComponent() {
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Broken button — triggers console.error
  function handleProcessPayment() {
    try {
      throw new Error("Payment gateway timeout: connection refused");
    } catch (err) {
      console.error("Payment processing failed:", err);
      setPaymentStatus("error");
    }
  }

  // Failed network request — fetches non-existent endpoint
  async function handleGenerateReport() {
    setReportStatus("loading");
    try {
      const res = await fetch("http://localhost:3000/api/reports/generate");
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
    } catch (err) {
      console.error("Report generation failed:", err);
      setReportStatus("error");
    }
  }

  // Another failed request — 500 error
  async function handleSyncData() {
    setSyncStatus("loading");
    try {
      const res = await fetch("http://localhost:3000/api/sync");
      if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
    } catch (err) {
      console.error("Data sync failed:", err);
      setSyncStatus("error");
    }
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Analytics Dashboard</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg border p-4">
          <p className="text-muted-foreground text-sm">Total Revenue</p>
          <p className="text-2xl font-bold mt-1">$48,295</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-muted-foreground text-sm">Active Users</p>
          <p className="text-2xl font-bold mt-1">1,204</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-muted-foreground text-sm">Open Tickets</p>
          <p className="text-2xl font-bold mt-1">7</p>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="rounded-lg border p-4">
          <h2 className="font-medium mb-3">Payment Processing</h2>
          <p className="text-muted-foreground text-sm mb-3">
            Process end-of-day payment batch
          </p>
          <button
            onClick={handleProcessPayment}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm hover:opacity-90"
          >
            Process Payments
          </button>
          {paymentStatus === "error" && (
            <p className="text-red-500 text-sm mt-2">
              Payment processing failed. Check console for details.
            </p>
          )}
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="font-medium mb-3">Reports</h2>
          <p className="text-muted-foreground text-sm mb-3">
            Generate monthly analytics report
          </p>
          <button
            onClick={handleGenerateReport}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm hover:opacity-90"
          >
            {reportStatus === "loading" ? "Generating..." : "Generate Report"}
          </button>
          {reportStatus === "error" && (
            <p className="text-red-500 text-sm mt-2">
              Report generation failed. Server returned an error.
            </p>
          )}
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="font-medium mb-3">Data Sync</h2>
          <p className="text-muted-foreground text-sm mb-3">
            Sync data with external CRM
          </p>
          <button
            onClick={handleSyncData}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm hover:opacity-90"
          >
            {syncStatus === "loading" ? "Syncing..." : "Sync Now"}
          </button>
          {syncStatus === "error" && (
            <p className="text-red-500 text-sm mt-2">
              Sync failed. Could not reach external service.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}