import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { apiService } from '../utils/mockData';
import { toast } from 'react-toastify';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  Clock,
  MessageSquare
} from 'lucide-react';

const ActionPlans = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { status } = useParams();
  const location = useLocation();

  const [actionPlans, setActionPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Determine which API endpoint to call based on the status parameter
  const getApiEndpoint = () => {
    // Check if it's one of the new action plan status values
    const validActionPlanStatuses = ['started', 'in_progress', 'completed', 'under_approval', 'on_hold'];
    if (validActionPlanStatuses.includes(status)) {
      return () => apiService.getActionPlansByStatus(status);
    }

    // Otherwise, use the existing endpoints
    switch (status) {
      case 'approved':
        return apiService.getApprovedActionPlans;
      case 'pending':
        return apiService.getPendingActionPlans;
      case 'rejected':
        return apiService.getRejectedActionPlans;
      default:
        return apiService.getApprovedActionPlans; // default to approved
    }
  };

  // Get title based on status
  const getTitle = () => {
    // Check if it's one of the new action plan status values
    const validActionPlanStatuses = ['started', 'in_progress', 'testing', 'completed', 'under_approval', 'on_hold'];
    if (validActionPlanStatuses.includes(status)) {
      switch (status) {
        case 'started':
          return 'Started Action Plans';
        case 'in_progress':
          return 'In Progress Action Plans';
        case 'testing':
          return 'Testing Action Plans';
        case 'completed':
          return 'Completed Action Plans';
        case 'under_approval':
          return 'Under Approval Action Plans';
        case 'on_hold':
          return 'On Hold Action Plans';
        default:
          return 'Action Plans';
      }
    }

    // Otherwise, use the existing titles
    switch (status) {
      case 'approved':
        return 'Approved Action Plans';
      case 'pending':
        return 'Pending Approval Action Plans';
      case 'rejected':
        return 'Rejected Action Plans';
      default:
        return 'Action Plans';
    }
  };

  const loadActionPlans = async () => {
    try {
      setLoading(true);
      setError(null);

      const endpointFn = getApiEndpoint();
      const response = await endpointFn();

      // Properly extract data from the response to avoid duplicates
      let data = [];
      if (response.data) {
        // Check if response has a data property with an array
        if (response.data.data && Array.isArray(response.data.data)) {
          data = response.data.data;
        }
        // Check if response.data itself is an array
        else if (Array.isArray(response.data)) {
          data = response.data;
        }
        // Handle single object response
        else if (typeof response.data === 'object' && response.data !== null) {
          data = [response.data];
        }
      }

      // Remove any potential duplicates based on id
      const uniqueData = data.filter((item, index, self) =>
        index === self.findIndex(t => t.id === item.id)
      );

      setActionPlans(uniqueData);
    } catch (error) {
      console.error('Error loading action plans:', error);
      setError('Failed to load action plans');
      toast.error('Failed to load action plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'employee') {
      navigate('/dashboard');
      return;
    }

    loadActionPlans();
  }, [user, status]);

  const getStatusColor = (status) => {
    // Handle the new action plan statuses
    const validActionPlanStatuses = ['started', 'in_progress', 'testing', 'completed', 'under_approval', 'on_hold'];
    if (validActionPlanStatuses.includes(status)) {
      switch (status) {
        case 'started':
          return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200';
        case 'in_progress':
          return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200';
        case 'testing':
          return 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-200';
        case 'completed':
          return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200';
        case 'under_approval':
          return 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200';
        case 'on_hold':
          return 'bg-gray-100 dark:bg-gray-700/20 text-gray-800 dark:text-gray-200';
        default:
          return 'bg-gray-100 dark:bg-gray-700/20 text-gray-800 dark:text-gray-200';
      }
    }

    // Handle the existing statuses
    switch (status) {
      case 'approved':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200';
      case 'rejected':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200';
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700/20 text-gray-800 dark:text-gray-200';
    }
  };

  const getStatusText = (status) => {
    // Handle the new action plan statuses
    const validActionPlanStatuses = ['started', 'in_progress', 'testing', 'completed', 'under_approval', 'on_hold'];
    if (validActionPlanStatuses.includes(status)) {
      switch (status) {
        case 'started':
          return 'Started';
        case 'in_progress':
          return 'In Progress';
        case 'testing':
          return 'Testing';
        case 'completed':
          return 'Completed';
        case 'under_approval':
          return 'Under Approval';
        case 'on_hold':
          return 'On Hold';
        default:
          return status;
      }
    }

    // Handle the existing statuses
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'pending':
        return 'Pending Approval';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 dark:border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-500 dark:text-red-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Error</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{error}</p>
          <div className="mt-6">
            <button
              onClick={loadActionPlans}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {actionPlans.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No action plans</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              You don't have any {status} action plans at the moment.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {actionPlans.map((actionPlan) => (
                <li key={actionPlan.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                  <Link to={`/action-plans/${actionPlan.id}`} className="block px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {actionPlan.project_name}
                          </p>
                          {actionPlan.unread_count > 0 && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              {actionPlan.unread_count} new
                            </span>
                          )}
                          <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)}`}>
                            {getStatusText(status)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                          {actionPlan.status_text}
                        </p>
                        {/* Remove submitted and reviewed dates for specific statuses */}
                        {!['approved', 'rejected', 'pending', 'under_approval'].includes(status) && (
                          <>
                            <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                              <Clock className="h-4 w-4 mr-1" />
                              <span>Submitted: {new Date(actionPlan.submitted_at).toLocaleString()}</span>
                            </div>
                            {actionPlan.reviewed_at && (
                              <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                                <CheckCircle className="h-4 w-4 mr-1" />
                                <span>Reviewed: {new Date(actionPlan.reviewed_at).toLocaleString()}</span>
                              </div>
                            )}
                          </>
                        )}
                        {status === 'rejected' && actionPlan.review_comments && (
                          <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                            <p className="text-sm">
                              <span className="font-medium text-red-800 dark:text-red-200">Rejection Reason: </span>
                              <span className="text-red-700 dark:text-red-300">{actionPlan.review_comments}</span>
                            </p>
                          </div>
                        )}
                        {status !== 'rejected' && actionPlan.review_comments && (
                          <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                            <p className="text-sm">
                              <span className="font-medium text-blue-800 dark:text-blue-200">Review Comments: </span>
                              <span className="text-blue-700 dark:text-blue-300">{actionPlan.review_comments}</span>
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="ml-4 flex flex-col items-end gap-2">
                        {['approved', 'rejected', 'pending', 'under_approval'].includes(status) && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(`/projects/${actionPlan.project_id}/discussion`, {
                                state: {
                                  citedActionPlan: {
                                    id: actionPlan.id,
                                    text: actionPlan.status_text,
                                    user_name: user?.name || 'Employee'
                                  }
                                }
                              });
                            }}
                            className="text-primary-600 hover:text-primary-500 text-sm font-medium flex items-center"
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Discussion
                          </button>
                        )}
                        <span className="text-primary-600 hover:text-primary-500 text-sm font-medium">
                          View Details
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div >
    </div >
  );
};

export default ActionPlans;