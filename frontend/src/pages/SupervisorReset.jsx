import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';

const SupervisorReset = () => {
  const [empCode, setEmpCode] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('employee');
  const [department, setDepartment] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState('reset'); // 'reset', 'delete', or 'create'
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const navigate = useNavigate();

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!empCode.trim()) {
      toast.error('Please enter an employee code');
      return;
    }

    setLoading(true);
    try {
      // Call the supervisor reset password endpoint
      await api.post('/supervisor/reset', { emp_code: empCode.trim() });
      toast.success('Password reset successfully! The password has been set to match the employee code.');
      setSubmitted(true);
    } catch (error) {
      console.error('Reset error:', error);
      if (error.response && error.response.data && error.response.data.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('Failed to reset password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!empCode.trim() || !name.trim()) {
      toast.error('Please enter both employee code and name');
      return;
    }

    setLoading(true);
    try {
      // Call the supervisor create employee endpoint
      const response = await api.post('/supervisor/create', {
        emp_code: empCode.trim(),
        name: name.trim(),
        role,
        department: department.trim() || undefined,
        dept_code: deptCode.trim() || undefined
      });
      toast.success(response.data.message);
      setSubmitted(true);
    } catch (error) {
      console.error('Create error:', error);
      if (error.response && error.response.data && error.response.data.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('Failed to create employee. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubmit = async (e) => {
    e.preventDefault();
    if (!empCode.trim()) {
      toast.error('Please enter an employee code');
      return;
    }
    
    if (deleteConfirmation !== empCode.trim()) {
      toast.error('Please confirm the employee code to delete');
      return;
    }

    setLoading(true);
    try {
      // Call the supervisor delete employee endpoint
      const response = await api.post('/supervisor/delete', { emp_code: empCode.trim() });
      toast.success(response.data.message);
      setSubmitted(true);
    } catch (error) {
      console.error('Delete error:', error);
      if (error.response && error.response.data && error.response.data.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('Failed to delete employee. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setEmpCode('');
    setName('');
    setRole('employee');
    setDepartment('');
    setDeptCode('');
    setDeleteConfirmation('');
  };

  const handleLogout = () => {
    // Remove supervisor authentication from localStorage
    localStorage.removeItem('supervisor_authenticated');
    toast.success('You have been logged out');
    navigate('/supervisor/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow rounded-lg sm:px-10">
          {/* Header with centered heading and logout button */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-center flex-grow text-2xl font-extrabold text-gray-900 dark:text-white">
              Supervisor Tools
            </h2>
            <button
              onClick={handleLogout}
              className="ml-4 px-3 py-1 text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-red-700 dark:hover:bg-red-800 dark:focus:ring-red-600 rounded-md transition-colors duration-200"
            >
              Logout
            </button>
          </div>
          
          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-6">
            Reset password, create or delete employee records
          </p>
          
          {/* Tab navigation */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
            <button
              type="button"
              className={`py-2 px-4 text-sm font-medium ${activeTab === 'reset' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
              onClick={() => setActiveTab('reset')}
            >
              Reset Password
            </button>
            <button
              type="button"
              className={`py-2 px-4 text-sm font-medium ${activeTab === 'create' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
              onClick={() => setActiveTab('create')}
            >
              Create Employee
            </button>
            <button
              type="button"
              className={`py-2 px-4 text-sm font-medium ${activeTab === 'delete' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
              onClick={() => setActiveTab('delete')}
            >
              Delete Employee
            </button>
          </div>

          {submitted ? (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="mt-3 text-center sm:mt-5">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  {activeTab === 'reset' ? 'Password Reset Successful' : activeTab === 'create' ? 'Employee Created Successfully' : 'Employee Deleted Successfully'}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {activeTab === 'reset' 
                      ? `The password for employee code ${empCode} has been reset to match their employee code.`
                      : activeTab === 'create'
                      ? `Employee ${empCode} has been created successfully.`
                      : `Employee ${empCode} and all related data have been deleted successfully.`}
                  </p>
                </div>
              </div>
              <div className="mt-5 sm:mt-6">
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:text-sm"
                >
                  Perform Another Action
                </button>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={activeTab === 'reset' ? handleResetSubmit : activeTab === 'create' ? handleCreateSubmit : handleDeleteSubmit}>
              <div>
                <label htmlFor="emp-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Employee Code
                </label>
                <div className="mt-1">
                  <input
                    id="emp-code"
                    name="emp-code"
                    type="text"
                    required
                    value={empCode}
                    onChange={(e) => setEmpCode(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    placeholder="Enter employee code"
                  />
                </div>
              </div>

              {activeTab === 'create' && (
                <>
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Full Name
                    </label>
                    <div className="mt-1">
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                        placeholder="Enter full name"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Role
                    </label>
                    <div className="mt-1">
                      <select
                        id="role"
                        name="role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      >
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Department
                    </label>
                    <div className="mt-1">
                      <input
                        id="department"
                        name="department"
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                        placeholder="Enter department (optional)"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="dept-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Department Code
                    </label>
                    <div className="mt-1">
                      <input
                        id="dept-code"
                        name="dept-code"
                        type="text"
                        value={deptCode}
                        onChange={(e) => setDeptCode(e.target.value)}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                        placeholder="Enter department code (optional)"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'delete' && (
                <div>
                  <label htmlFor="delete-confirmation" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Confirm Employee Code
                  </label>
                  <div className="mt-1">
                    <input
                      id="delete-confirmation"
                      name="delete-confirmation"
                      type="text"
                      required
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      placeholder="Re-enter employee code to confirm deletion"
                    />
                  </div>
                  <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                    <p>Warning: This action cannot be undone. All employee data will be permanently deleted.</p>
                  </div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    activeTab === 'reset' ? 'Reset Password' : activeTab === 'create' ? 'Create Employee' : 'Delete Employee'
                  )}
                </button>
              </div>
              
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                {activeTab === 'reset' ? (
                  <p>Note: This will set the user's password to match their employee code.</p>
                ) : activeTab === 'create' ? (
                  <p>Note: New employees will have their password set to match their employee code by default.</p>
                ) : (
                  <p>Warning: This will permanently delete the employee and all related data including status reports, project assignments, etc.</p>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupervisorReset;