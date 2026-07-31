"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { fetchProjectDatasets, seedDemoDataset, uploadDataset } from "@/lib/api-client";
import { useState, useRef } from "react";
import { Database, Upload, Sparkles, FileSpreadsheet, CheckCircle2, ArrowLeft, Cpu } from "lucide-react";
import Link from "next/link";

export default function DatasetsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);

  const { data: datasets, isLoading } = useQuery({
    queryKey: ["datasets", projectId],
    queryFn: () => fetchProjectDatasets(projectId),
  });

  const seedMutation = useMutation({
    mutationFn: () => seedDemoDataset(projectId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["datasets", projectId] });
      setSelectedDatasetId(data.id);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadDataset(projectId, file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["datasets", projectId] });
      setSelectedDatasetId(data.id);
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
  };

  const currentDataset = datasets?.find((d) => d.id === (selectedDatasetId || datasets[0]?.id));

  return (
    <div className="min-h-screen flex flex-col p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#242a3e] pb-4">
        <div className="flex items-center space-x-3">
          <Link href="/" className="p-2 rounded-xl bg-[#181c2b] text-[#8b95a7] hover:text-[#f0f4f8] transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#f0f4f8] flex items-center space-x-2">
              <Database className="w-5 h-5 text-[#4dd0e1]" />
              <span>Dataset Hub & Quality Profiler</span>
            </h1>
            <p className="text-xs text-[#8b95a7]">Ingest, fingerprint (SHA-256), and profile research datasets</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href={`/projects/${projectId}/model-studio`}
            className="flex items-center space-x-1 px-3 py-2 bg-[#181c2b] border border-[#242a3e] text-[#f0f4f8] text-xs font-semibold rounded-lg hover:border-[#d4e157] transition"
          >
            <Cpu className="w-4 h-4 text-[#d4e157]" />
            <span>Model Studio →</span>
          </Link>
          <button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="flex items-center space-x-2 px-3 py-2 bg-[#d4e157]/10 border border-[#d4e157]/30 text-[#d4e157] text-xs font-semibold rounded-lg hover:bg-[#d4e157]/20 transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>{seedMutation.isPending ? "Generating..." : "Seed Dataset"}</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="flex items-center space-x-2 px-3 py-2 bg-[#d4e157] text-[#0b0d13] text-xs font-semibold rounded-lg hover:bg-[#c0ca33] transition"
          >
            <Upload className="w-4 h-4" />
            <span>{uploadMutation.isPending ? "Uploading..." : "Upload File"}</span>
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,.parquet" onChange={handleFileUpload} className="hidden" />
        </div>
      </header>

      {/* Main Content */}
      {isLoading ? (
        <div className="text-xs text-[#8b95a7]">Loading datasets...</div>
      ) : datasets && datasets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#8b95a7] uppercase tracking-wider">Project Datasets</h3>
            {datasets.map((d) => (
              <div
                key={d.id}
                onClick={() => setSelectedDatasetId(d.id)}
                className={`citrus-card p-4 cursor-pointer transition ${
                  currentDataset?.id === d.id ? "border-[#d4e157] bg-[#d4e157]/5" : "hover:border-[#242a3e]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm text-[#f0f4f8] truncate">{d.name}</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#242a3e] text-[#d4e157]">{d.version}</span>
                </div>
                <div className="text-[10px] text-[#8b95a7] mt-2 font-mono truncate">SHA256: {d.checksum.slice(0, 16)}...</div>
              </div>
            ))}
          </div>

          {currentDataset && (
            <div className="md:col-span-2 space-y-4">
              <div className="citrus-card p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#242a3e] pb-3">
                  <div>
                    <h2 className="text-base font-bold text-[#f0f4f8]">{currentDataset.name}</h2>
                    <p className="text-xs text-[#8b95a7] font-mono">{currentDataset.file_path}</p>
                  </div>
                  <span className="flex items-center space-x-1 text-xs text-[#66bb6a] bg-[#66bb6a]/10 px-2.5 py-1 rounded-full border border-[#66bb6a]/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Profile Verified</span>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-[#181c2b] rounded-lg border border-[#242a3e]">
                    <div className="text-[10px] text-[#8b95a7]">Total Samples (Rows)</div>
                    <div className="text-lg font-bold text-[#d4e157]">{currentDataset.profile_summary?.total_rows ?? 0}</div>
                  </div>
                  <div className="p-3 bg-[#181c2b] rounded-lg border border-[#242a3e]">
                    <div className="text-[10px] text-[#8b95a7]">Total Features (Cols)</div>
                    <div className="text-lg font-bold text-[#4dd0e1]">{currentDataset.profile_summary?.total_columns ?? 0}</div>
                  </div>
                  <div className="p-3 bg-[#181c2b] rounded-lg border border-[#242a3e]">
                    <div className="text-[10px] text-[#8b95a7]">Target Class Balance</div>
                    <div className="text-xs font-semibold text-[#f0f4f8] mt-1">
                      {currentDataset.profile_summary?.target_distribution
                        ? Object.entries(currentDataset.profile_summary.target_distribution)
                            .map(([k, v]) => `Class ${k}: ${v}`)
                            .join(" | ")
                        : "N/A"}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-[#f0f4f8]">Schema & Feature Summary</h4>
                  <div className="overflow-x-auto border border-[#242a3e] rounded-lg max-h-60">
                    <table className="w-full text-left text-xs text-[#8b95a7]">
                      <thead className="bg-[#181c2b] text-[#f0f4f8] border-b border-[#242a3e] sticky top-0">
                        <tr>
                          <th className="p-2.5">Feature Name</th>
                          <th className="p-2.5">Data Type</th>
                          <th className="p-2.5">Missing %</th>
                          <th className="p-2.5">Summary Stats</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#242a3e]">
                        {currentDataset.profile_summary?.columns.map((c) => (
                          <tr key={c.name} className="hover:bg-[#181c2b]/50">
                            <td className="p-2.5 font-medium text-[#f0f4f8]">{c.name}</td>
                            <td className="p-2.5 font-mono text-[11px]">{c.dtype}</td>
                            <td className="p-2.5">{c.missing_pct}%</td>
                            <td className="p-2.5 font-mono text-[10px]">
                              {c.numeric_stats
                                ? `Mean: ${c.numeric_stats.mean} | Min: ${c.numeric_stats.min} | Max: ${c.numeric_stats.max}`
                                : c.top_categories
                                ? JSON.stringify(c.top_categories)
                                : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="citrus-card p-12 text-center space-y-4 max-w-md mx-auto">
          <FileSpreadsheet className="w-12 h-12 text-[#d4e157] mx-auto opacity-80" />
          <h3 className="text-base font-bold text-[#f0f4f8]">No Datasets Ingested Yet</h3>
          <p className="text-xs text-[#8b95a7]">Generate the Failure Lab demo dataset to test model training and weak slice discovery.</p>
          <button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="px-4 py-2 bg-[#d4e157] text-[#0b0d13] text-xs font-semibold rounded-lg hover:bg-[#c0ca33]"
          >
            {seedMutation.isPending ? "Generating..." : "Generate Demo Dataset"}
          </button>
        </div>
      )}
    </div>
  );
}
