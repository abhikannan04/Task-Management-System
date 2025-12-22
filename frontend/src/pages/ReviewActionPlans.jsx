import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../utils/mockData';
import api from '../services/api';
import { toast } from 'react-toastify';
import { CheckCircle, XCircle, AlertTriangle, Clock, User, X, History, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Create a custom event to notify sidebar of count changes
const createActionPlanEvent = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('actionPlanCountChanged'));
  }
};

const ReviewActionPlans = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [actionPlans, setActionPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(null);
  const [comments, setComments] = useState({});
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedActionPlanForReject, setSelectedActionPlanForReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showHistory, setShowHistory] = useState({}); // Track which action plans have history shown

  const getActionPlanStatusText = (status) => {
    switch (status) {
      case 'started':
        return 'Started';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'under_approval':
        return 'Under Approval';
      case 'on_hold':
        return 'On Hold';
      default:
        return status;
    }
  };

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
    loadPendingActionPlans();
  }, []);

  const loadPendingActionPlans = async () => {
    try {
      setLoading(true);
      // Fetch all team updates to find pending action plans
      const statusesResponse = await apiService.getAllTeamUpdates();
      const statusesData = statusesResponse.data || [];

      // Get pending action plans that are either:
      // 1. Marked as completed and pending review
      // 2. Have action plan status updates pending approval
      const pendingActionPlans = statusesData
        .filter(status =>
          (status.mark_as_completed === true && status.review_status === 'pending') ||
          (status.action_plan_status === 'under_approval' && status.review_status === 'pending')
        )
        .map(status => {
          // Extract requested status from review_comments for status updates
          let requestedStatus = null;
          if (status.action_plan_status === 'under_approval' &&
            status.review_comments &&
            status.review_comments.startsWith('Requested status: ')) {
            requestedStatus = status.review_comments.replace('Requested status: ', '');
          }

          // For completion requests, the requested status is the current action_plan_status
          if (status.mark_as_completed && !requestedStatus && status.action_plan_status) {
            requestedStatus = status.action_plan_status;
          }

          return {
            ...status,
            type: status.mark_as_completed ? 'completion_request' : 'status_update',
            requested_status: requestedStatus
          };
        });

      setActionPlans(pendingActionPlans);
    } catch (error) {
      toast.error('Failed to load pending action plans');
      console.error('Error loading pending action plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveActionPlan = async (statusId, comment = '', type = 'completion_request') => {
    setReviewing(statusId);
    try {
      let response;
      if (type === 'status_update') {
        // For status updates, we need to approve the status change
        response = await api.post(`/statuses/approve-status-update/${statusId}`);
      } else {
        // For completion requests, use the existing endpoint
        response = await api.post(`/statuses/approve/${statusId}`);
      }

      // Notify the employee about the approval
      if (response.data && response.data.action_plan_status) {
        toast.success(
          type === 'status_update'
            ? `Status update approved successfully! New status: ${getActionPlanStatusText(response.data.action_plan_status)}`
            : `Action plan request approved successfully! Status: ${getActionPlanStatusText(response.data.action_plan_status)}`
        );
      } else {
        toast.success(type === 'status_update' ? 'Status update approved successfully!' : 'Action plan request approved successfully!');
      }

      createActionPlanEvent(); // Notify sidebar to update count
      loadPendingActionPlans(); // Reload to remove from list
    } catch (error) {
      toast.error(type === 'status_update' ? 'Failed to approve status update' : 'Failed to approve action plan');
      console.error('Error approving action plan:', error);
    } finally {
      setReviewing(null);
    }
  };

  const handleReject = async (statusId, reason, type = 'completion_request') => {
    setReviewing(statusId);
    try {
      if (type === 'status_update') {
        // For status updates, we need to reject the status change
        await api.post(`/statuses/reject-status-update/${statusId}`, { reason });
      } else {
        // For completion requests, use the existing endpoint
        await api.post(`/statuses/reject/${statusId}`, { reason });
      }
      toast.success(type === 'status_update' ? 'Status update rejected. Employee can resubmit.' : 'Action plan request rejected. Employee can resubmit.');
      createActionPlanEvent(); // Notify sidebar to update count
      setShowRejectModal(false);
      setSelectedActionPlanForReject(null);
      setRejectionReason('');
      loadPendingActionPlans(); // Reload to remove from list
    } catch (error) {
      toast.error(type === 'status_update' ? 'Failed to reject status update' : 'Failed to reject action plan request');
      console.error('Error rejecting action plan:', error);
    } finally {
      setReviewing(null);
    }
  };

  const openRejectModal = (actionPlan) => {
    setSelectedActionPlanForReject(actionPlan);
    setShowRejectModal(true);
    setRejectionReason('');
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
    setSelectedActionPlanForReject(null);
    setRejectionReason('');
  };

  const handleCommentChange = (statusId, comment) => {
    setComments(prev => ({
      ...prev,
      [statusId]: comment
    }));
  };

  const toggleHistory = (statusId) => {
    setShowHistory(prev => ({
      ...prev,
      [statusId]: !prev[statusId]
    }));
  };

  // Rejection Modal
  if (showRejectModal && selectedActionPlanForReject) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {selectedActionPlanForReject.type === 'status_update' ? 'Reject Action Plan' : 'Reject Project Completion'}
            </h3>
            <button
              onClick={closeRejectModal}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Please provide a reason for rejecting the {selectedActionPlanForReject.type === 'status_update' ? 'action plan' : 'project completion'} for "{selectedActionPlanForReject.project_name || selectedActionPlanForReject.project_id}":
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

                // For action plans, use the status ID
                const statusId = selectedActionPlanForReject.id;
                if (!statusId) {
                  toast.error('Status ID is missing for action plan');
                  return;
                }
                handleReject(statusId, rejectionReason.trim(), selectedActionPlanForReject.type);
              }}
              disabled={rejectionReason.trim().length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {reviewing === selectedActionPlanForReject.id ? 'Processing...' : 'Reject'}
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
  if (!actionPlans) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Error loading data</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Failed to load pending action plans. Please try again later.
          </p>
          <button
            onClick={loadPendingActionPlans}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {actionPlans && Array.isArray(actionPlans) && actionPlans.length > 0 ? (
          actionPlans.map((actionPlan) => (
            <div key={actionPlan.id} className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden hover:shadow-md transition-shadow duration-200">
              {/* Card Header */}
              <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <div className="flex justify-between items-start mb-1">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${actionPlan.type === 'status_update'
                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                    }`}>
                    {actionPlan.type === 'status_update' ? 'Status Update' : 'Action Plan'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {new Date(actionPlan.submitted_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-end">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm flex-1 mr-2" title={actionPlan.project_name}>
                    {actionPlan.project_name || `Project ID: ${actionPlan.project_id}`}
                  </h3>
                  <div className="flex items-center flex-shrink-0">
                    <div className="h-5 w-5 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 font-medium text-[10px] mr-1.5">
                      {actionPlan.employee_name ? actionPlan.employee_name.charAt(0) : 'U'}
                    </div>
                    <span className="text-xs font-medium text-gray-900 dark:text-white max-w-[100px] truncate">
                      {actionPlan.employee_name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-3 flex-1 flex flex-col">
                <div className="mb-2">
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 font-medium">
                    {actionPlan.status_text}
                  </p>

                  <div className="space-y-1 mt-2">
                    {actionPlan.requested_status && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Requested:</span>
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {getActionPlanStatusText(actionPlan.requested_status)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <textarea
                    value={comments[actionPlan.id] || ''}
                    onChange={(e) => handleCommentChange(actionPlan.id, e.target.value)}
                    rows={1}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-xs bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 resize-none"
                    placeholder="Add comment..."
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => openRejectModal(actionPlan)}
                      disabled={reviewing === actionPlan.id}
                      className="flex items-center justify-center px-3 py-2 border border-transparent rounded-lg text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-xs font-medium transition-colors"
                    >
                      <XCircle className="h-4 w-4 mr-1.5" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleApproveActionPlan(actionPlan.id, comments[actionPlan.id] || '', actionPlan.type)}
                      disabled={reviewing === actionPlan.id}
                      className="flex items-center justify-center px-3 py-2 border border-transparent rounded-lg text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 text-xs font-medium transition-colors"
                    >
                      <CheckCircle className="h-4 w-4 mr-1.5" />
                      Approve
                    </button>
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
              No pending action plans to review.
            </p>
          </div>
        )}
      </div>
    </div >
  );
};

export default ReviewActionPlans;