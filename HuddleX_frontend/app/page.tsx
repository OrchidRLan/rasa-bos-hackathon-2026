import ExpertsLibrary from "@/components/dashboard/ExpertsLibrary";
import VoiceCenter from "@/components/dashboard/VoiceCenter";
import UserInfoPanel from "@/components/dashboard/UserInfoPanel";
import TasksPanel from "@/components/dashboard/TasksPanel";
import ChatPreview, { BottomNav } from "@/components/dashboard/ChatPreview";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F4F6FA] flex flex-col">
      <header className="shrink-0 border-b border-slate-200/80 bg-white/80 backdrop-blur px-6 py-4">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">HuddleX</h1>
            <p className="text-sm text-slate-500">Persistent Autonomous Voice Agent</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Always-on coworker active
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1440px] w-full mx-auto p-4 lg:p-6 pb-24 lg:pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full min-h-[calc(100vh-120px)]">
        <div className="lg:col-span-5 min-h-[500px] lg:min-h-0 rounded-2xl border border-slate-200/80 bg-white shadow-sm p-5 lg:p-6">
            <VoiceCenter />
          </div>
          <aside className="lg:col-span-3 min-h-[400px] lg:min-h-0">
            
            <ExpertsLibrary />
          
          </aside>

          

          <aside className="lg:col-span-4 min-h-0 flex flex-col">
            <UserInfoPanel />
            <TasksPanel />
            <ChatPreview />
          </aside>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
