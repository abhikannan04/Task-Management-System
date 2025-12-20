import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../utils/mockData';
import { toast } from 'react-toastify';
import { Clock, Calendar, XCircle, Filter } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Notifications = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [notifications, setNotifications] = useState({
    recentStatuses: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all');
  // Add state for action plan status filter
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    loadNotifications();
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await apiService.getProjects();
      const userProjects = Array.isArray(response.data) ? response.data : [];
      setProjects(userProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      // Use the new endpoint that fetches all team updates without limit
      const response = await apiService.getAllTeamUpdates();
      // Show ALL statuses (no filtering)
      const allStatuses = Array.isArray(response.data) ? response.data : [];
      setNotifications({
        recentStatuses: allStatuses,
      });
    } catch (error) {
      const errorMessage = 'Failed to load notifications. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
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

  // Filter notifications based on selected project and status
  const filteredStatuses = notifications.recentStatuses
    .filter(status => {
      // Project filter
      const projectMatch = selectedProject === 'all' || status.project_id === parseInt(selectedProject);

      // Status filter
      const statusMatch = selectedStatus === 'all' ||
        (selectedStatus === 'pending' && status.mark_as_completed && !status.review_status) ||
        (selectedStatus === 'approved' && status.review_status === 'approved') ||
        (selectedStatus === 'rejected' && status.review_status === 'rejected');

      return projectMatch && statusMatch;
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center transition-colors duration-200">
        <div
          className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 dark:border-primary-500"
          aria-label="Loading notifications"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center transition-colors duration-200">
        <div className="text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-500 dark:text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-200">
            Error
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{error}</p>
          <button
            onClick={loadNotifications}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-1 px-2 sm:px-4 lg:px-6 transition-colors duration-200">
      <div className="w-full">
        {/* Combined heading and filters */}
        <div className="mb-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-200">
            All Action Plans Update
          </h1>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {/* Project Filter Dropdown */}
            <div className="flex items-center w-full sm:w-auto">
              <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-1 flex-shrink-0" />
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full sm:w-auto pl-2 pr-8 py-1 text-xs border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
              >
                <option value="all">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Plan Status Filter Dropdown */}
            <div className="flex items-center w-full sm:w-auto">
              <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-1 flex-shrink-0" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full sm:w-auto pl-2 pr-8 py-1 text-xs border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
              >
                <option value="all">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-2 bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
          {filteredStatuses.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Clock className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-200">
                No team updates
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {selectedProject === 'all'
                  ? 'No team members have submitted updates or completion requests.'
                  : 'No updates found for the selected project.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredStatuses.map((status) => (
                <li key={status.id} className="px-4 py-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate">
                          {status.employee_name}
                        </p>
                        {/* Show status ONLY for completion requests (mark_as_completed = true) */}
                        {status.mark_as_completed && status.review_status && (
                          <span
                            className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                              status.review_status
                            )}`}
                          >
                            {status.review_status === 'approved' ? 'Approved' : status.review_status === 'rejected' ? 'Rejected' : status.review_status}
                          </span>
                        )}
                        {/* Show pending status for completion requests that haven't been reviewed yet */}
                        {status.mark_as_completed && !status.review_status && (
                          <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200">
                            Pending Review
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-900 dark:text-gray-200">
                        {status.status_text}
                      </p>
                      <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>
                          {new Date(status.submitted_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;