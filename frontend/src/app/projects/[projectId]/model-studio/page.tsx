"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { fetchCapabilities, fetchProjectDatasets, fetchProjectRuns, trainModel } from "@/lib/api-client";
import { useState } from "react";
import { Cpu, Play, CheckCircle2, ArrowLeft, BarChart3, Target, Activity, AlertTriangle, Terminal } from "lucide-react";
import Link from "next/link";
import { ModelStudioResults } from "./results";
import { ModelStudioConfig } from "./config";

/** SSE log entry from backend streaming endpoint */
interface StreamLogEntry { step: string; message: string; progress: number }

export default function ModelStudioPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const queryClient = useQueryClient();

  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [selectedModelFamily, setSelectedModelFamily] = useState("random_forest");
  const [streamLogs, setStreamLogs] = useState<StreamLogEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTraining, setIsTraining] = useState(false);

  const { data: caps } = useQuery({ queryKey: ["capabilities"], queryFn: fetchCapabilities });
  const { data: datasets } = useQuery({ queryKey: ["datasets", projectId], queryFn: () => fetchProjectDatasets(projectId) });
  const { data: runs } = useQuery({ queryKey: ["runs", projectId], queryFn: () => fetchProjectRuns(projectId) });

  /** Opens SSE stream, resolves when all progress events received or stream errors */
  const waitForSSEStream = (): Promise<void> =>
    new Promise((resolve) => {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8741/api/v1";
      const es = new EventSource(`${apiBase}/projects/${projectId}/train/stream?model_family=${selectedModelFamily}`);
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as StreamLogEntry;
          setStreamLogs((prev) => [...prev, data]);
          if (data.progress === 100) { es.close(); resolve(); }
        } catch { es.close(); resolve(); }
      };
      es.onerror = () => { es.close(); resolve(); };
    });

  const trainMutation = useMutation({
    mutationFn: async () => {
      setIsTraining(true);
      setStreamLogs([]);
      setErrorMessage(null);
      // ponytail: SSE stream completes first so the UI progress feels sequential
      await waitForSSEStream();
      return trainModel(projectId, {
        dataset_id: selectedDatasetId || (datasets?.[0]?.id ?? ""),
        model_family: selectedModelFamily,
        hyperparameters: { n_estimators: 100 },
      });
    },
    onSuccess: () => {
      setIsTraining(false);
      queryClient.invalidateQueries({ queryKey: ["runs", projectId] });
    },
    onError: (err: Error) => {
      setIsTraining(false);
      setErrorMessage(err.message);
    },
  });

  const latestRun = isTraining ? null : runs?.[0] ?? null;
  const modelFamilies = caps?.capabilities?.model_families || [
    { id: "logistic_regression", name: "Logistic Regression" },
    { id: "random_forest", name: "Random Forest Classifier" },
    { id: "xgboost", name: "XGBoost Classifier" },
  ];

  return (
    <div className="min-h-screen flex flex-col p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#242a3e] pb-4">
        <div className="flex items-center space-x-3">
          <Link href={`/projects/${projectId}/datasets`} className="p-2 rounded-xl bg-[#181c2b] text-[#8b95a7] hover:text-[#f0f4f8] transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#f0f4f8] flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-[#d4e157]" />
              <span>Model Studio & Baseline Trainer</span>
            </h1>
            <p className="text-xs text-[#8b95a7]">Train baseline estimators with real-time SSE progress streaming</p>
          </div>
        </div>

        <button
          onClick={() => trainMutation.mutate()}
          disabled={trainMutation.isPending || (!selectedDatasetId && !datasets?.length)}
          className="flex items-center space-x-2 px-4 py-2 bg-[#d4e157] text-[#0b0d13] text-xs font-semibold rounded-lg hover:bg-[#c0ca33] transition disabled:opacity-50"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{trainMutation.isPending ? "Training Model..." : "Train Baseline Model"}</span>
        </button>
      </header>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-[#ef5350]/10 border border-[#ef5350]/30 text-[#ef5350] text-xs flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Estimator Unavailable</div>
            <div>{errorMessage}</div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ModelStudioConfig
          datasets={datasets ?? []}
          selectedDatasetId={selectedDatasetId}
          onSelectDataset={setSelectedDatasetId}
          modelFamilies={modelFamilies}
          selectedModelFamily={selectedModelFamily}
          onSelectModel={setSelectedModelFamily}
        />

        <div className="md:col-span-2 space-y-4">
          {/* Live SSE Stream Terminal */}
          {streamLogs.length > 0 && (
            <div className="citrus-card p-4 space-y-2 bg-[#0b0d13] border-[#242a3e]">
              <div className="flex items-center justify-between text-xs text-[#d4e157] font-mono border-b border-[#242a3e] pb-2">
                <span className="flex items-center space-x-2">
                  <Terminal className="w-4 h-4" />
                  <span>Real-Time SSE Training Progress Log</span>
                </span>
                <span>{streamLogs[streamLogs.length - 1]?.progress}%</span>
              </div>
              <div className="space-y-1 font-mono text-[11px] text-[#8b95a7] pt-1">
                {streamLogs.map((log, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <span className="text-[#4dd0e1]">[{log.step}]</span>
                    <span className="text-[#f0f4f8]">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <ModelStudioResults latestRun={latestRun} />
        </div>
      </div>
    </div>
  );
}
