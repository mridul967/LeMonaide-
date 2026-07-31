/**
 * Model Studio configuration sidebar — dataset selector and model family picker.
 */

import type { DatasetEntity } from "@/lib/api-client";

interface ModelFamily {
  id: string;
  name: string;
}

interface ModelStudioConfigProps {
  datasets: DatasetEntity[];
  selectedDatasetId: string;
  onSelectDataset: (id: string) => void;
  modelFamilies: ModelFamily[];
  selectedModelFamily: string;
  onSelectModel: (id: string) => void;
}

export function ModelStudioConfig({
  datasets,
  selectedDatasetId,
  onSelectDataset,
  modelFamilies,
  selectedModelFamily,
  onSelectModel,
}: ModelStudioConfigProps) {
  return (
    <div className="citrus-card p-5 space-y-4">
      <h3 className="text-sm font-bold text-[#f0f4f8] border-b border-[#242a3e] pb-2">Training Configuration</h3>

      <div>
        <label className="block text-xs font-medium text-[#8b95a7] mb-1">Target Dataset</label>
        <select
          value={selectedDatasetId || (datasets[0]?.id ?? "")}
          onChange={(e) => onSelectDataset(e.target.value)}
          className="w-full bg-[#181c2b] border border-[#242a3e] rounded-lg px-3 py-2 text-xs text-[#f0f4f8]"
        >
          {datasets.map((d) => (
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
              onClick={() => onSelectModel(m.id)}
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
  );
}
