import React, { useEffect, useState, useCallback, memo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';
import ProjectFilters from '../components/ProjectFilters';
import {
  FolderOpen,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  TrendingUp,
  Calendar,
  AlertTriangle
} from 'lucide-react';

// Create a separate component for the welcome text with typing effect
const WelcomeText = memo(({ userName }) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const fullText = `Welcome back, ${userName || 'User'}!`;

  useEffect(() => {
    if (currentIndex < fullText.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + fullText[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 100); // Slowed down typing speed from 50ms to 100ms

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, fullText]);

  return (
    <>
      {displayText}
      <span className="animate-pulse">|</span>
    </>
  );
});

WelcomeText.displayName = 'WelcomeText';

// Memoize DashboardCard to prevent unnecessary re-renders
const DashboardCard = memo(({ title, value, icon: Icon, color, link }) => (
  <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 transition-colors duration-200">
    <div className="p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <Icon className={`h-8 w-8 ${color} dark:${color.replace('600', '400')}`} />
        </div>
        <div className="ml-5 flex-1 min-w-0">
          <dl>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {title}
            </dt>
            <dd className="text-3xl font-bold text-gray-900 dark:text-white">{value}</dd>
          </dl>
        </div>
      </div>
      {link && (
        <div className="mt-4">
          <Link
            to={link}
            className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 transition-colors duration-200"
            aria-label={`View all ${title.toLowerCase()}`}
          >
            View all →
          </Link>
        </div>
      )}
    </div>
  </div>
));

DashboardCard.displayName = 'DashboardCard';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    pendingApprovalProjects: 0,
    delayedProjects: 0,
    totalEmployees: 0,
    approvedStatuses: 0,
    rejectedStatuses: 0,
    pendingCompletions: 0,
    employeePendingApprovals: 0,
    employeeDelayedProjects: 0,
    employeeApprovedActionPlans: 0,
    employeePendingActionPlans: 0,
    employeeRejectedActionPlans: 0,
    employeeTotalActionPlans: 0
  });
  const [recentStatuses, setRecentStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeFilters, setActiveFilters] = useState(null);
  const [isFiltered, setIsFiltered] = useState(false);

  // Memoize loadDashboardData to prevent re-creation on every render
  const loadDashboardData = useCallback(async (filters = null) => {
    try {
      setLoading(true);
      setError(null);

      // For admin with filters, use the filtered stats endpoint
      if (user?.role === 'admin' && filters && filters.department !== 'all') {
        // Build query params - using 'department' to match backend expectation
        const params = new URLSearchParams();
        if (filters.department && filters.department !== 'all') {
          params.append('department', filters.department);
        }

        const statsResponse = await api.get(`/projects/stats/filtered?${params.toString()}`);

        // Get total employees count for admin
        let totalEmployeesCount = 0;
        try {
          const totalEmployeesResponse = await api.get('/users/total');
          totalEmployeesCount = totalEmployeesResponse.data?.total || 0;
        } catch (error) {
          console.warn('Failed to load total employees count:', error.message);
        }

        // Set stats directly from filtered response
        setStats({
          totalProjects: statsResponse.data.totalProjects || 0,
          activeProjects: statsResponse.data.activeProjects || 0,
          completedProjects: statsResponse.data.completedProjects || 0,
          pendingApprovalProjects: statsResponse.data.pendingApprovalProjects || 0,
          delayedProjects: statsResponse.data.delayedProjects || 0,
          totalEmployees: totalEmployeesCount,
          approvedStatuses: 0,
          rejectedStatuses: 0,
          pendingCompletions: statsResponse.data.pendingApprovalProjects || 0,
          employeePendingApprovals: 0,
          employeeDelayedProjects: 0,
          employeeApprovedActionPlans: 0,
          employeePendingActionPlans: 0,
          employeeRejectedActionPlans: 0,
          employeeTotalActionPlans: 0
        });

        setLoading(false);
        return; // Exit early for filtered admin view
      }

      const projectsResponse = await api.get('/projects');
      // Ensure projects is always an array
      const projects = Array.isArray(projectsResponse.data) ? projectsResponse.data : [];

      let notifications = { recentStatuses: [] };
      let pendingCompletionsCount = 0;
      let delayedProjectsCount = 0;
      let employeePendingApprovalsCount = 0;
      let employeeDelayedProjectsCount = 0;
      let employeeApprovedActionPlansCount = 0;
      let employeePendingActionPlansCount = 0;
      let employeeRejectedActionPlansCount = 0;
      let employeeTotalActionPlansCount = 0;
      let totalEmployeesCount = 0;

      if (user?.role !== 'employee') {
        try {
          // Use team updates for recent statuses (limited to 10)
          const teamUpdatesResponse = await api.get('/statuses/team-updates');
          // Show ALL statuses (no filtering)
          const allStatuses = Array.isArray(teamUpdatesResponse.data) ? teamUpdatesResponse.data : [];
          notifications.recentStatuses = allStatuses.slice(0, 10);

          // Fetch pending approval projects count
          pendingCompletionsCount = projects.filter(p => p.status === 'pending_approval').length;

          // Fetch delayed projects count (projects with delayed status)
          delayedProjectsCount = projects.filter(p => p.status === 'delayed').length;

          // Fetch total employees count for admin
          if (user?.role === 'admin') {
            try {
              const totalEmployeesResponse = await api.get('/users/total');
              totalEmployeesCount = totalEmployeesResponse.data?.total || 0;
            } catch (error) {
              console.warn('Failed to load total employees count:', error.message);
              totalEmployeesCount = 0;
            }
          }
        } catch (notifError) {
          console.warn('Failed to load notifications:', notifError.message);
        }
      } else {
        // For employees, fetch their pending approvals and delayed projects
        try {
          // Get employee's pending approval projects (project completions only)
          const pendingApprovalsResponse = await api.get('/projects/employee/pending-approvals');
          // Ensure we're getting the data correctly
          let pendingApprovalsData = [];
          if (pendingApprovalsResponse.data) {
            if (pendingApprovalsResponse.data.data) {
              pendingApprovalsData = Array.isArray(pendingApprovalsResponse.data.data)
                ? pendingApprovalsResponse.data.data
                : [pendingApprovalsResponse.data.data];
            } else if (Array.isArray(pendingApprovalsResponse.data)) {
              pendingApprovalsData = pendingApprovalsResponse.data;
            } else {
              pendingApprovalsData = [pendingApprovalsResponse.data];
            }
          }
          employeePendingApprovalsCount = pendingApprovalsData.length || 0;

          // Get employee's delayed projects
          const delayedProjectsResponse = await api.get('/projects/employee/delayed');
          // Ensure we're getting the data correctly for delayed projects
          let delayedProjectsData = [];
          if (delayedProjectsResponse.data) {
            if (delayedProjectsResponse.data.data) {
              delayedProjectsData = Array.isArray(delayedProjectsResponse.data.data)
                ? delayedProjectsResponse.data.data
                : [delayedProjectsResponse.data.data];
            } else if (Array.isArray(delayedProjectsResponse.data)) {
              delayedProjectsData = delayedProjectsResponse.data;
            } else {
              delayedProjectsData = [delayedProjectsResponse.data];
            }
          }
          employeeDelayedProjectsCount = delayedProjectsData.length || 0;

          // Get employee's approved action plans
          const approvedActionPlansResponse = await api.get('/projects/employee/approved-action-plans');
          let approvedActionPlansData = [];
          if (approvedActionPlansResponse.data) {
            if (approvedActionPlansResponse.data.data) {
              approvedActionPlansData = Array.isArray(approvedActionPlansResponse.data.data)
                ? approvedActionPlansResponse.data.data
                : [approvedActionPlansResponse.data.data];
            } else if (Array.isArray(approvedActionPlansResponse.data)) {
              approvedActionPlansData = approvedActionPlansResponse.data;
            } else {
              approvedActionPlansData = [approvedActionPlansResponse.data];
            }
          }
          employeeApprovedActionPlansCount = approvedActionPlansData.length || 0;

          // Get employee's pending action plans
          const pendingActionPlansResponse = await api.get('/projects/employee/pending-action-plans');
          let pendingActionPlansData = [];
          if (pendingActionPlansResponse.data) {
            if (pendingActionPlansResponse.data.data) {
              pendingActionPlansData = Array.isArray(pendingActionPlansResponse.data.data)
                ? pendingActionPlansResponse.data.data
                : [pendingActionPlansResponse.data.data];
            } else if (Array.isArray(pendingActionPlansResponse.data)) {
              pendingActionPlansData = pendingActionPlansResponse.data;
            } else {
              pendingActionPlansData = [pendingActionPlansResponse.data];
            }
          }
          employeePendingActionPlansCount = pendingActionPlansData.length || 0;

          // Get employee's rejected action plans
          const rejectedActionPlansResponse = await api.get('/projects/employee/rejected-action-plans');
          console.log('Rejected action plans response:', rejectedActionPlansResponse); // Debug log
          let rejectedActionPlansData = [];
          if (rejectedActionPlansResponse.data) {
            // Check if the response has a data property with an array
            if (rejectedActionPlansResponse.data.data && Array.isArray(rejectedActionPlansResponse.data.data)) {
              rejectedActionPlansData = rejectedActionPlansResponse.data.data;
            }
            // Check if the response itself is an array
            else if (Array.isArray(rejectedActionPlansResponse.data)) {
              rejectedActionPlansData = rejectedActionPlansResponse.data;
            }
            // Check if the response is a single object
            else if (typeof rejectedActionPlansResponse.data === 'object' && rejectedActionPlansResponse.data !== null) {
              rejectedActionPlansData = [rejectedActionPlansResponse.data];
            }
          }
          employeeRejectedActionPlansCount = rejectedActionPlansData.length || 0;
          console.log('Rejected action plans count:', employeeRejectedActionPlansCount); // Debug log

          // Get employee's total action plans
          const totalActionPlansResponse = await api.get('/projects/employee/total-action-plans');
          employeeTotalActionPlansCount = totalActionPlansResponse.data?.count || 0;
        } catch (error) {
          console.warn('Failed to load employee specific data:', error.message);
        }
      }

      // Calculate delayed projects based on end date
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const activeProjects = projects.filter((p) => {
        if (p.status === 'active') {
          const endDate = new Date(p.end_date);
          endDate.setHours(0, 0, 0, 0);
          return endDate >= today;
        }
        return false;
      }).length;

      const completedProjects = projects.filter((p) => p.status === 'completed').length;

      // For managers/admins, ensure we're correctly counting pending approval projects
      const pendingApprovalProjects = user?.role !== 'employee'
        ? projects.filter((p) => p.status === 'pending_approval').length
        : 0;

      // Calculate delayed projects - projects past end date or with delayed status
      const calculatedDelayedProjects = projects.filter((p) => {
        if (p.status === 'delayed') return true;
        if (p.status !== 'completed' && p.status !== 'pending_approval') {
          const endDate = new Date(p.end_date);
          endDate.setHours(0, 0, 0, 0);
          return endDate < today;
        }
        return false;
      }).length;

      const delayedProjects = user?.role === 'employee'
        ? employeeDelayedProjectsCount
        : calculatedDelayedProjects;

      setStats({
        totalProjects: projects.length,
        activeProjects,
        completedProjects,
        pendingApprovalProjects: pendingApprovalProjects, // For managers/admins
        delayedProjects,
        totalEmployees: totalEmployeesCount, // Updated with real count from API
        approvedStatuses: 0, // No longer needed as daily statuses don't require approval
        rejectedStatuses: 0, // No longer needed as daily statuses don't require approval
        pendingCompletions: pendingCompletionsCount,
        employeePendingApprovals: employeePendingApprovalsCount, // For employees (project completions)
        employeeDelayedProjects: employeeDelayedProjectsCount,
        employeeApprovedActionPlans: employeeApprovedActionPlansCount,
        employeePendingActionPlans: employeePendingActionPlansCount,
        employeeRejectedActionPlans: employeeRejectedActionPlansCount,
        employeeTotalActionPlans: employeeTotalActionPlansCount
      });

      setRecentStatuses(notifications.recentStatuses || []);

    } catch (error) {
      console.error('Error loading dashboard data:', error.message);
      setError('Failed to load dashboard data. Please try again later.');
      toast.error('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [user?.role, stats.totalEmployees]); // Only depend on user.role to avoid unnecessary re-renders

  useEffect(() => {
    // Load data once when component mounts
    loadDashboardData(activeFilters);

    // Removed the continuous polling interval to prevent real-time updates
    // The data will now only be fetched when the user manually refreshes or navigates to the page
  }, [loadDashboardData, user?.id, activeFilters]); // Add user.id dependency to ensure refresh when user changes

  const handleFilterChange = (filters) => {
    setActiveFilters(filters);
    setIsFiltered(true);
    loadDashboardData(filters);
  };

  const handleClearFilters = () => {
    setActiveFilters(null);
    setIsFiltered(false);
    loadDashboardData(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200';
      case 'rejected':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200';
      case 'active':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700/20 text-gray-800 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center transition-colors duration-200">
        <div
          className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 dark:border-primary-500"
          aria-label="Loading dashboard data"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center transition-colors duration-200">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 dark:text-red-400" />
          <p className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-200">
            {error}
          </p>
          <button
            onClick={() => {
              setActionLoading(true);
              loadDashboardData().finally(() => setActionLoading(false));
            }}
            disabled={actionLoading}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
            aria-label="Retry loading dashboard data"
          >
            {actionLoading ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-6 px-6 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              <WelcomeText userName={user?.name} />
            </h1>
          </div>
          <div className="flex gap-2">
            {/* Show filters for admin */}
            {user?.role === 'admin' && (
              <ProjectFilters
                onFilterChange={handleFilterChange}
                onClear={handleClearFilters}
              />
            )}
            {/* Only show Create Project button for manager role, not admin */}
            {user?.role === 'manager' && (
              <Link
                to="/projects/create"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200 whitespace-nowrap"
                aria-label="Create a new project"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Link>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mt-6">
          <DashboardCard
            title="Total Tasks"
            value={stats.totalProjects}
            icon={FolderOpen}
            color="text-blue-600"
            link={isFiltered ? `/projects?status=all&department=${activeFilters?.department || ''}` : "/projects?status=all"}
          />
          <DashboardCard
            title="Active Tasks"
            value={stats.activeProjects}
            icon={TrendingUp}
            color="text-green-600"
            link={isFiltered ? `/projects?status=active&department=${activeFilters?.department || ''}` : "/projects?status=active"}
          />
          <DashboardCard
            title="Completed Tasks"
            value={stats.completedProjects}
            icon={CheckCircle}
            color="text-green-600"
            link={isFiltered ? `/projects?status=completed&department=${activeFilters?.department || ''}` : "/projects?status=completed"}
          />
          <DashboardCard
            title={user?.role === 'employee' ? "Pending Approval" : "Pending for Approval"}
            value={user?.role === 'employee' ? stats.employeePendingApprovals : stats.pendingApprovalProjects}
            icon={AlertTriangle}
            color="text-yellow-600"
            link={isFiltered ?
              (user?.role === 'employee' ? "/employee/pending-approvals" : `/projects?status=pending_approval&department=${activeFilters?.department || ''}`) :
              (user?.role === 'employee' ? "/employee/pending-approvals" : "/projects?status=pending_approval")}
          />
          <DashboardCard
            title="Delayed Tasks"
            value={user?.role === 'employee' ? stats.employeeDelayedProjects : stats.delayedProjects}
            icon={XCircle}
            color="text-red-600"
            link={isFiltered ?
              (user?.role === 'employee' ? "/employee/delayed-projects" : `/projects?status=delayed&department=${activeFilters?.department || ''}`) :
              (user?.role === 'employee' ? "/employee/delayed-projects" : "/projects?status=delayed")}
          />
        </div>

        {/* Action Plans Section for Employees */}
        {user?.role === 'employee' && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Action Plans
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <DashboardCard
                title="Approved"
                value={stats.employeeApprovedActionPlans}
                icon={CheckCircle}
                color="text-green-600"
                link="/employee/action-plans/approved"
              />
              <DashboardCard
                title="Rejected"
                value={stats.employeeRejectedActionPlans}
                icon={XCircle}
                color="text-red-600"
                link="/employee/action-plans/rejected"
              />
              <DashboardCard
                title="Pending Approval"
                value={stats.employeePendingActionPlans}
                icon={AlertTriangle}
                color="text-yellow-600"
                link="/employee/action-plans/pending"
              />
            </div>
          </div>
        )}

        {/* Employee Daily Update Reminder */}


        {/* Recent Updates Section for Managers - Hide for Admins */}
        {/* Recent Updates section removed as per requirements */}

      </div>
    </div>
  );
};

export default Dashboard;