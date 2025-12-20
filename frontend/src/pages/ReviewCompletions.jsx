import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../utils/mockData';
import api from '../services/api';
import { toast } from 'react-toastify';
import { CheckCircle, XCircle, MessageSquare, AlertTriangle, Clock, User, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Create a custom event to notify sidebar of count changes
const createCompletionEvent = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('completionCountChanged'));
  }
};

const ReviewCompletions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(null);
  const [comments, setComments] = useState({});
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedProjectForReject, setSelectedProjectForReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionType, setRejectionType] = useState('action_plan'); // 'action_plan' or 'project_completion'

  // Check if user is valid
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Authentication Error</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Please log in to access this page.
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadPendingCompletions();
  }, []);

  const loadPendingCompletions = async () => {
    try {
      setLoading(true);
      // Fetch both pending projects and their associated status submissions
      const [projectsResponse, statusesResponse] = await Promise.all([
        apiService.getPendingCompletions(),
        apiService.getAllTeamUpdates()
      ]);

      const projectsData = projectsResponse.data.data || [];
      const statusesData = statusesResponse.data || [];

      // Combine project data with their latest status submissions
      const projectsWithStatuses = projectsData.map(project => {
        // Find the latest status submission for this project that marks as completed
        const projectStatuses = statusesData
          .filter(status =>
            status.project_id === project.id &&
            status.mark_as_completed === true
          )
          .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));

        const latestStatus = projectStatuses[0] || null;

        return {
          ...project,
          latest_status: latestStatus,
          type: 'project_completion' // This is a project completion request
        };
      });

      // Set only project completions (no action plans)
      setProjects(projectsWithStatuses);
    } catch (error) {
      toast.error('Failed to load pending completions');
      console.error('Error loading pending completions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveActionPlan = async (statusId, comment = '') => {
    setReviewing(statusId);
    try {
      await api.post(`/statuses/approve/${statusId}`);
      toast.success('Action plan approved successfully!');
      createCompletionEvent(); // Notify sidebar to update count
      loadPendingCompletions(); // Reload to remove from list
    } catch (error) {
      toast.error('Failed to approve action plan');
      console.error('Error approving action plan:', error);
    } finally {
      setReviewing(null);
    }
  };

  // New function to approve project completion
  const handleApproveProjectCompletion = async (projectId) => {
    setReviewing(projectId);
    try {
      await api.post(`/projects/${projectId}/approve-completion`);
      toast.success('Project completion approved successfully!');
      createCompletionEvent(); // Notify sidebar to update count
      loadPendingCompletions(); // Reload to remove from list
    } catch (error) {
      toast.error('Failed to approve project completion');
      console.error('Error approving project completion:', error);
    } finally {
      setReviewing(null);
    }
  };

  const handleReject = async (statusId, reason) => {
    setReviewing(statusId);
    try {
      await api.post(`/statuses/reject/${statusId}`, { reason });
      toast.success('Project completion rejected. Employee can resubmit.');
      createCompletionEvent(); // Notify sidebar to update count
      setShowRejectModal(false);
      setSelectedProjectForReject(null);
      setRejectionReason('');
      loadPendingCompletions(); // Reload to remove from list
    } catch (error) {
      toast.error('Failed to reject project completion');
      console.error('Error rejecting project completion:', error);
    } finally {
      setReviewing(null);
    }
  };

  // New function to reject project completion
  const handleRejectProjectCompletion = async (projectId, reason) => {
    setReviewing(projectId);
    try {
      await api.post(`/projects/${projectId}/reject-completion`, { reason });
      toast.success('Project completion rejected. Employee can resubmit project completion request.');
      createCompletionEvent(); // Notify sidebar to update count
      setShowRejectModal(false);
      setSelectedProjectForReject(null);
      setRejectionReason('');
      loadPendingCompletions(); // Reload to remove from list
    } catch (error) {
      toast.error('Failed to reject project completion');
      console.error('Error rejecting project completion:', error);
    } finally {
      setReviewing(null);
    }
  };

  const openRejectModal = (item, type = 'project_completion') => {
    setSelectedProjectForReject(item);
    setRejectionType(type);
    setShowRejectModal(true);
    setRejectionReason('');
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
    setSelectedProjectForReject(null);
    setRejectionReason('');
    setRejectionType('action_plan');
  };

  const handleCommentChange = (projectId, comment) => {
    setComments(prev => ({
      ...prev,
      [projectId]: comment
    }));
  };

  // Rejection Modal
  if (showRejectModal && selectedProjectForReject) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {rejectionType === 'action_plan' ? 'Reject Action Plan' : 'Reject Project Completion'}
            </h3>
            <button
              onClick={closeRejectModal}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Please provide a reason for rejecting the project completion for "{selectedProjectForReject.name || 'Unnamed Project'}":
          </p>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="Enter detailed reason for rejection (required)..."
          />
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={closeRejectModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (rejectionReason.trim().length === 0) {
                  toast.error('Rejection reason is required');
                  return;
                }

                if (rejectionType === 'action_plan') {
                  // For action plans, use the status ID
                  const statusId = selectedProjectForReject.id;
                  if (!statusId) {
                    toast.error('Status ID is missing for action plan');
                    return;
                  }
                  handleReject(statusId, rejectionReason.trim());
                } else {
                  // For project completions, use the project ID
                  const projectId = selectedProjectForReject.id;
                  if (!projectId) {
                    toast.error('Project ID is missing for project completion');
                    return;
                  }
                  handleRejectProjectCompletion(projectId, rejectionReason.trim());
                }
              }}
              disabled={rejectionReason.trim().length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {reviewing === (rejectionType === 'action_plan' ? selectedProjectForReject.id : selectedProjectForReject.id) ? 'Processing...' : 'Reject'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Error state
  if (!projects) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Error loading data</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Failed to load pending completions. Please try again later.
          </p>
          <button
            onClick={loadPendingCompletions}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects && Array.isArray(projects) && projects.length > 0 ? (
          projects.map((project) => (
            <div key={project.id || project.name} className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden hover:shadow-md transition-shadow duration-200">
              {/* Card Header */}
              <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <div className="flex justify-between items-start mb-1">
                  <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                    Project Completion
                  </span>
                  {project.latest_status && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(project.latest_status.submitted_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-end">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm flex-1 mr-2" title={project.name}>
                    {project.name || 'Unnamed Project'}
                  </h3>
                  {project.latest_status && (
                    <div className="flex items-center flex-shrink-0">
                      <div className="h-5 w-5 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 font-medium text-[10px] mr-1.5">
                        {project.latest_status.employee_name ? project.latest_status.employee_name.charAt(0) : 'U'}
                      </div>
                      <span className="text-xs font-medium text-gray-900 dark:text-white max-w-[100px] truncate">
                        {project.latest_status.employee_name}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-3 flex-1 flex flex-col">
                <div className="mb-2">
                  {project.latest_status && (
                    <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 font-medium">Final Action Plan:</p>
                      <p className="text-sm text-gray-700 dark:text-gray-200 line-clamp-2 italic">
                        "{project.latest_status.status_text}"
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="space-y-3">
                    <textarea
                      value={comments[project.id] || ''}
                      onChange={(e) => handleCommentChange(project.id, e.target.value)}
                      rows={1}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-xs bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 resize-none"
                      placeholder="Add comment..."
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => openRejectModal(project, 'project_completion')}
                        disabled={reviewing === project.id}
                        className="flex items-center justify-center px-3 py-2 border border-transparent rounded-lg text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-xs font-medium transition-colors"
                      >
                        <XCircle className="h-4 w-4 mr-1.5" />
                        Reject
                      </button>
                      <button
                        onClick={() => handleApproveProjectCompletion(project.id)}
                        disabled={reviewing === project.id}
                        className="flex items-center justify-center px-3 py-2 border border-transparent rounded-lg text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-xs font-medium transition-colors"
                      >
                        <CheckCircle className="h-4 w-4 mr-1.5" />
                        Approve
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 border-dashed">
            <div className="h-16 w-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">All caught up!</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              No pending project completions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewCompletions;