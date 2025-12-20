import { faker } from '@faker-js/faker';
import api from '../services/api';

// API service functions
export const apiService = {
  // Auth
  login: (emp_code, password) => api.post('/auth/login', { emp_code, password }),
  selfRegister: (userData) => api.post('/auth/self-register', userData),
  getProfile: () => api.get('/auth/profile'),

  // Users
  getAllUsers: () => api.get('/users'),
  getTotalEmployees: () => api.get('/users/total'),

  // Projects
  getProjects: () => api.get('/projects'),
  getProject: (id) => api.get(`/projects/${id}`),
  addComment: (id, data) => api.post(`/projects/${id}/comments`, data),
  getComments: (id) => api.get(`/projects/${id}/comments`),
  getManagerNotifications: () => api.get('/projects/notifications'),
  getPendingCompletions: () => api.get('/projects/pending-completions'),
  getDelayedProjects: () => api.get('/projects/delayed'),
  getEmployeePendingApprovals: () => api.get('/projects/employee/pending-approvals'),
  getEmployeeDelayedProjects: () => api.get('/projects/employee/delayed'),
  getEmployeeApprovedActionPlans: () => api.get('/projects/employee/approved-action-plans'),
  getEmployeePendingActionPlans: () => api.get('/projects/employee/pending-action-plans'),
  getEmployeeRejectedActionPlans: () => api.get('/projects/employee/rejected-action-plans'),
  getEmployeeTotalActionPlans: () => api.get('/projects/employee/total-action-plans'),
  updateDelayedProjects: () => api.post('/projects/update-delayed'),
  // Add new project completion endpoints
  requestProjectCompletion: (projectId) => api.post(`/projects/${projectId}/request-completion`),
  approveProjectCompletion: (projectId) => api.post(`/projects/${projectId}/approve-completion`),
  rejectProjectCompletion: (projectId, reason) => api.post(`/projects/${projectId}/reject-completion`, { reason }),

  // OSTA and FSTA data
  getOstaData: () => api.get('/projects/osta'),
  getFstaData: () => api.get('/projects/fsta'),
  addOsta: (name) => api.post('/projects/osta', { name }),
  addFsta: (name) => api.post('/projects/fsta', { name }),
  createProject: (projectData) => {
    // Check if we have FormData (file upload) or regular object
    if (projectData instanceof FormData) {
      return api.uploadFile('/projects', projectData);
    } else {
      return api.post('/projects', projectData);
    }
  },
  updateProject: (id, projectData) => {
    // Check if we have FormData (file upload) or regular object
    if (projectData instanceof FormData) {
      return api.uploadFile(`/projects/${id}`, projectData);
    } else {
      return api.put(`/projects/${id}`, projectData);
    }
  },
  deleteProject: (id) => api.delete(`/projects/${id}`),

  // Assignments
  getAssignments: (projectId) => api.get(`/assignments/project/${projectId}`),
  assignEmployee: (assignmentData) => api.post('/assignments', assignmentData),
  unassignEmployee: (id) => api.delete(`/assignments/${id}`),

  // Status
  submitStatus: (statusData) => api.post('/statuses', statusData),
  getRecentStatuses: () => api.get('/statuses/recent'),
  getTeamUpdates: () => api.get('/statuses/team-updates'),
  getAllTeamUpdates: () => api.get('/statuses/all-team-updates'),
  getEmployeePendingApprovals: () => api.get('/projects/employee/pending-approvals'),
  getEmployeeUpdates: (employeeId) => api.get(`/statuses/employee/${employeeId}/updates`),
  getProjectUpdates: (projectId) => api.get(`/statuses/project/${projectId}/updates`),
  getEmployeeStatuses: (employeeId, projectId) => api.get(`/statuses/employee/${employeeId}/${projectId}`),
  // New method for getting pending action plans count
  getPendingActionPlansCount: () => api.get('/statuses/pending-action-plans/count'),
  // New method for deleting action plans
  deleteActionPlan: (statusId) => api.remove(`/statuses/action-plan/${statusId}`),
  // New method for updating action plan status
  // New method for updating action plan status
  updateActionPlanStatus: (statusId, data) => api.put(`/statuses/action-plan/${statusId}`, data),
  // New method for marking action plan as read
  markActionPlanRead: (statusId) => api.post(`/statuses/action-plan/${statusId}/read`),

  // Action plan endpoints
  getActionPlansByStatus: (status) => api.get(`/projects/employee/action-plans/${status}`),
  getApprovedActionPlans: () => api.get('/projects/employee/approved-action-plans'),
  getPendingActionPlans: () => api.get('/projects/employee/pending-action-plans'),
  getRejectedActionPlans: () => api.get('/projects/employee/rejected-action-plans'),
  // Team action plans endpoint
  getTeamActionPlans: (projectId) => api.get(`/projects/${projectId}/team-action-plans`),

  // File downloads
  downloadFile: (statusId, filename) => {
    return api.get(`/uploads/file/${statusId}/${filename}`, {
      responseType: 'blob'
    });
  },

  // Reports
  generateReport: (reportData) => api.post('/reports/generate', reportData),
};

// Storage utility functions
export const getStoredData = (key, defaultValue = []) => {
  try {
    const stored = localStorage.getItem(`psm_${key}`);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    return defaultValue;
  }
};

export const setStoredData = (key, data) => {
  localStorage.setItem(`psm_${key}`, JSON.stringify(data));
};

// Initialize localStorage (no longer needed with real backend)
export const initializeMockData = () => {
  // No initialization needed with real backend
};

export const mockUsers = [
  {
    id: 1,
    emp_code: 'EMP001',
    password: 'admin123',
    role: 'admin',
    name: 'John Administrator',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01')
  },
  {
    id: 2,
    emp_code: 'EMP002',
    password: 'manager123',
    role: 'manager',
    name: 'Sarah Manager',
    created_at: new Date('2024-01-02'),
    updated_at: new Date('2024-01-02')
  },
  {
    id: 3,
    emp_code: 'EMP003',
    password: 'manager123',
    role: 'manager',
    name: 'Mike Manager',
    created_at: new Date('2024-01-03'),
    updated_at: new Date('2024-01-03')
  },
  {
    id: 4,
    emp_code: 'EMP004',
    password: 'emp123',
    role: 'employee',
    name: 'Alice Employee',
    created_at: new Date('2024-01-04'),
    updated_at: new Date('2024-01-04')
  },
  {
    id: 5,
    emp_code: 'EMP005',
    password: 'emp123',
    role: 'employee',
    name: 'Bob Employee',
    created_at: new Date('2024-01-05'),
    updated_at: new Date('2024-01-05')
  },
  {
    id: 6,
    emp_code: 'EMP006',
    password: 'emp123',
    role: 'employee',
    name: 'Carol Employee',
    created_at: new Date('2024-01-06'),
    updated_at: new Date('2024-01-06')
  }
];

const generateMockProjects = () => {
  const projects = [];
  for (let i = 1; i <= 8; i++) {
    projects.push({
      id: i,
      name: faker.company.catchPhrase(),
      description: faker.lorem.paragraph(),
      created_by: faker.helpers.arrayElement([1, 2, 3]),
      start_date: faker.date.recent({ days: 30 }),
      end_date: faker.date.future({ years: 1 }),
      status: faker.helpers.arrayElement(['planning', 'active', 'pending_approval', 'completed']),
      created_at: faker.date.recent({ days: 60 }),
      updated_at: faker.date.recent({ days: 30 })
    });
  }
  return projects;
};

const generateMockAssignments = (projects) => {
  const assignments = [];
  let id = 1;

  projects.forEach(project => {
    const employeeIds = faker.helpers.arrayElements([4, 5, 6], { min: 1, max: 3 });
    employeeIds.forEach(employeeId => {
      assignments.push({
        id: id++,
        project_id: project.id,
        employee_id: employeeId,
        assigned_by: project.created_by,
        assigned_at: faker.date.recent({ days: 20 })
      });
    });
  });

  return assignments;
};

const generateMockStatuses = (assignments) => {
  const statuses = [];
  let id = 1;

  assignments.forEach(assignment => {
    const numStatuses = faker.number.int({ min: 5, max: 15 });
    for (let i = 0; i < numStatuses; i++) {
      const submitDate = faker.date.recent({ days: 20 });
      statuses.push({
        id: id++,
        employee_id: assignment.employee_id,
        project_id: assignment.project_id,
        date: submitDate,
        status_text: faker.lorem.sentences(3),
        hours_worked: faker.number.float({ min: 1, max: 8, fractionDigits: 1 }),
        progress_percentage: faker.number.int({ min: 5, max: 100 }),
        attachments: [],
        submitted_at: submitDate,
        reviewed_by: faker.helpers.maybe(() => faker.helpers.arrayElement([2, 3]), { probability: 0.7 }),
        review_status: faker.helpers.arrayElement(['active', 'approved', 'rejected']),
        review_comments: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.5 }),
        reviewed_at: faker.helpers.maybe(() => faker.date.recent({ days: 10 }), { probability: 0.7 })
      });
    }
  });

  return statuses;
};

// Initialize mock data
export const mockProjects = generateMockProjects();
export const mockAssignments = generateMockAssignments(mockProjects);
export const mockStatuses = generateMockStatuses(mockAssignments);