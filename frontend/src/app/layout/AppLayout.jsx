import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { ToastContainer } from "../../components/ui/Toast";

function AppLayout({ children }) {
  return (
    <div className="h-screen bg-slate-900 flex overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Topbar />

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
        <ToastContainer />
      </div>
    </div>
  );
}

export default AppLayout;