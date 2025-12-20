import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../utils/mockData';
import { toast } from 'react-toastify';
import { Calendar, CheckCircle, Send } from 'lucide-react';
import api from '../services/api';

const SubmitStatus = () => {
  const { id } = useParams(); // Changed from projectId to id to match the route parameter
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [requestingCompletion, setRequestingCompletion] = useState(false);
  const [actionPlanStatus, setActionPlanStatus] = useState('started'); // Add state for action plan status

  // Find the manager who assigned the current user
  const assignedByName = project?.team_members?.find(
    member => parseInt(member.employee_id) === user.id
  )?.assigned_by_name;

  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    defaultValues: {
      date: new Date().toISOString().split('T')[0]
    }
  });

  // Function to validate date is not in the future
  const validateDateNotFuture = (dateString) => {
    const selectedDate = new Date(dateString);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    return selectedDate <= today;
  };

  useEffect(() => {
    loadProject();
  }, [id]); // Changed from projectId to id

  const loadProject = async () => {
    try {
      setLoading(true);
      const response = await apiService.getProject(id); // Changed from projectId to id
      setProject(response.data);
    } catch (error) {
      toast.error('Failed to load project');
      console.error('Error loading project:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      await apiService.submitStatus({
        project_id: parseInt(id), // Changed from projectId to id
        ...data,
        action_plan_status: actionPlanStatus // Add action_plan_status to the submission
        // No need for mark_as_completed flag here as this is just a regular status submission
      });

      toast.success('Action plan submitted successfully!');
      navigate('/projects');
    } catch (error) {
      console.error('Error submitting action plan:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to submit action plan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkComplete = async () => {
    setMarkingComplete(true);
    try {
      // Submit the action plan with mark_as_completed flag
      const data = watch();
      console.log('Submitting action plan with data:', data); // Debug log
      await apiService.submitStatus({
        project_id: parseInt(id), // Changed from projectId to id
        ...data,
        mark_as_completed: true, // Add this flag to mark action plan as completed for review
        action_plan_status: actionPlanStatus // Add action_plan_status to the submission
      });

      toast.success(`Action plan submitted and sent to ${assignedByName || 'your manager'} for approval!`);
      navigate('/projects');
    } catch (error) {
      console.error('Error submitting action plan:', error);
      console.error('Error response:', error.response); // Debug log
      toast.error(error.response?.data?.error || error.message || 'Failed to submit action plan');
    } finally {
      setMarkingComplete(false);
    }
  };

  // New function to request project completion approval
  const handleRequestCompletion = async () => {
    setRequestingCompletion(true);
    try {
      // Call the new endpoint to request project completion without submitting daily status
      await api.post(`/projects/${id}/request-completion`); // Changed from projectId to id

      toast.success(`Project completion request sent to ${project.created_by_name || 'your manager'} for approval!`);
      navigate('/projects');
    } catch (error) {
      console.error('Error requesting project completion:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to request project completion');
    } finally {
      setRequestingCompletion(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center transition-colors duration-200">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 dark:border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10">

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-200">
              Date
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500 transition-colors duration-200" />
              </div>
              <input
                {...register('date', {
                  required: 'Date is required',
                  validate: (value) => validateDateNotFuture(value) || 'Cannot submit action plan for future dates'
                })}
                type="date"
                max={new Date().toISOString().split('T')[0]}
                className="pl-10 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-500 dark:focus:border-primary-500 transition-colors duration-200"
              />
            </div>
            {errors.date && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400 transition-colors duration-200">{errors.date.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="status_text" className="block text-sm font-medium text-gray-900 dark:text-white transition-colors duration-200">
              Action Plan
            </label>
            <textarea
              {...register('status_text', {
                required: 'Action Plan is required',
                minLength: { value: 1, message: 'Action Plan is required' },
                maxLength: { value: 2000, message: 'Action Plan must be less than 2000 characters' }
              })}
              rows={6}
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-500 dark:focus:border-primary-500 transition-colors duration-200"
              placeholder="Describe your action plans and steps you have taken till now..."
            />
            {errors.status_text && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400 transition-colors duration-200">{errors.status_text.message}</p>
            )}
          </div>

          {/* Action Plan Status Selection */}
          <div>
            <label htmlFor="actionPlanStatus" className="block text-sm font-medium text-gray-900 dark:text-white transition-colors duration-200">
              Action Plan Status
            </label>
            <select
              id="actionPlanStatus"
              value={actionPlanStatus}
              onChange={(e) => setActionPlanStatus(e.target.value)}
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-500 dark:focus:border-primary-500 transition-colors duration-200"
            >
              <option value="started">Started</option>
              <option value="in_progress">In Progress</option>
              <option value="testing">Testing</option>
              <option value="completed">Completed</option>
              <option value="under_approval">Under Approval</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>

          <div className="pt-6 border-t border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 transition-colors duration-200">Action Plan Submission</h3>
            <div className="flex flex-wrap items-center justify-end space-x-4 gap-y-2">
              <button
                type="button"
                onClick={() => navigate('/projects')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-gray-400 transition-colors duration-200"
              >
                Cancel
              </button>

              {/* Show only the Submit Action Plan button */}
              {['active', 'pending_approval', 'delayed'].includes(project?.status) && (
                <button
                  type="button"
                  onClick={handleMarkComplete}
                  disabled={markingComplete}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-green-400 disabled:opacity-50 transition-colors duration-200"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {markingComplete ? 'Submitting...' : 'Submit Action Plan for Review'}
                </button>
              )}

              {/* Add Project Completion Request Button for Active Projects */}
              {project?.status === 'active' && (
                <div className="flex flex-col items-end">
                  <button
                    type="button"
                    onClick={handleRequestCompletion}
                    disabled={requestingCompletion}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 disabled:opacity-50 transition-colors duration-200"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {requestingCompletion ? 'Requesting...' : 'Request Project Completion'}
                  </button>
                </div>
              )}

              {/* Show status note for non-eligible states */}
              {!['active', 'pending_approval', 'delayed', 'completed'].includes(project?.status) && (
                <div className="w-full text-sm text-yellow-600 dark:text-yellow-400 mt-2 transition-colors duration-200">
                  Note: You can only submit action plans for projects that are 'In Progress', 'Pending Approval', or 'Delayed'.
                </div>
              )}
            </div>
          </div>
        </form>
      </div >
    </div >
  );
};

export default SubmitStatus;