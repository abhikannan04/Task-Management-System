import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../utils/mockData';
import { toast } from 'react-toastify';
import { Users, X, ChevronDown, Search } from 'lucide-react';

const AssignEmployees = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [managers, setManagers] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningManager, setAssigningManager] = useState(false);
  const [assigningEmployee, setAssigningEmployee] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('');

  // Custom dropdown states
  const [isDepartmentDropdownOpen, setIsDepartmentDropdownOpen] = useState(false);
  const [isManagerDropdownOpen, setIsManagerDropdownOpen] = useState(false);
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);

  const [selectedManager, setSelectedManager] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');

  // Search terms
  const [departmentSearchTerm, setDepartmentSearchTerm] = useState('');
  const [managerSearchTerm, setManagerSearchTerm] = useState('');
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');

  const departmentDropdownRef = useRef(null);
  const managerDropdownRef = useRef(null);
  const employeeDropdownRef = useRef(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (departmentDropdownRef.current && !departmentDropdownRef.current.contains(event.target)) {
        setIsDepartmentDropdownOpen(false);
        setDepartmentSearchTerm(''); // Clear search when closing
      }
      if (managerDropdownRef.current && !managerDropdownRef.current.contains(event.target)) {
        setIsManagerDropdownOpen(false);
        setManagerSearchTerm(''); // Clear search when closing
      }
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target)) {
        setIsEmployeeDropdownOpen(false);
        setEmployeeSearchTerm(''); // Clear search when closing
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get project details
      const projectResponse = await apiService.getProject(id);
      const projectData = projectResponse.data;
      setProject(projectData);

      // Get all employees from the backend
      const usersResponse = await apiService.getAllUsers();

      // Include both employees and managers for assignment
      const managerList = usersResponse.data.filter(u => u.role === 'manager');
      const empList = usersResponse.data.filter(u => u.role === 'employee');

      setManagers(managerList);
      setEmployeesList(empList);

      // Set default department to manager's department
      if (user && user.department) {
        setSelectedDepartment(user.department);
      }
    } catch (error) {
      toast.error('Failed to load data');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique departments from employees
  const getUniqueDepartments = () => {
    const departments = managers.map(emp => emp.department ? emp.department.trim() : emp.department);
    return [...new Set(departments)].filter(Boolean);
  };

  // Filter departments based on search term
  const getFilteredDepartments = () => {
    const uniqueDepartments = getUniqueDepartments();
    return uniqueDepartments.filter(dept =>
      dept.toLowerCase().includes(departmentSearchTerm.toLowerCase())
    );
  };

  // Filter managers based on selected department
  const getFilteredManagers = () => {
    let filteredManagers = managers;

    // Filter by department if selected
    if (selectedDepartment) {
      filteredManagers = filteredManagers.filter(emp =>
        emp.department && emp.department.trim() === selectedDepartment.trim()
      );
    }

    // Filter by search term if provided
    if (managerSearchTerm) {
      filteredManagers = filteredManagers.filter(emp =>
        emp.name.toLowerCase().includes(managerSearchTerm.toLowerCase())
      );
    }

    return filteredManagers;
  };

  // Filter employees - Now includes department filter
  const getFilteredEmployees = () => {
    let filteredEmployees = employeesList;

    // Filter by department if selected
    if (selectedDepartment) {
      filteredEmployees = filteredEmployees.filter(emp =>
        emp.department && emp.department.trim() === selectedDepartment.trim()
      );
    }

    // Filter by search term if provided
    if (employeeSearchTerm) {
      filteredEmployees = filteredEmployees.filter(emp =>
        emp.name.toLowerCase().includes(employeeSearchTerm.toLowerCase())
      );
    }

    return filteredEmployees;
  };

  const loadAssignments = async () => {
    try {
      const assignmentsResponse = await apiService.getAssignments(id);
      // Deduplicate assignments by employee_id to prevent duplicates in the list
      const uniqueAssignments = Array.from(new Map(assignmentsResponse.data.map(item => [item.employee_id, item])).values());
      setAssignments(uniqueAssignments);
    } catch (error) {
      toast.error('Failed to load assignments');
      console.error('Error loading assignments:', error);
    }
  };

  useEffect(() => {
    if (project) {
      loadAssignments();
    }
  }, [project]);

  const handleAssignManager = async () => {
    if (project?.status === 'completed') {
      toast.error('Cannot assign to a completed project');
      return;
    }

    setAssigningManager(true);
    try {
      await apiService.assignEmployee({
        project_id: parseInt(id),
        employee_id: parseInt(selectedManager)
      });

      toast.success('Manager assigned successfully!');
      setSelectedManager('');
      setManagerSearchTerm('');
      loadAssignments();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to assign manager');
    } finally {
      setAssigningManager(false);
    }
  };

  const handleAssignEmployee = async () => {
    if (project?.status === 'completed') {
      toast.error('Cannot assign to a completed project');
      return;
    }

    setAssigningEmployee(true);
    try {
      await apiService.assignEmployee({
        project_id: parseInt(id),
        employee_id: parseInt(selectedEmployee)
      });

      toast.success('Employee assigned successfully!');
      setSelectedEmployee('');
      setEmployeeSearchTerm('');
      loadAssignments();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to assign employee');
    } finally {
      setAssigningEmployee(false);
    }
  };

  const unassignEmployee = async (assignmentId) => {
    if (project?.status === 'completed') {
      toast.error('Cannot unassign employees from a completed project');
      return;
    }

    try {
      await apiService.unassignEmployee(assignmentId);
      toast.success('Employee unassigned successfully!');
      loadAssignments();
    } catch (error) {
      toast.error('Failed to unassign employee');
      console.error('Error unassigning employee:', error);
    }
  };

  // Handle department selection
  const handleDepartmentSelect = (dept) => {
    setSelectedDepartment(dept);
    setIsDepartmentDropdownOpen(false);
    setDepartmentSearchTerm(''); // Clear search when selecting
  };

  // Handle manager selection
  const handleManagerSelect = (managerId) => {
    setSelectedManager(managerId);
    setIsManagerDropdownOpen(false);
    setManagerSearchTerm('');
  };

  // Handle employee selection
  const handleEmployeeSelect = (employeeId) => {
    setSelectedEmployee(employeeId);
    setIsEmployeeDropdownOpen(false);
    setEmployeeSearchTerm(''); // Clear search when selecting
  };

  // Handle department search input
  const handleDepartmentSearch = (e) => {
    setDepartmentSearchTerm(e.target.value);
  };

  // Handle manager search input
  const handleManagerSearch = (e) => {
    setManagerSearchTerm(e.target.value);
  };

  // Handle employee search input
  const handleEmployeeSearch = (e) => {
    setEmployeeSearchTerm(e.target.value);
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


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assignment Form */}
        <div className="lg:col-span-1 space-y-4">
          {/* Assign Manager Section */}
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-4 transition-colors duration-200">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Assign Manager</h2>

            {/* Department Filter for Managers only */}
            <div className="mb-2">
              <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Filter by Department
              </label>
              <div className="mt-1 relative" ref={departmentDropdownRef}>
                <button
                  type="button"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 text-left flex justify-between items-center"
                  onClick={() => setIsDepartmentDropdownOpen(!isDepartmentDropdownOpen)}
                >
                  <span>{selectedDepartment || 'All Departments'}</span>
                  <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isDepartmentDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDepartmentDropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full rounded-md bg-white dark:bg-gray-700 shadow-lg max-h-60 overflow-hidden hide-scrollbar">
                    <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 text-sm"
                          placeholder="Search departments..."
                          value={departmentSearchTerm}
                          onChange={handleDepartmentSearch}
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="py-1 overflow-y-auto hide-scrollbar" style={{ maxHeight: '12rem' }}>
                      <button
                        className="block w-full text-left px-4 py-3 text-base text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                        onClick={() => handleDepartmentSelect('')}
                      >
                        All Departments
                      </button>
                      {getFilteredDepartments().map((dept) => (
                        <button
                          key={dept}
                          className="block w-full text-left px-4 py-3 text-base text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                          onClick={() => handleDepartmentSelect(dept)}
                        >
                          {dept}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Manager</label>
                <div className="mt-1 relative" ref={managerDropdownRef}>
                  <button
                    type="button"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 text-left flex justify-between items-center"
                    onClick={() => setIsManagerDropdownOpen(!isManagerDropdownOpen)}
                  >
                    <span>{selectedManager ? getFilteredManagers().find(m => m.id == selectedManager)?.name : 'Choose a manager'}</span>
                    <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isManagerDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isManagerDropdownOpen && (
                    <div className="absolute z-10 mt-1 w-full rounded-md bg-white dark:bg-gray-700 shadow-lg max-h-60 overflow-hidden hide-scrollbar">
                      <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 text-sm"
                            placeholder="Search managers..."
                            value={managerSearchTerm}
                            onChange={handleManagerSearch}
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="py-1 overflow-y-auto hide-scrollbar" style={{ maxHeight: '12rem' }}>
                        {getFilteredManagers()
                          .filter(m => !assignments.some(a => a.employee_id === m.id))
                          .map((manager) => (
                            <button
                              key={manager.id}
                              type="button"
                              className="block w-full text-left px-4 py-3 text-base text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                              onClick={() => handleManagerSelect(manager.id)}
                            >
                              {manager.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleAssignManager}
                disabled={assigningManager || !selectedManager}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none disabled:opacity-50 transition-colors duration-200"
              >
                {assigningManager ? 'Assigning...' : 'Assign Manager'}
              </button>
            </div>
          </div>

          {/* Assign Employee Section (No Filter) */}
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-4 transition-colors duration-200">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Assign Employee</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Employee</label>
                <div className="mt-1 relative" ref={employeeDropdownRef}>
                  <button
                    type="button"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 text-left flex justify-between items-center"
                    onClick={() => setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
                  >
                    <span>{selectedEmployee ? getFilteredEmployees().find(e => e.id == selectedEmployee)?.name : 'Choose an employee'}</span>
                    <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isEmployeeDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isEmployeeDropdownOpen && (
                    <div className="absolute z-10 mt-1 w-full rounded-md bg-white dark:bg-gray-700 shadow-lg max-h-60 overflow-hidden hide-scrollbar">
                      <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 text-sm"
                            placeholder="Search employees..."
                            value={employeeSearchTerm}
                            onChange={handleEmployeeSearch}
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="py-1 overflow-y-auto hide-scrollbar" style={{ maxHeight: '12rem' }}>
                        {getFilteredEmployees()
                          .filter(e => !assignments.some(a => a.employee_id === e.id))
                          .map((employee) => (
                            <button
                              key={employee.id}
                              type="button"
                              className="block w-full text-left px-4 py-3 text-base text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                              onClick={() => handleEmployeeSelect(employee.id)}
                            >
                              {employee.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleAssignEmployee}
                disabled={assigningEmployee || !selectedEmployee}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none disabled:opacity-50 transition-colors duration-200"
              >
                {assigningEmployee ? 'Assigning...' : 'Assign Employee'}
              </button>
            </div>
          </div>
        </div>

        {/* Assigned Employees */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Assigned Employees</h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {assignments.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Users className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No users assigned</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Assign users to this project to get started.
                  </p>
                </div>
              ) : (
                <div>

                  {assignments.filter(a => a.employee_role === 'manager').length === 0 ? (
                    <div className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 text-center italic">
                      No managers assigned
                    </div>
                  ) : (
                    assignments.filter(a => a.employee_role === 'manager').map((assignment) => (
                      <div key={assignment.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <span className="text-purple-800 dark:text-purple-200 font-medium">
                              {assignment.employee_name.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">{assignment.employee_name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{assignment.employee_email}</p>
                            {assignment.employee_department && (
                              <p className="text-xs text-gray-400 dark:text-gray-500">{assignment.employee_department}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => unassignEmployee(assignment.id)}
                          className="inline-flex items-center p-2 border border-transparent rounded-full text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    ))
                  )}


                  {assignments.filter(a => a.employee_role === 'employee').length === 0 ? (
                    <div className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 text-center italic">
                      No employees assigned
                    </div>
                  ) : (
                    assignments.filter(a => a.employee_role === 'employee').map((assignment) => (
                      <div key={assignment.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                            <span className="text-primary-800 dark:text-primary-200 font-medium">
                              {assignment.employee_name.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">{assignment.employee_name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{assignment.employee_email}</p>
                            {assignment.employee_department && (
                              <p className="text-xs text-gray-400 dark:text-gray-500">{assignment.employee_department}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => unassignEmployee(assignment.id)}
                          className="inline-flex items-center p-2 border border-transparent rounded-full text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button
          onClick={() => navigate('/projects')}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
        >
          Back to Projects
        </button>
      </div>
    </div>
  );
};

export default AssignEmployees;