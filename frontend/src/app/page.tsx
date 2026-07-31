"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCapabilities, fetchProjects, createProject } from "@/lib/api-client";
import { useState } from "react";
import Link from "next/link";
import { 
  FlaskConical, 
  GitCommit, 
  Scale, 
  ShieldCheck, 
  Network, 
  Plus, 
  CheckCircle2,
  FolderKanban,
  Database
} from "lucide-react";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [newProjectName, setNewProjectName] = useState("");
  const [showModal, setShowModal] = useState(false);

  const { data: caps, isLoading: capsLoading, isError: capsError } = useQuery({
    queryKey: ["capabilities"],
    queryFn: fetchCapabilities,
  });

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

  const createProjectMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setNewProjectName("");
      setShowModal(false);
    },
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    createProjectMutation.mutate({ name: newProjectName.trim(), task_type: "binary_classification" });
  };

  return (
    <div className="min-h-screen flex flex-col p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#242a3e] pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-[#d4e157]/10 text-[#d4e157] border border-[#d4e157]/20">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#f0f4f8]">
              🍋 LeMonaide <span className="text-[#8b95a7] text-sm font-normal">/ EvidenceOps Console</span>
            </h1>
            <p className="text-xs text-[#8b95a7]">Autonomous ML Failure Discovery & Controlled Evidence Graph</p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-[#d4e157] text-[#0b0d13] font-semibold text-sm rounded-lg hover:bg-[#c0ca33] transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </header>

      {/* Dynamic Capabilities Banner */}
      <section className="citrus-card p-4 flex flex-wrap items-center justify-between text-xs text-[#8b95a7]">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-[#66bb6a] animate-pulse"></span>
          <span>Status: <strong>Backend Online (Port 8741)</strong></span>
        </div>
        <div>
          Supported Models:{" "}
          <strong className="text-[#f0f4f8]">
            {capsLoading ? "Loading..." : capsError ? "Offline Mode" : caps?.capabilities?.model_families?.map(m => m.name).join(", ")}
          </strong>
        </div>
        <div>
          Task Type: <strong className="text-[#d4e157]">Binary / Multiclass Classification</strong>
        </div>
      </section>

      {/* 5-Pillar Evidence Loop Overview */}
      <section className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { icon: FlaskConical, title: "1. Failure Lab", desc: "Slice & anomaly discovery" },
          { icon: GitCommit, title: "2. Compiler", desc: "Frozen variable contract" },
          { icon: Scale, title: "3. Budget Planner", desc: "Utility-ranked runs" },
          { icon: ShieldCheck, title: "4. Reviewer", desc: "Adversarial seed testing" },
          { icon: Network, title: "5. Evidence Graph", desc: "Decision provenance tree" },
        ].map((pillar, idx) => (
          <div key={idx} className="citrus-card p-4 space-y-2">
            <pillar.icon className="w-5 h-5 text-[#d4e157]" />
            <h3 className="font-semibold text-sm text-[#f0f4f8]">{pillar.title}</h3>
            <p className="text-xs text-[#8b95a7]">{pillar.desc}</p>
          </div>
        ))}
      </section>

      {/* Projects List */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#f0f4f8] flex items-center space-x-2">
          <FolderKanban className="w-5 h-5 text-[#4dd0e1]" />
          <span>Active Research Workspaces</span>
        </h2>

        {projectsLoading ? (
          <div className="text-xs text-[#8b95a7]">Loading projects...</div>
        ) : projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}/datasets`} className="citrus-card-interactive p-4 space-y-2 block">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm text-[#f0f4f8] flex items-center space-x-2">
                    <Database className="w-4 h-4 text-[#4dd0e1]" />
                    <span>{p.name}</span>
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#4dd0e1]/10 text-[#4dd0e1]">
                    {p.task_type}
                  </span>
                </div>
                <p className="text-xs text-[#8b95a7] line-clamp-2">{p.description || "No description provided."}</p>
                <div className="flex items-center justify-between text-[10px] text-[#66bb6a] pt-2 border-t border-[#242a3e]">
                  <span className="flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Dataset Hub Active</span>
                  </span>
                  <span className="text-[#d4e157]">Open Workspace →</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="citrus-card p-8 text-center space-y-3">
            <p className="text-sm text-[#8b95a7]">No research projects found. Create your first project to begin.</p>
          </div>
        )}
      </section>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateProject} className="citrus-card p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-[#f0f4f8]">Create Research Project</h3>
            <div>
              <label className="block text-xs font-medium text-[#8b95a7] mb-1">Project Name</label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g. Credit Risk Failure Analysis"
                className="w-full bg-[#181c2b] border border-[#242a3e] rounded-lg px-3 py-2 text-sm text-[#f0f4f8] focus:outline-none focus:border-[#d4e157]"
                autoFocus
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs text-[#8b95a7] hover:text-[#f0f4f8]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createProjectMutation.isPending}
                className="px-4 py-2 bg-[#d4e157] text-[#0b0d13] font-semibold text-xs rounded-lg hover:bg-[#c0ca33]"
              >
                {createProjectMutation.isPending ? "Creating..." : "Create Workspace"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
