import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext.jsx';
import { SidebarProvider } from './contexts/SidebarContext';
import { ToastContainer } from 'react-toastify';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import CreateProject from './pages/CreateProject';
import EditProject from './pages/EditProject';
import AssignEmployees from './pages/AssignEmployees';
import DailyStatus from './pages/DailyStatus';
import ReviewStatus from './pages/ReviewStatus';
import ReviewCompletions from './pages/ReviewCompletions';
import ReviewActionPlans from './pages/ReviewActionPlans';
import EmployeePendingApprovals from './pages/EmployeePendingApprovals';
import EmployeeDelayedProjects from './pages/EmployeeDelayedProjects';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports';
import ProtectedRoute from './components/ProtectedRoute';
import SubmitStatus from './pages/SubmitStatus.jsx';
import Profile from './pages/Profile.jsx';
import ActionPlans from './pages/ActionPlans.jsx';
import SupervisorReset from './pages/SupervisorReset.jsx';
import SupervisorLogin from './pages/SupervisorLogin.jsx';
import SupervisorProtectedRoute from './components/SupervisorProtectedRoute.jsx';
import AssignedProjects from './pages/AssignedProjects';
import ActionPlanDetails from './pages/ActionPlanDetails';
import ProjectDiscussion from './pages/ProjectDiscussion';

// Move the AppContent component outside of the main App component to ensure proper context access
const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center transition-colors duration-200">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const ThemedApp = () => {
    const { getToastTheme } = useTheme();

    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
        <ToastContainer
          position="top-right"
          autoClose={1000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme={getToastTheme()}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/supervisor/login" element={<SupervisorLogin />} />
          <Route path="/supervisor/reset" element={<SupervisorProtectedRoute><SupervisorReset /></SupervisorProtectedRoute>} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/create" element={<CreateProject />} />
            <Route path="/projects/:id" element={<ProjectDetails />} />
            <Route path="/projects/:id/edit" element={<EditProject />} />
            <Route path="/projects/:id/assign" element={<AssignEmployees />} />
            <Route path="/projects/:id/discussion" element={<ProjectDiscussion />} />
            <Route path="/projects/:id/status" element={<DailyStatus />} />
            <Route path="/projects/:id/submit-status" element={<SubmitStatus />} />
            <Route path="/projects/assigned" element={<AssignedProjects />} />
            <Route path="/statuses/review" element={<ReviewStatus />} />
            <Route path="/projects/review" element={<ReviewCompletions />} />
            <Route path="/action-plans/review" element={<ReviewActionPlans />} />
            <Route path="/employee/pending-approvals" element={<EmployeePendingApprovals />} />
            <Route path="/employee/delayed-projects" element={<EmployeeDelayedProjects />} />
            <Route path="/employee/action-plans" element={<ActionPlans />} />
            <Route path="/employee/action-plans/:status" element={<ActionPlans />} />
            <Route path="/action-plans/:id" element={<ActionPlanDetails />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/reports" element={<Reports />} />
          </Route>
        </Routes>
      </div>
    );
  };

  return (
    <ThemeProvider>
      <SidebarProvider>
        <ThemedApp />
      </SidebarProvider>
    </ThemeProvider>
  );
};

function App() {
  return <AppContent />;
}

export default App;