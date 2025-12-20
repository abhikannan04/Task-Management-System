import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../utils/mockData';
import { toast } from 'react-toastify';
import { Clock, Eye, Paperclip } from 'lucide-react';
import FileAttachment from '../components/FileAttachment';

const ReviewStatus = () => {
  const { user } = useAuth();
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingStatuses();
  }, []);

  const loadPendingStatuses = async () => {
    try {
      setLoading(true);
      const response = await apiService.getPendingStatuses();
      setStatuses(response.data);
    } catch (error) {
      toast.error('Failed to load active statuses');
      console.error('Error loading statuses:', error);
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
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center transition-colors duration-200">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Eye className="h-6 w-6 text-gray-600 dark:text-gray-400 mr-2" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">View Status Reports</h1>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 transition-colors duration-200">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Recent Status Reports</h2>
        </div>
        
        {statuses.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Clock className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No status reports</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              No status reports have been submitted yet.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {statuses.map((status) => (
              <li key={status.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {status.employee_name}
                      </p>
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor('active')}`}>
                        Active
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {status.project_name}
                    </p>
                    <p className="mt-2 text-sm text-gray-900 dark:text-white">
                      {status.status_text}
                    </p>
                    <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <span>{new Date(status.date).toLocaleDateString()}</span>
                      <span className="mx-2">•</span>
                      <span>{status.hours_worked} hours</span>
                      <span className="mx-2">•</span>
                      <span>{status.progress_percentage}% progress</span>
                    </div>
                    
                    {/* Attachments */}
                    {status.attachments && status.attachments.length > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center mb-2">
                          <Paperclip className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-1" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Attachments ({status.attachments.length})
                          </span>
                        </div>
                        <div className="space-y-1">
                          {status.attachments.map((attachment, index) => (
                            <FileAttachment
                              key={index}
                              statusId={status.id}
                              attachment={attachment}
                              className="border border-gray-200 dark:border-gray-600"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ReviewStatus;
