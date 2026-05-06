import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "@/pages/Landing";
import Login from "@/pages/auth/Login";
import DashboardHome from "@/pages/dashboard/Home";
import DocumentsPage from "@/pages/dashboard/Documents";
import AgentsPage from "@/pages/dashboard/Agents";
import AgentDetail from "@/pages/dashboard/AgentDetail";
import AgentPlayground from "@/pages/dashboard/AgentPlayground";
import ModelSettings from "@/pages/dashboard/ModelSettings";
import SkillsPage from "@/pages/dashboard/Skills";
import McpOverview from "@/pages/dashboard/McpOverview";
import RolesSettings from "@/pages/dashboard/settings/RolesSettings";
import UsersSettings from "@/pages/dashboard/settings/UsersSettings";
import ApiAccessSettings from "@/pages/dashboard/settings/ApiAccessSettings";
import ContactsPage from "@/pages/dashboard/Contacts";
import ContactListDetail from "@/pages/dashboard/ContactListDetail";
import SmtpSettings from "@/pages/dashboard/settings/SmtpSettings";
import WhatsappSettings from "@/pages/dashboard/settings/WhatsappSettings";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AuthLayout from "@/components/layout/AuthLayout";

export default function App() {
  return (
    <Routes>
      {/* Landing page */}
      <Route path="/" element={<Landing />} />

      {/* Auth routes */}
      <Route path="/auth" element={<AuthLayout />}>
        <Route path="login" element={<Login />} />
        <Route index element={<Navigate to="login" replace />} />
      </Route>

      {/* Dashboard routes (protected via DashboardLayout) */}
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<DashboardHome />} />
        {/* Placeholders for future routes */}
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="agents" element={<AgentsPage />} />
        <Route path="agents/new" element={<AgentDetail />} />
        <Route path="agents/:id/playground" element={<AgentPlayground />} />
        <Route path="agents/:id" element={<AgentDetail />} />
        <Route path="skills" element={<SkillsPage />} />
        <Route path="mcp" element={<McpOverview />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="contacts/:id" element={<ContactListDetail />} />
        <Route path="billing" element={<ComingSoon title="Facturación" />} />
        <Route path="settings" element={<ComingSoon title="Configuración" />} />
        <Route path="settings/models" element={<ModelSettings />} />
        <Route path="settings/api-access" element={<ApiAccessSettings />} />
        <Route path="settings/users" element={<UsersSettings />} />
        <Route path="settings/roles" element={<RolesSettings />} />
        <Route path="settings/smtp" element={<SmtpSettings />} />
        <Route path="settings/whatsapp" element={<WhatsappSettings />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="rounded-full border border-primary/30 bg-primary/10 p-6">
        <span className="text-5xl">🚧</span>
      </div>
      <h2 className="text-3xl font-bold text-foreground">{title}</h2>
      <p className="text-muted-foreground">Esta sección estará disponible próximamente.</p>
    </div>
  );
}
