import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Plus, Users, Calendar, Eye, AlertCircle, MoreVertical, Edit, Trash2, MessageSquare, ArrowLeft } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import ProjectFilters from '../components/ProjectFilters';

const Projects = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const statusFilter = searchParams.get('status') || 'all';
  const departmentFilter = searchParams.get('department') || null;
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(null); // Track which dropdown is open
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [additionalFilters, setAdditionalFilters] = useState(departmentFilter ? { department: departmentFilter } : null);
  const [viewMode, setViewMode] = useState('all');

  useEffect(() => {
    if (viewMode === 'mine') {
      loadAssignedProjects();
    } else {
      loadProjects();
    }
  }, [user, viewMode]);

  useEffect(() => {
    // Initialize filters from URL parameters when component mounts
    if (departmentFilter && user.role === 'admin') {
      setAdditionalFilters({ department: departmentFilter });
    }
  }, [departmentFilter, user.role]);

  useEffect(() => {
    if (projects.length > 0) {
      filterProjects();
    }
  }, [projects, statusFilter, additionalFilters]);

  const handleFilterChange = (filters) => {
    setAdditionalFilters(filters);

    // Update URL parameters
    const newParams = new URLSearchParams(searchParams);
    if (filters.department && filters.department !== 'all') {
      newParams.set('department', filters.department);
    } else {
      newParams.delete('department');
    }
    setSearchParams(newParams);
  };

  const handleClearFilters = () => {
    setAdditionalFilters(null);

    // Remove department parameter from URL
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('department');
    setSearchParams(newParams);
  };

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await api.get('/projects');
      const allProjects = response.data || [];
      // Deduplicate projects by ID
      const uniqueProjects = Array.from(new Map(allProjects.map(item => [item.id, item])).values());
      setProjects(uniqueProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignedProjects = async () => {
    try {
      setLoading(true);
      // Get projects assigned to the current user
      const response = await api.get(`/assignments/employee/${user.id}`);

      // For each project, get additional details including assignment count
      const projectsWithDetails = await Promise.all(
        response.data.map(async (project) => {
          try {
            // Get project details to get assignment count
            const projectDetailResponse = await api.get(`/projects/${project.id}`);
            return {
              ...project,
              assignment_count: projectDetailResponse.data?.assignment_count || 0
            };
          } catch (detailError) {
            console.error(`Error fetching details for project ${project.id}:`, detailError);
            return {
              ...project,
              assignment_count: 0
            };
          }
        })
      );

      // Deduplicate projects by ID
      const uniqueProjects = projectsWithDetails ? Array.from(new Map(projectsWithDetails.map(item => [item.id, item])).values()) : [];
      setProjects(uniqueProjects);
    } catch (error) {
      console.error('Error loading assigned projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const filterProjects = () => {
    let filtered = [...projects];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Apply status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'in-progress') {
        filtered = filtered.filter(project => project.status === 'in-progress');
      } else if (statusFilter === 'completed') {
        filtered = filtered.filter(project => project.status === 'completed');
      } else if (statusFilter === 'pending_approval') {
        filtered = filtered.filter(project => project.status === 'pending_approval');
      } else if (statusFilter === 'delayed') {
        filtered = filtered.filter(project => {
          if (project.status === 'delayed') return true;
          // Also include overdue projects
          const endDate = new Date(project.end_date);
          endDate.setHours(0, 0, 0, 0);
          return endDate < today && ['active', 'in-progress', 'planning'].includes(project.status);
        });
      } else if (statusFilter === 'active') {
        filtered = filtered.filter(project => {
          if (project.status !== 'active' && project.status !== 'in-progress') return false;
          // Exclude overdue projects (they belong in delayed)
          const endDate = new Date(project.end_date);
          endDate.setHours(0, 0, 0, 0);
          return endDate >= today;
        });
      } else if (statusFilter === 'planning') {
        filtered = filtered.filter(project => project.status === 'planning');
      }
    }

    // Apply department filter for admin
    if (user.role === 'admin' && additionalFilters && additionalFilters.department && additionalFilters.department !== 'all') {
      filtered = filtered.filter(project =>
        project.dept_code === additionalFilters.department
      );
    }

    // defined outside the sort for efficiency
    const isUrgent = (dateStr) => {
      const daysLeft = differenceInDays(new Date(dateStr), today);
      return daysLeft >= 0 && daysLeft <= 5;
    };

    filtered.sort((a, b) => {
      // 1. Move completed/archived to the bottom
      const aFinished = a.status === 'completed' || a.status === 'archived';
      const bFinished = b.status === 'completed' || b.status === 'archived';
      if (aFinished && !bFinished) return 1;
      if (!aFinished && bFinished) return -1;

      // 2. Prioritize urgent items (due in 0-5 days)
      const aUrgent = isUrgent(a.end_date);
      const bUrgent = isUrgent(b.end_date);
      if (aUrgent && !bUrgent) return -1;
      if (!aUrgent && bUrgent) return 1;

      // 3. Sort by deadline ascending (nearest first)
      return new Date(a.end_date) - new Date(b.end_date);
    });

    setFilteredProjects(filtered);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'in-progress':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending_approval':
        return 'bg-orange-100 text-orange-800';
      case 'delayed':
        return 'bg-red-100 text-red-800';
      case 'planning':
        return 'bg-purple-100 text-purple-800';
      case 'on-hold':
        return 'bg-gray-200 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleDropdown = (projectId) => {
    setDropdownOpen(dropdownOpen === projectId ? null : projectId);
  };

  const handleDeleteClick = (project) => {
    setProjectToDelete(project);
    setDeleteModalOpen(true);
    setDropdownOpen(null); // Close dropdown
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;

    try {
      await api.delete(`/projects/${projectToDelete.id}`);
      // Refresh the projects list
      loadProjects();
      setDeleteModalOpen(false);
      setProjectToDelete(null);
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
    }
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setProjectToDelete(null);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen && !event.target.closest('.dropdown-container')) {
        setDropdownOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center transition-colors duration-200">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>

        <div className="flex items-center gap-2">
          {/* Show filters for admin */}
          {user.role === 'admin' && (
            <ProjectFilters
              initialFilters={additionalFilters}
              onFilterChange={handleFilterChange}
              onClear={handleClearFilters}
            />
          )}

          {user.role === 'manager' && (
            <div className="bg-gray-100 dark:bg-gray-700 p-0.5 rounded-md inline-flex">
              <button
                onClick={() => setViewMode('all')}
                className={`px-2 py-1 text-xs font-medium rounded-sm transition-all duration-200 ${viewMode === 'all'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                All
              </button>
              <button
                onClick={() => setViewMode('mine')}
                className={`px-2 py-1 text-xs font-medium rounded-sm transition-all duration-200 ${viewMode === 'mine'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                Mine
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map((project) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const endDate = new Date(project.end_date);
          endDate.setHours(0, 0, 0, 0);

          const daysLeft = differenceInDays(endDate, today);
          const isUrgent = daysLeft >= 0 && daysLeft <= 5 && project.status !== 'completed' && project.status !== 'archived';

          // Check if project is overdue but still marked as active/in-progress/planning
          const isOverdue = endDate < today && ['active', 'in-progress', 'planning'].includes(project.status);

          return (
            <div
              key={project.id}
              onClick={() => navigate(`/projects/${project.id}`)}
              className={`bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-md cursor-pointer ${isUrgent ? 'ring-1 ring-red-500 bg-red-50 dark:bg-red-900/10' : ''}`}
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 mr-2">
                    <h3 className="text-base font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      {project.name}

                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2" title={project.description}>
                      {project.description}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${isOverdue ? 'bg-red-100 text-red-800' : getStatusColor(project.status)}`}>
                      {isOverdue ? 'Delayed' :
                        (project.status === 'active' ? 'Active' :
                          project.status === 'pending_approval' ? 'Pending Approval' :
                            project.status === 'delayed' ? 'Delayed' :
                              project.status === 'in-progress' ? 'In Progress' :
                                project.status === 'completed' ? 'Completed' :
                                  project.status === 'archived' ? 'Archived' :
                                    project.status === 'planning' ? 'Planning' :
                                      project.status === 'on-hold' ? 'On Hold' :
                                        project.status)}
                    </span>

                  </div>
                </div>

                <div className="space-y-1 mb-2">
                  <div className={`flex items-center text-xs ${isUrgent ? 'text-red-600 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                    <Calendar className="h-3.5 w-3.5 mr-2" />
                    <span>
                      {format(new Date(project.start_date), 'MMM dd')} - {format(new Date(project.end_date), 'MMM dd, yyyy')}
                    </span>
                    {isUrgent && (
                      <div className="flex items-center ml-2 text-red-600 animate-pulse">
                        <AlertCircle className="h-3.5 w-3.5 mr-1" />
                        <span>Due Soon</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {(user.role === 'employee' || user.role === 'manager') && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-2">
                  {user.role === 'employee' ? (
                    <div className="flex flex-wrap gap-1 justify-end w-full">
                      <Link
                        to={`/projects/${project.id}/submit-status`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors duration-200 whitespace-nowrap"
                      >
                        Submit Status
                      </Link>
                      <Link
                        to={`/projects/${project.id}/discussion`}
                        onClick={(e) => e.stopPropagation()}
                        className="relative inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
                      >
                        <MessageSquare className="h-3.5 w-3.5 mr-1" />
                        Discussion
                        {project.unread_comments_count > 0 && (
                          <span className="absolute -top-1 -right-1 block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-gray-800 bg-red-500" />
                        )}
                      </Link>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1 w-full justify-end">
                      <Link
                        to={`/projects/${project.id}/submit-status`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors duration-200 whitespace-nowrap"
                      >
                        Submit Status
                      </Link>
                      <Link
                        to={`/projects/${project.id}/assign`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
                      >
                        <Users className="h-3.5 w-3.5 mr-1" />
                        Assign
                      </Link>

                      <Link
                        to={`/projects/${project.id}/discussion`}
                        onClick={(e) => e.stopPropagation()}
                        className="relative inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
                      >
                        Discuss
                        {project.unread_comments_count > 0 && (
                          <span className="absolute -top-1 -right-1 block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-gray-800 bg-red-500" />
                        )}
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              {statusFilter !== 'all' ? `No ${statusFilter.replace('_', ' ')} projects` : 'No tasks found'}
            </p>
            <p className="mt-1">
              {user.role === 'employee'
                ? 'You haven\'t been assigned to any tasks yet.'
                : statusFilter !== 'all'
                  ? 'There are no projects with this status at the moment.'
                  : 'Get started by creating a new task.'
              }
            </p>
          </div>
          {user.role === 'manager' && statusFilter === 'all' && (
            <Link
              to="/projects/create"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Link>
          )}
        </div>
      )}
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteConfirm}
        projectName={projectToDelete?.name}
        isCompleted={projectToDelete?.status === 'completed'}
      />
    </div>
  );
};

export default Projects;