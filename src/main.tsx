import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useOutletContext } from "react-router-dom";
import Shell from "./Shell";
import AuthPage from "./pages/AuthPage";
import { BillingSkeleton, CreateSkeleton, DocsSkeleton, DownloadsSkeleton, HomeSkeleton, InstancesSkeleton, NotificationsSkeleton, SettingsSkeleton } from "./skeletons";
import "./global.css";

const HomePage = lazy(() => import("./pages/HomePage"));
const InstancesPage = lazy(() => import("./pages/InstancesPage"));
const CreatePage = lazy(() => import("./pages/CreatePage"));
const DownloadsPage = lazy(() => import("./pages/DownloadsPage"));
const DocsPage = lazy(() => import("./pages/DocsPage"));
const BillingPage = lazy(() => import("./pages/BillingPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ChimePage = lazy(() => import("./pages/ChimePage"));

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  location.reload();
});

function ProtectedRoute() {
  const context = useOutletContext();
  if (!localStorage.getItem("token")) {
    return <Navigate to="/signin" replace />;
  }
  return <Outlet context={context} />;
}

function AppLayout() {
  if (!localStorage.getItem("token")) {
    return (
      <>
        <header className="sticky top-0 z-[100] flex h-[60px] items-center gap-1 border-b border-border bg-header px-3">
          <Link to="/signin" className="px-2 font-semibold tracking-[-0.02em] hover:no-underline">
            Dashboard
          </Link>
          <Link to="/signin" className="btn-dark ml-auto hover:no-underline">
            Sign in
          </Link>
        </header>
        <Outlet />
      </>
    );
  }
  return <Shell />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Suspense fallback={<DownloadsSkeleton />}><DownloadsPage /></Suspense>} />
          <Route element={<ProtectedRoute />}>
            <Route path="dashboard" element={<Suspense fallback={<HomeSkeleton />}><HomePage /></Suspense>} />
            <Route path="instances" element={<Suspense fallback={<InstancesSkeleton />}><InstancesPage /></Suspense>} />
            <Route path="create" element={<Suspense fallback={<CreateSkeleton />}><CreatePage /></Suspense>} />
            <Route path="docs" element={<Suspense fallback={<DocsSkeleton />}><DocsPage /></Suspense>} />
            <Route path="billing" element={<Suspense fallback={<BillingSkeleton />}><BillingPage /></Suspense>} />
            <Route path="notifications" element={<Suspense fallback={<NotificationsSkeleton />}><NotificationsPage /></Suspense>} />
            <Route path="settings" element={<Suspense fallback={<SettingsSkeleton />}><SettingsPage /></Suspense>} />
            <Route path="chime" element={<Suspense fallback={null}><ChimePage /></Suspense>} />
          </Route>
        </Route>
        <Route path="signin" element={<AuthPage />} />
        <Route path="signup" element={<AuthPage signup />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
