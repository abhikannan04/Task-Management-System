import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../utils/mockData';
import { toast } from 'react-toastify';
import { Users, Calendar, BarChart, FileText, Edit, Trash2, MessageCircle, Send, Clock, CheckCircle, AlertCircle, Briefcase, User } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import api from '../services/api';

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [employeeStatuses, setEmployeeStatuses] = useState([]);
  const [teamActionPlans, setTeamActionPlans] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  const [activeActionPlanView, setActiveActionPlanView] = useState(user?.role === 'employee' ? 'my' : 'team');
  const [activeTab, setActiveTab] = useState('action_plans'); // 'overview', 'action_plans', 'discussion'

  const loadProject = async () => {
    try {
      setLoading(true);
      const response = await apiService.getProject(id);
      setProject(response.data);
    } catch (error) {
      console.error('Error loading project:', error);
      toast.error('Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const response = await apiService.getComments(id);
      setComments(response.data);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await apiService.addComment(id, { content: newComment });
      setNewComment('');
      loadComments();
      toast.success('Comment added');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const handleDeleteProject = async () => {
    if (window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      try {
        await apiService.deleteProject(id);
        toast.success('Task deleted successfully!');
        navigate('/projects');
      } catch (error) {
        toast.error('Failed to delete task');
        console.error('Error deleting project:', error);
      }
    }
  };

  const loadEmployeeContributions = async () => {
    if (user.role === 'employee') {
      try {
        const response = await apiService.getEmployeeStatuses(user.id, id);
        setEmployeeStatuses(response.data);
      } catch (error) {
        console.error('Error loading employee contributions:', error);
      }
    }
  };

  const loadTeamActionPlans = async () => {
    try {
      const response = await apiService.getTeamActionPlans(id);
      setTeamActionPlans(response.data);
    } catch (error) {
      console.error('Error loading team action plans:', error);
    }
  };

  useEffect(() => {
    loadProject();
    loadEmployeeContributions();
    loadTeamActionPlans();
    loadComments();

    // Mark project as viewed
    if (id && user) {
      api.post(`/assignments/${id}/viewed`).catch(err => console.error('Error marking project as viewed:', err));
    }
  }, [id, user.id]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'in-progress': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending_approval': return 'bg-orange-100 text-orange-800';
      case 'delayed': return 'bg-red-100 text-red-800';
      case 'planning': return 'bg-purple-100 text-purple-800';
      case 'on-hold': return 'bg-gray-200 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionPlanStatusColor = (status) => {
    switch (status) {
      case 'started': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'testing': return 'bg-indigo-100 text-indigo-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'under_approval': return 'bg-purple-100 text-purple-800';
      case 'on_hold': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionPlanStatusText = (status) => {
    switch (status) {
      case 'started': return 'Started';
      case 'in_progress': return 'In Progress';
      case 'testing': return 'Testing';
      case 'completed': return 'Completed';
      case 'under_approval': return 'Under Approval';
      case 'on_hold': return 'On Hold';
      default: return status;
    }
  };



  const getRecentActivity = () => {
    const allActivity = [
      ...teamActionPlans.map(p => ({ ...p, type: 'action_plan', date: new Date(p.submitted_at) })),
      ...comments.map(c => ({ ...c, type: 'comment', date: new Date(c.created_at) }))
    ];
    return allActivity.sort((a, b) => b.date - a.date).slice(0, 5);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center transition-colors duration-200">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center transition-colors duration-200">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Task not found</h2>
          <button onClick={() => navigate('/projects')} className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700">
            Back to Tasks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-4 transition-colors duration-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
              {(() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const endDate = new Date(project.end_date);
                endDate.setHours(0, 0, 0, 0);
                const isOverdue = endDate < today && ['active', 'in-progress', 'planning'].includes(project.status);

                return (
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${isOverdue ? 'bg-red-100 text-red-800' : getStatusColor(project.status)}`}>
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
                );
              })()}
            </div>
            <p className="text-gray-500 dark:text-gray-400 max-w-2xl">{project.description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {user.role === 'manager' && parseInt(project.created_by) === parseInt(user.id) && (
              <>
                <button
                  onClick={() => navigate(`/projects/${project.id}/edit`)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Task
                </button>
                <button
                  onClick={handleDeleteProject}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </button>
              </>
            )}

            {user.role === 'employee' && (
              <button
                onClick={() => navigate(`/projects/${project.id}/submit-status`)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
              >
                Submit Status
              </button>
            )}
          </div>
        </div>

        {/* Project Meta Info */}
        <div className="flex flex-wrap gap-x-8 gap-y-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">

          {/* Department */}
          <div className="flex items-center text-gray-500 dark:text-gray-400">
            <Briefcase className="h-5 w-5 mr-2" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider">Department</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {project.department}
              </p>
            </div>
          </div>

          {/* OSTA - Conditional */}
          {(project.osta_name || project.osta_no) && (
            <div className="flex items-center text-gray-500 dark:text-gray-400">
              <FileText className="h-5 w-5 mr-2" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider">OSTA</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {project.osta_name}
                </p>
              </div>
            </div>
          )}

          {/* FSAT - Conditional */}
          {project.fsta_name && (
            <div className="flex items-center text-gray-500 dark:text-gray-400">
              <FileText className="h-5 w-5 mr-2" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider">FSTA</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {project.fsta_name}
                </p>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="flex items-center text-gray-500 dark:text-gray-400">
            <Calendar className="h-5 w-5 mr-2" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider">Timeline</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {format(new Date(project.start_date), 'MMM dd')} - {format(new Date(project.end_date), 'MMM dd, yyyy')}
              </p>
            </div>
          </div>

          {/* Team Size */}
          <div className="flex items-center text-gray-500 dark:text-gray-400">
            <Users className="h-5 w-5 mr-2" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider">Team Size</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {project.team_members ? project.team_members.length : 0} Members
              </p>
            </div>
          </div>

          {/* Created By */}
          <div className="flex items-center text-gray-500 dark:text-gray-400">
            <User className="h-5 w-5 mr-2" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider">Created By</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {project.created_by_name}
              </p>
            </div>
          </div>

          {project.prd_file && (
            <div className="flex items-center text-gray-500 dark:text-gray-400">
              <FileText className="h-5 w-5 mr-2" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider">Resources</p>
                <a
                  href={typeof project.prd_file === 'string' ? JSON.parse(project.prd_file).url : project.prd_file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300"
                >
                  View PRD
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('action_plans')}
            className={`${activeTab === 'action_plans'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
          >
            Action Plans & Activity
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            className={`${activeTab === 'overview'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
          >
            Team Overview
          </button>

        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Team Members Card */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-4 transition-colors duration-200">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Team Members</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Managers Section */}
                {(() => {
                  const managers = [];
                  const employees = [];

                  if (project && project.team_members) {
                    const creatorId = project.created_by;
                    const creatorName = project.created_by_name;

                    project.team_members.forEach(member => {
                      // Check if member is manager, admin, OR the creator (by ID)
                      const isCreator = member.employee_id == creatorId;
                      const isManagerRole = member.employee_role === 'manager' || member.employee_role === 'admin';

                      if (isManagerRole || isCreator) {
                        if (!managers.some(m => m.employee_id == member.employee_id)) {
                          managers.push(member);
                        }
                      } else {
                        employees.push(member);
                      }
                    });

                    // Explicitly add creator if they are not in the list yet
                    if (creatorId && !managers.some(m => m.employee_id == creatorId)) {
                      managers.unshift({
                        employee_id: creatorId,
                        employee_name: creatorName,
                        employee_role: 'manager',
                        latest_status: null,
                        last_active: null
                      });
                    }
                  }

                  const renderMember = (member) => (
                    <div key={member.employee_id} className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg justify-between group hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
                      <div className="flex items-center">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium
                          ${member.employee_role === 'manager' || member.employee_role === 'admin'
                            ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'}`}>
                          {member.employee_name.charAt(0)}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{member.employee_name}</p>
                          {member.last_active && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Active {formatDistanceToNow(new Date(member.last_active), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                      </div>
                      {member.latest_status && (
                        <div className={`h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-gray-800 ${member.latest_status === 'completed' ? 'bg-green-500' :
                          member.latest_status === 'in_progress' ? 'bg-yellow-500' :
                            member.latest_status === 'started' ? 'bg-blue-500' :
                              'bg-gray-400'
                          }`} title={`Latest: ${getActionPlanStatusText(member.latest_status)}`}></div>
                      )}
                    </div>
                  );

                  return (
                    <>
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Managers</h4>
                        {managers.map(renderMember)}
                      </div>
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Team Members</h4>
                        {employees.length > 0 ? employees.map(renderMember) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400 italic">No team members assigned yet.</p>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">


              {/* Recent Activity Card */}
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-4 transition-colors duration-200">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  {getRecentActivity().length > 0 ? (
                    getRecentActivity().map((activity, idx) => (
                      <div key={idx} className="flex gap-3 text-sm">
                        <div className="mt-0.5 flex-shrink-0">
                          {activity.type === 'comment' ? (
                            <MessageCircle className="h-4 w-4 text-gray-400" />
                          ) : (
                            <FileText className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-gray-900 dark:text-white">
                            <span className="font-medium">{activity.user_name || activity.employee_name}</span>
                            {' '}
                            {activity.type === 'comment' ? 'commented' : 'updated status'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDistanceToNow(activity.date, { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">No recent activity.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Plans Tab */}
        {activeTab === 'action_plans' && (
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-200">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex" aria-label="Tabs">
                {user.role === 'employee' && (
                  <button
                    onClick={() => setActiveActionPlanView('my')}
                    className={`${activeActionPlanView === 'my'
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                      } w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors duration-200`}
                  >
                    My Action Plans
                  </button>
                )}
                <button
                  onClick={() => setActiveActionPlanView('team')}
                  className={`${activeActionPlanView === 'team'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                    } ${user.role === 'employee' ? 'w-1/2' : 'w-full'} py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors duration-200`}
                >
                  Team Action Plans
                </button>
              </nav>
            </div>

            <div className="p-2">
              {activeActionPlanView === 'my' && user.role === 'employee' ? (
                // My Action Plans List
                employeeStatuses.length > 0 ? (
                  <div className="space-y-3">
                    {employeeStatuses.map((status) => (
                      <div key={status.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0 py-2 last:pb-0 flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            {format(new Date(status.submitted_at), 'MMM dd, yyyy HH:mm')}
                          </div>
                          <p className="text-gray-900 dark:text-white whitespace-pre-wrap font-semibold text-sm">
                            {status.status_text}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <Link
                            to={`/action-plans/${status.id}?tab=activities`}
                            className="inline-flex justify-center items-center px-2 py-1.5 w-28 border border-primary-600 text-xs font-medium rounded text-primary-600 bg-white hover:bg-primary-50 dark:bg-gray-800 dark:text-primary-400 dark:border-primary-400 dark:hover:bg-gray-700 transition-colors duration-200"
                          >
                            Add Instance
                          </Link>
                          <Link
                            to={`/projects/${id}/discussion`}
                            state={{
                              citedActionPlan: {
                                id: status.id,
                                text: status.status_text,
                                user_name: 'You',
                                submitted_at: status.submitted_at
                              }
                            }}
                            className="inline-flex justify-center items-center px-2 py-1.5 w-28 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors duration-200"
                          >
                            Discussion
                          </Link>
                        </div>


                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No action plans submitted yet.
                  </div>
                )
              ) : (
                // Team Activity Feed
                teamActionPlans && teamActionPlans.length > 0 ? (
                  <div className="relative">
                    {/* Activity Feed Line */}
                    <div className="absolute top-0 bottom-0 left-4 w-px bg-gray-200 dark:bg-gray-700"></div>

                    <div className="space-y-4">
                      {teamActionPlans.map((plan) => (
                        <div key={plan.id} className="relative flex gap-4">
                          {/* Avatar */}
                          <div className="relative z-10">
                            <div className="h-8 w-8 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center">
                              <div className="h-6 w-6 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-xs font-medium text-primary-700 dark:text-primary-300">
                                {plan.employee_name.charAt(0)}
                              </div>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 shadow-sm flex flex-row gap-2">
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-1">
                                <div>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white mr-2">
                                    {plan.employee_name}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    updated status {formatDistanceToNow(new Date(plan.submitted_at), { addSuffix: true })}
                                  </span>
                                </div>
                              </div>
                              <div className="mb-1">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white whitespace-pre-wrap">
                                  {plan.status_text}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 shrink-0 justify-start">
                              {/* Logic for Add/View Instance Button */}
                              {/* Manager/Admin or Creator -> Add Instance */}
                              {(user.role === 'manager' || user.role === 'admin' || plan.employee_id === user.id) ? (
                                <Link
                                  to={`/action-plans/${plan.id}?tab=activities`}
                                  className="inline-flex justify-center items-center px-2 py-1.5 w-28 border border-primary-600 text-xs font-medium rounded text-primary-600 bg-white hover:bg-primary-50 dark:bg-gray-800 dark:text-primary-400 dark:border-primary-400 dark:hover:bg-gray-700 transition-colors duration-200"
                                >
                                  Add Instance
                                </Link>
                              ) : (
                                /* Non-creator Employee -> View Instance */
                                <Link
                                  to={`/action-plans/${plan.id}?tab=activities`}
                                  className="inline-flex justify-center items-center px-2 py-1.5 w-28 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors duration-200"
                                >
                                  View Instance
                                </Link>
                              )}
                              <Link
                                to={`/projects/${id}/discussion`}
                                state={{
                                  citedActionPlan: {
                                    id: plan.id,
                                    text: plan.status_text,
                                    user_name: plan.employee_name,
                                    submitted_at: plan.submitted_at
                                  }
                                }}
                                className="inline-flex justify-center items-center px-2 py-1.5 w-28 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors duration-200"
                              >
                                Discussion
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}``
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No team activity found.
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Discussion Tab */}

      </div>
    </div>
  );
};

export default ProjectDetails;