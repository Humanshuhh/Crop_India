import React, { useState, useEffect } from "react";
import {
  Leaf,
  Sparkles,
  Activity,
  Upload,
  AlertTriangle,
  Volume2,
  CheckCircle,
  Database,
  ArrowRight
} from "lucide-react";

const API_BASE = "http://127.0.0.1:8000";

export default function App() {
  const [activeTab, setActiveTab] = useState("diagnostics");
  const [backendHealth, setBackendHealth] = useState(null);

  // Diagnostics State
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagResult, setDiagResult] = useState(null);

  // Soil State
  const [soilLoading, setSoilLoading] = useState(false);
  const [soilResult, setSoilResult] = useState(null);
  const [soilForm, setSoilForm] = useState({
    farmer_id: "FARMER_101",
    organic_carbon_pct: 0.45,
    ph: 6.8,
    texture: "Sandy Clay Loam",
    current_crop: "Paddy (Rice)",
    target_language: "hi",
    zone: "Eastern Plateau & Hills"
  });

  // Check Backend Connectivity on Mount
  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((res) => res.json())
      .then((data) => setBackendHealth(data))
      .catch(() => setBackendHealth({ status: "offline" }));
  }, []);

  // Handle Diagnostic Image
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setDiagResult(null);
    }
  };

  const runDiagnostics = async () => {
    if (!selectedFile) return;
    setDiagLoading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("farmer_id", "FARMER_101");
    formData.append("target_language", "hi");

    try {
      const res = await fetch(`${API_BASE}/api/v1/diagnose`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setDiagResult(data);
    } catch (err) {
      alert("Error connecting to diagnostics service: " + err.message);
    } finally {
      setDiagLoading(false);
    }
  };

  // Handle Regenerative Soil Plan
  const runSoilPlan = async (e) => {
    e.preventDefault();
    setSoilLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/soil/regenerative-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(soilForm),
      });
      const data = await res.json();
      setSoilResult(data);
    } catch (err) {
      alert("Error generating soil plan: " + err.message);
    } finally {
      setSoilLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-50/40 text-slate-800 font-sans pb-12">
      {/* Top Header */}
      <header className="bg-emerald-800 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-700 p-2 rounded-lg">
              <Leaf className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">CropIndia: Kisan Sahayak</h1>
              <p className="text-xs text-emerald-200">Autonomous Agronomy & Early Warning System</p>
            </div>
          </div>

          {/* Backend Status Badge */}
          <div className="flex items-center space-x-2 text-xs bg-emerald-900/60 px-3 py-1.5 rounded-full border border-emerald-700">
            <span className={`w-2.5 h-2.5 rounded-full ${backendHealth?.status === "healthy" ? "bg-green-400" : "bg-amber-400"}`}></span>
            <span>
              {backendHealth?.status === "healthy" ? "Backend Online" : "Connecting Backend..."}
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 mt-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-emerald-200 mb-6 space-x-4">
          <button
            onClick={() => setActiveTab("diagnostics")}
            className={`pb-3 px-4 font-medium text-sm flex items-center space-x-2 border-b-2 transition ${activeTab === "diagnostics"
                ? "border-emerald-700 text-emerald-800 font-bold"
                : "border-transparent text-slate-500 hover:text-emerald-700"
              }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Leaf Diagnostics</span>
          </button>
          <button
            onClick={() => setActiveTab("soil")}
            className={`pb-3 px-4 font-medium text-sm flex items-center space-x-2 border-b-2 transition ${activeTab === "soil"
                ? "border-emerald-700 text-emerald-800 font-bold"
                : "border-transparent text-slate-500 hover:text-emerald-700"
              }`}
          >
            <Activity className="w-4 h-4" />
            <span>Regenerative Soil Health</span>
          </button>
        </div>

        {/* Tab 1: Leaf Diagnostics */}
        {activeTab === "diagnostics" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-emerald-100 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-2">Upload Infected Crop Leaf</h2>
              <p className="text-xs text-slate-500 mb-4">
                Multimodal vision analysis identifies symptoms and generates bio-remedies.
              </p>

              <label className="border-2 border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition">
                <Upload className="w-8 h-8 text-emerald-600 mb-2" />
                <span className="text-sm font-medium text-slate-600">Select an image (JPG/PNG)</span>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>

              {previewUrl && (
                <div className="mt-4">
                  <img src={previewUrl} alt="Crop sample" className="w-full h-48 object-cover rounded-lg border" />
                  <button
                    onClick={runDiagnostics}
                    disabled={diagLoading}
                    className="w-full mt-3 bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition disabled:opacity-50"
                  >
                    {diagLoading ? <span>Analyzing Leaf...</span> : <span>Run Diagnosis</span>}
                  </button>
                </div>
              )}
            </div>

            {/* Diagnostic Output */}
            <div className="bg-white p-6 rounded-xl border border-emerald-100 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-2">Diagnosis & Prescription</h2>
              {!diagResult && !diagLoading && (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                  Upload an image to review the agronomy advisory.
                </div>
              )}
              {diagLoading && (
                <div className="h-48 flex items-center justify-center text-emerald-600 text-sm">
                  Scanning image features...
                </div>
              )}
              {diagResult && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs text-slate-500">Predicted Condition:</span>
                    <span className="font-bold text-emerald-800">{diagResult.primary_diagnosis || "Healthy Plant"}</span>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                    <div className="flex items-center space-x-2 text-emerald-900 font-semibold text-xs mb-1">
                      <Volume2 className="w-4 h-4" />
                      <span>Audio Advisory (Hindi / Local):</span>
                    </div>
                    <p className="text-sm text-slate-700">{diagResult.vernacular_advisory || "पौधा स्वस्थ है।"}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Regenerative Soil Health */}
        {activeTab === "soil" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-emerald-100 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-2">Soil Health Card Parameters</h2>
              <form onSubmit={runSoilPlan} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-600">Organic Carbon (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={soilForm.organic_carbon_pct}
                    onChange={(e) => setSoilForm({ ...soilForm, organic_carbon_pct: parseFloat(e.target.value) })}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600">Soil pH</label>
                  <input
                    type="number"
                    step="0.1"
                    value={soilForm.ph}
                    onChange={(e) => setSoilForm({ ...soilForm, ph: parseFloat(e.target.value) })}
                    className="w-full border rounded-lg p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600">Current Crop</label>
                  <input
                    type="text"
                    value={soilForm.current_crop}
                    onChange={(e) => setSoilForm({ ...soilForm, current_crop: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={soilLoading}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2 rounded-lg transition"
                >
                  {soilLoading ? "Computing Biological Plan..." : "Generate Regenerative Plan"}
                </button>
              </form>
            </div>

            {/* Soil Output */}
            <div className="bg-white p-6 rounded-xl border border-emerald-100 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-2">Soil Prescription & Sync</h2>
              {!soilResult && !soilLoading && (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                  Fill in metrics and click calculate to view recommendations.
                </div>
              )}
              {soilResult && (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <span className="text-xs font-semibold text-emerald-900 block mb-1">Recommended Interventions:</span>
                    <p className="text-sm text-slate-700">
                      {JSON.stringify(soilResult.regenerative_plan || soilResult, null, 2)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-emerald-700">
                    <Database className="w-4 h-4" />
                    <span>Automatically logged to Firestore and synced to BigQuery.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}