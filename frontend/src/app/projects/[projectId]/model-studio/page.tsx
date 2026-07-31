"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { fetchCapabilities, fetchProjectDatasets, fetchProjectRuns, trainModel } from "@/lib/api-client";
import { useState } from "react";
import { Cpu, Play, CheckCircle2, ArrowLeft, BarChart3, Target, Activity } from "lucide-react";
import Link from "next/link";

export default function ModelStudioPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const queryClient = useQueryClient();

  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [selectedModelFamily, setSelectedModelFamily] = useState<string>("random_forest");

  const { data: caps } = useQuery({ queryKey: ["capabilities"], queryFn: fetchCapabilities });
  const { data: datasets } = useQuery({ queryKey: ["datasets", projectId], queryFn: () => fetchProjectDatasets(projectId) });
  const { data: runs, isLoading: runsLoading } = useQuery({ queryKey: ["runs", projectId], queryFn: () => fetchProjectRuns(projectId) });

  const trainMutation = useMutation({
    mutationFn: () =>
      trainModel(projectId, {
        dataset_id: selectedDatasetId || (datasets?.[0]?.id ?? ""),
        model_family: selectedModelFamily,
        hyperparameters: { n_estimators: 100 },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["runs", projectId] });
    },
  });

  const latestRun = runs?.[0];
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
            <p className="text-xs text-[#8b95a7]">Train baseline estimators and extract per-sample error evaluations</p>
          </div>
        </div>

        <button
          onClick={() => trainMutation.mutate()}
          disabled={trainMutation.isPending || (!selectedDatasetId && !datasets?.length)}
          className="flex items-center space-x-2 px-4 py-2 bg-[#d4e157] text-[#0b0d13] text-xs font-semibold rounded-lg hover:bg-[#c0ca33] transition"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{trainMutation.isPending ? "Training Model..." : "Train Baseline Model"}</span>
        </button>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Config Sidebar */}
        <div className="citrus-card p-5 space-y-4">
          <h3 className="text-sm font-bold text-[#f0f4f8] border-b border-[#242a3e] pb-2">Training Configuration</h3>

          <div>
            <label className="block text-xs font-medium text-[#8b95a7] mb-1">Target Dataset</label>
            <select
              value={selectedDatasetId || (datasets?.[0]?.id ?? "")}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="w-full bg-[#181c2b] border border-[#242a3e] rounded-lg px-3 py-2 text-xs text-[#f0f4f8]"
            >
              {datasets?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.version})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8b95a7] mb-1">Model Family (Dynamic Backend Catalog)</label>
            <div className="space-y-2">
              {modelFamilies.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setSelectedModelFamily(m.id)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                    selectedModelFamily === m.id
                      ? "border-[#d4e157] bg-[#d4e157]/10 text-[#f0f4f8]"
                      : "border-[#242a3e] bg-[#181c2b] text-[#8b95a7] hover:text-[#f0f4f8]"
                  }`}
                >
                  <div className="font-semibold">{m.name}</div>
                  <div className="text-[10px] text-[#8b95a7] font-mono">ID: {m.id}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Results Overview */}
        <div className="md:col-span-2 space-y-4">
          {latestRun ? (
            <div className="citrus-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#242a3e] pb-3">
                <div>
                  <h3 className="text-base font-bold text-[#f0f4f8]">Latest Training Run Output</h3>
                  <p className="text-xs text-[#8b95a7] font-mono">Run ID: {latestRun.id}</p>
                </div>
                <span className="flex items-center space-x-1 text-xs text-[#66bb6a] bg-[#66bb6a]/10 px-2.5 py-1 rounded-full border border-[#66bb6a]/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Evaluation Ready</span>
                </span>
              </div>

              {/* Metrics Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-[#181c2b] rounded-lg border border-[#242a3e]">
                  <div className="text-[10px] text-[#8b95a7] flex items-center space-x-1">
                    <Target className="w-3 h-3 text-[#d4e157]" />
                    <span>Accuracy</span>
                  </div>
                  <div className="text-xl font-bold text-[#d4e157] mt-1">{((latestRun.metrics.accuracy ?? 0) * 100).toFixed(1)}%</div>
                </div>
                <div className="p-3 bg-[#181c2b] rounded-lg border border-[#242a3e]">
                  <div className="text-[10px] text-[#8b95a7] flex items-center space-x-1">
                    <BarChart3 className="w-3 h-3 text-[#4dd0e1]" />
                    <span>Weighted F1-Score</span>
                  </div>
                  <div className="text-xl font-bold text-[#4dd0e1] mt-1">{latestRun.metrics.f1_weighted ?? 0}</div>
                </div>
                <div className="p-3 bg-[#181c2b] rounded-lg border border-[#242a3e]">
                  <div className="text-[10px] text-[#8b95a7] flex items-center space-x-1">
                    <Activity className="w-3 h-3 text-[#ffb74d]" />
                    <span>Log Loss</span>
                  </div>
                  <div className="text-xl font-bold text-[#ffb74d] mt-1">{latestRun.metrics.log_loss ?? 0}</div>
                </div>
              </div>

              {/* Feature Importance Table */}
              {latestRun.metrics.feature_importances && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-semibold text-[#f0f4f8]">Feature Attribution & Importance</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(latestRun.metrics.feature_importances).map(([feat, score]) => (
                      <div key={feat} className="p-2 bg-[#181c2b] rounded border border-[#242a3e] flex items-center justify-between text-xs">
                        <span className="text-[#8b95a7] font-mono">{feat}</span>
                        <span className="font-bold text-[#d4e157]">{score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="citrus-card p-12 text-center space-y-3">
              <Cpu className="w-10 h-10 text-[#d4e157] mx-auto opacity-70" />
              <h3 className="text-sm font-bold text-[#f0f4f8]">No Model Runs Executed</h3>
              <p className="text-xs text-[#8b95a7]">Select a dataset version and model family to execute your first baseline training run.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
