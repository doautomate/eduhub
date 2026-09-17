import { Route, Routes } from "react-router-dom";
import { AppShell } from "../shared/components/AppShell/AppShell";
import { Dashboard } from "../pages/Dashboard";
import { Home } from "../pages/Home";
import { Login } from "../pages/Login";
import { MindMaps } from "../pages/MindMaps";
import { NotFound } from "../pages/NotFound";
import { Notes } from "../pages/Notes";
import { Profile } from "../pages/Profile";
import { ProfileSetup } from "../pages/ProfileSetup";
import { Register } from "../pages/Register";
import { SamplePapers } from "../pages/SamplePapers";
import { VerifyOtp } from "../pages/VerifyOtp";
import { RecoverAccount } from "../pages/RecoverAccount";
import { ProtectedRoute } from "./guards/ProtectedRoute";
import { RequireAcademicProfile } from "./guards/RequireAcademicProfile";

export function AppRoutes() {
  return (
    <AppShell>
      <Routes>
        {/* FR-008: "/" is the universal landing page - reachable by both
            authenticated and unauthenticated visitors, with content branching
            inside Home itself rather than redirecting away. */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/recover-account" element={<RecoverAccount />} />
        {/* Placeholder destinations for the header nav links; full
            experiences to be built out in later features. */}
        <Route path="/notes" element={<Notes />} />
        <Route path="/mind-maps" element={<MindMaps />} />
        <Route path="/sample-papers" element={<SamplePapers />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route
          path="/profile/setup"
          element={
            <ProtectedRoute>
              <RequireAcademicProfile>
                <ProfileSetup />
              </RequireAcademicProfile>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <RequireAcademicProfile>
                <Profile />
              </RequireAcademicProfile>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppShell>
  );
}

export default AppRoutes;

