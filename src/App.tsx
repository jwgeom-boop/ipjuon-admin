import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import AdminLayout from "./components/AdminLayout";
import Dashboard from "./pages/Dashboard";
import ConsultationDashboard from "./pages/ConsultationDashboard";
import VendorManagement from "./pages/VendorManagement";
import Notices from "./pages/Notices";
import BankDashboard from "./pages/BankDashboard";
import BankRequestDoc from "./pages/BankRequestDoc";
import BankSettlement from "./pages/BankSettlement";
import InviteLogs from "./pages/InviteLogs";
import ComplexTemplates from "./pages/ComplexTemplates";
import BankProfileEdit from "./v4/pages/BankProfileEdit";
import NotFound from "./pages/NotFound";
import V4Home from "./v4/pages/Home";
import HomeInbox from "./v4/pages/HomeInbox";
import TeamDashboard from "./v4/pages/TeamDashboard";
import ExecutionWizard from "./v4/pages/ExecutionWizard";
import SigningWizard from "./v4/pages/SigningWizard";
import ConsultationWizard from "./v4/pages/ConsultationWizard";
import ReservationWizard from "./v4/pages/ReservationWizard";
import ChangePassword from "./v4/pages/ChangePassword";
import { V4Layout } from "./v4/layout/V4Layout";
import { RouteTitle } from "./components/RouteTitle";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <RouteTitle />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/bank" element={<BankDashboard />} />
            <Route path="/bank/request/:kind" element={<BankRequestDoc />} />
            <Route path="/bank/settlement/:id" element={<BankSettlement />} />
            <Route element={<V4Layout />}>
              <Route path="/v4" element={<HomeInbox />} />
              <Route path="/v4/team" element={<TeamDashboard />} />
              <Route path="/v4/change-password" element={<ChangePassword />} />
              <Route path="/v4/legacy" element={<V4Home />} />
              <Route path="/v4/wizard/execution/:id" element={<ExecutionWizard />} />
              <Route path="/v4/wizard/signing/:id" element={<SigningWizard />} />
              <Route path="/v4/wizard/reservation/:id" element={<ReservationWizard />} />
              <Route path="/v4/wizard/consultation/:id" element={<ConsultationWizard />} />
              <Route path="/v4/complex-templates" element={<ComplexTemplates />} />
              <Route path="/v4/bank-profile" element={<BankProfileEdit />} />
            </Route>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route element={<AdminLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/consultation" element={<ConsultationDashboard />} />
              <Route path="/vendors" element={<VendorManagement />} />
              <Route path="/notices" element={<Notices />} />
              <Route path="/invites" element={<InviteLogs />} />
              <Route path="/admin/complex-templates" element={<ComplexTemplates />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
