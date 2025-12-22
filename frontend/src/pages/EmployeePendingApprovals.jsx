import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { toast } from 'react-toastify';
import { AlertTriangle, Calendar, MessageSquare } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const EmployeePendingApprovals = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingApprovalProjects();
  }, []);

  const loadPendingApprovalProjects = async () => {
    try {
      setLoading(true);
      const response = await api.get('/projects/employee/pending-approvals');
      // Ensure we're getting the data correctly
      const projectsData = response.data && response.data.data ? response.data.data : response.data || [];
      setProjects(Array.isArray(projectsData) ? projectsData : []);
    } catch (error) {
      toast.error('Failed to load pending approval projects');
      console.error('Error loading pending approval projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestartProject = async (projectId) => {
    try {
      // When restarting a project, it should go back to 'active' status
      // But we should not directly update the status, instead we should navigate to the project page
      // where the employee can submit a new status
      navigate(`/projects/${projectId}`);
    } catch (error) {
      toast.error('Failed to restart project');
      console.error('Error restarting project:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pending Projects</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects && Array.isArray(projects) && projects.length > 0 ? (
          projects.map((project) => (
            <div
              key={project.id}
              onClick={() => handleRestartProject(project.id)}
              className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer"
            >
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-base font-medium text-gray-900 dark:text-white truncate flex-1 mr-2" title={project.name}>
                    {project.name || 'Unnamed Project'}
                  </h3>
                  <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 whitespace-nowrap">
                    Pending
                  </span>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3" title={project.description}>
                  {project.description || 'No description provided'}
                </p>

                {project.rejection_reason && (
                  <div className="mb-4 p-2.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-800/30">
                    <p className="text-xs font-semibold text-orange-800 dark:text-orange-300 mb-1">
                      Rejection Reason:
                    </p>
                    <p className="text-xs text-orange-700 dark:text-orange-200 line-clamp-3 italic">
                      "{project.rejection_reason}"
                    </p>
                  </div>
                )}

                <div className="mt-auto space-y-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-col gap-1">
                    <div className="flex items-center">
                      <Calendar className="h-3.5 w-3.5 mr-1.5" />
                      <span>Start: {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-3.5 w-3.5 mr-1.5" />
                      <span>End: {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full mt-4">
                    <Link
                      to={`/projects/${project.id}/submit-status`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 inline-flex items-center justify-center px-2 py-1.5 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 text-[10px] font-medium transition-colors whitespace-nowrap"
                    >
                      Submit Status
                    </Link>
                    <Link
                      to={`/projects/${project.id}/discussion`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 inline-flex items-center justify-center px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-[10px] font-medium transition-colors"
                    >
                      <MessageSquare className="h-3 w-3 mr-1.5" />
                      Discussion
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full px-6 py-12 text-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No pending approval projects</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              All your projects are either in progress or completed. No projects are pending approval at this time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeePendingApprovals;