/**
 * Model Studio results card — metrics summary and feature importance table.
 * Renders nothing when latestRun is null (e.g. during training or after error).
 */

import type { RunEntity } from "@/lib/api-client";
import { CheckCircle2, Target, BarChart3, Activity, Cpu } from "lucide-react";

interface ModelStudioResultsProps {
  latestRun: RunEntity | null;
}

export function ModelStudioResults({ latestRun }: ModelStudioResultsProps) {
  if (!latestRun) {
    return (
      <div className="citrus-card p-12 text-center space-y-3">
        <Cpu className="w-10 h-10 text-[#d4e157] mx-auto opacity-70" />
        <h3 className="text-sm font-bold text-[#f0f4f8]">No Model Runs Executed</h3>
        <p className="text-xs text-[#8b95a7]">Select a dataset version and model family to execute your first baseline training run.</p>
      </div>
    );
  }

  return (
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
        <MetricCard icon={<Target className="w-3 h-3 text-[#d4e157]" />} label="Accuracy" value={`${((latestRun.metrics.accuracy ?? 0) * 100).toFixed(1)}%`} color="text-[#d4e157]" />
        <MetricCard icon={<BarChart3 className="w-3 h-3 text-[#4dd0e1]" />} label="Weighted F1-Score" value={String(latestRun.metrics.f1_weighted ?? 0)} color="text-[#4dd0e1]" />
        <MetricCard icon={<Activity className="w-3 h-3 text-[#ffb74d]" />} label="Log Loss" value={String(latestRun.metrics.log_loss ?? 0)} color="text-[#ffb74d]" />
      </div>

      {/* Feature Importance */}
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
  );
}

/** Reusable metric card inside the results panel */
function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="p-3 bg-[#181c2b] rounded-lg border border-[#242a3e]">
      <div className="text-[10px] text-[#8b95a7] flex items-center space-x-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`text-xl font-bold ${color} mt-1`}>{value}</div>
    </div>
  );
}
