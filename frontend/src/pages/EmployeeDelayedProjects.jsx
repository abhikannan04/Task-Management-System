import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Clock, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EmployeeDelayedProjects = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDelayedProjects();
  }, []);

  const loadDelayedProjects = async () => {
    try {
      setLoading(true);
      const response = await api.get('/projects/employee/delayed');
      setProjects(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load delayed projects');
      console.error('Error loading delayed projects:', error);
    } finally {
      setLoading(false);
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Delayed Projects</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Delayed Projects</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            These projects are past their end date and require immediate attention.
          </p>
        </div>
        
        {projects && Array.isArray(projects) && projects.length > 0 ? (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {projects.map((project) => (
              <li key={project.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {project.name || 'Unnamed Project'}
                      </p>
                      <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                        Delayed
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-900 dark:text-gray-200">
                      {project.description || 'No description provided'}
                    </p>
                    <div className="mt-3 flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>Start Date: {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A'}</span>
                      <span className="mx-2">•</span>
                      <span>End Date: {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <button
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 text-sm font-medium"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-6 py-12 text-center">
            <Clock className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No delayed projects</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              All your projects are on schedule.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDelayedProjects;