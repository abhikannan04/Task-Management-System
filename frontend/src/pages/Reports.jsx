import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api'; // Use the actual API service instead of mock data
import { toast } from 'react-toastify';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, Download, Eye, EyeOff, ArrowLeft } from 'lucide-react';

const Reports = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportType, setReportType] = useState('summary'); // 'summary' or 'project_summary'
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [projectData, setProjectData] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [showAllCsvData, setShowAllCsvData] = useState(false);
  // Department filter state for admin role
  const [departmentFilter, setDepartmentFilter] = useState('');
  // Actual departments from API
  const [departments, setDepartments] = useState([]);

  // Fetch projects when component mounts or when report type changes to project_summary
  useEffect(() => {
    if (reportType === 'project_summary') {
      fetchProjects();
    }
  }, [reportType]);

  // Fetch departments for admin role
  useEffect(() => {
    if (user?.role === 'admin') {
      fetchDepartments();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      // For managers, fetch all projects in their department
      // For other roles, use the default endpoint
      let url = '/projects';

      // For managers, we want to show all projects in their department, not just the ones they created
      // The backend already handles this logic, so we don't need to pass any special parameters
      const response = await api.get(url);
      setProjects(response.data || []);
    } catch (error) {
      toast.error('Failed to fetch projects');
      console.error('Error fetching projects:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      // Only fetch departments for admin users
      if (user?.role === 'admin') {
        const response = await api.get('/projects/departments');
        setDepartments(response.data?.data || []);
      }
    } catch (error) {
      // Only show error for admin users since others don't have permission
      if (user?.role === 'admin') {
        toast.error('Failed to fetch departments');
        console.error('Error fetching departments:', error);
      }
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      let response;

      if (reportType === 'project_summary') {
        if (!selectedProject) {
          toast.error('Please select a project');
          setLoading(false);
          return;
        }

        response = await api.post('/reports/generate', {
          report_type: 'project_summary',
          project_id: selectedProject,
          export_format: 'json'
        });
        setProjectData(response.data?.project || response.data);
      } else {
        // For summary reports, include department filter for admin role
        const requestData = {
          report_type: 'summary',
          export_format: 'json'
        };

        // Add department filter for admin users
        if (user?.role === 'admin' && departmentFilter) {
          requestData.department = departmentFilter;
        }

        response = await api.post('/reports/generate', requestData);
        setReportData(response.data);
      }

      // Fetch CSV data when generating any report
      await fetchCsvData();

      toast.success('Report generated successfully!');
    } catch (error) {
      toast.error('Failed to generate report');
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCsvData = async () => {
    try {
      // Prepare request body
      const requestBody = {
        report_type: reportType,
        export_format: 'csv',
        project_id: selectedProject // Include project_id for project summary reports
      };

      // Add department filter for admin users in summary reports
      if (user?.role === 'admin' && reportType === 'summary' && departmentFilter) {
        requestBody.department = departmentFilter;
      }

      // Fetch CSV data as text
      const response = await api.post('/reports/generate', requestBody, {
        responseType: 'text'
      });

      if (response.data) {
        const csvText = response.data;
        const parsedData = parseCsvData(csvText);
        setCsvData(parsedData);
      } else {
        throw new Error('Failed to fetch CSV data');
      }
    } catch (error) {
      console.error('Error fetching CSV data:', error);
      toast.error('Failed to load CSV data');
    }
  };

  const exportReport = async (format) => {
    setExporting(true);
    try {
      // Only show one toast notification for the export process
      const toastId = toast.info(`Exporting report as ${format.toUpperCase()}...`, { autoClose: false });

      let requestBody = {
        report_type: reportType,
        export_format: format
      };

      if (reportType === 'project_summary') {
        if (!selectedProject) {
          toast.update(toastId, { render: 'Please select a project', type: 'error', autoClose: 2000 });
          setExporting(false);
          return;
        }
        requestBody.project_id = selectedProject;
      }

      // Add department filter for admin users in summary reports
      if (user?.role === 'admin' && reportType === 'summary' && departmentFilter) {
        requestBody.department = departmentFilter;
      }

      // Make direct request for file download
      const response = await api.post('/reports/generate', requestBody, {
        responseType: 'blob'
      });

      if (response.data) {
        const blob = response.data;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');

        // Generate descriptive filename based on report type
        let fileName = 'report';
        if (reportType === 'summary') {
          fileName = `Summary Report-${Date.now()}`;
        } else if (reportType === 'project_summary' && projectData) {
          fileName = `Project Report-${projectData.name.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}`;
        } else {
          fileName = `Project Report-${Date.now()}`;
        }

        a.href = url;
        a.download = `${fileName}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Update toast with success message
        toast.update(toastId, {
          render: `${format.toUpperCase()} report exported successfully!`,
          type: 'success',
          autoClose: 2000
        });
      } else {
        const errorData = await response.json();
        toast.update(toastId, { render: errorData?.error || 'Failed to download file', type: 'error', autoClose: 2000 });
        throw new Error(errorData?.error || 'Failed to download file');
      }
    } catch (error) {
      toast.error('Failed to export report');
      console.error('Error exporting report:', error);
    } finally {
      setExporting(false);
    }
  };

  const chartColors = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6'];

  // Add the missing parseCsvData function
  const parseCsvData = (csvText) => {
    // Remove BOM if present
    const cleanText = csvText.replace(/^\uFEFF/, '');

    // Helper function to parse CSV line by line respecting quotes
    const parseCSV = (text) => {
      const result = [];
      let currentRow = [];
      let currentField = '';
      let inQuotes = false;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Escaped quote
            currentField += '"';
            i++; // Skip next quote
          } else {
            // Toggle quotes
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // End of field
          currentRow.push(currentField);
          currentField = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
          // End of row
          // Handle CRLF
          if (char === '\r' && nextChar === '\n') {
            i++;
          }

          currentRow.push(currentField);
          result.push(currentRow);
          currentRow = [];
          currentField = '';
        } else {
          currentField += char;
        }
      }

      // Add last field and row if not empty
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField);
        result.push(currentRow);
      }

      return result;
    };

    const rows = parseCSV(cleanText);

    if (reportType === 'project_summary') {
      // For project summary, parse with these headers: Employee,Action Plan,Action Plan Status
      // Skip first two lines (project details and header)
      // Note: parseCSV returns array of arrays, so we can just slice
      const dataRows = rows.slice(2).filter(row => row.length > 0 && row.some(cell => cell.trim() !== ''));

      // Parse each row into an object
      const parsedData = dataRows.map(row => {
        return {
          employee: row[0] || '',
          action_plan: row[1] || '',
          action_plan_status: row[2] || ''
        };
      });

      return parsedData;
    } else {
      // For summary report, parse with these headers: OSTA No,OSTA,Dept Code,Department,FSTA No,FSTA,Goal No,Goal,Action Plan Code,Action Plan,Responsibility,Employee Code,Status
      // Skip header line
      const dataRows = rows.slice(1).filter(row => row.length > 0 && row.some(cell => cell.trim() !== ''));

      // Parse each row into an object
      const parsedData = dataRows.map(row => {
        // CSV headers: OSTA No,OSTA,Department,FSTA No,FSTA,Goal No,Goal,Action Plan Code,Action Plan,Responsibility,Employee Code,Status
        const ostaName = row.length > 1 ? row[1] : '';
        const fstaName = row.length > 4 ? row[4] : '';
        const actionPlan = row.length > 8 ? row[8] : '';
        const responsibility = row.length > 9 ? row[9] : '';
        const status = row.length > 11 ? row[11] : '';

        return {
          osta_name: ostaName,
          fsta_name: fstaName,
          action_plan: actionPlan,
          responsibility: responsibility,
          status: status
        };
      }).filter(item =>
        item.osta_name || item.fsta_name || item.action_plan || item.responsibility || item.status
      );

      return parsedData;
    }
  };

  // Get top 5 CSV data for display
  const topCsvData = csvData.slice(0, 5);

  return (
    <div className="space-y-2">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back
      </button>
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Report Type
              </label>
              <select
                value={reportType}
                onChange={(e) => {
                  setReportType(e.target.value);
                  setReportData(null);
                  setProjectData(null);
                  setSelectedProject('');
                  setCsvData([]);
                }}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="summary">Summary Report</option>
                {/* Show project summary option for non-admin users */}
                {user?.role !== 'admin' && (
                  <option value="project_summary">Task Summary</option>
                )}
              </select>
            </div>

            {/* Department filter for admin users */}
            {user?.role === 'admin' && reportType === 'summary' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Department
                </label>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Departments</option>
                  {departments.map((dept, index) => (
                    <option key={index} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Show project selection for non-admin users */}
            {user?.role !== 'admin' && reportType === 'project_summary' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select Task
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select a task</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            <button
              onClick={generateReport}
              disabled={loading || (reportType === 'project_summary' && !selectedProject && user?.role !== 'admin' && user?.role !== 'manager')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors duration-200"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>

            {/* Export buttons for non-admin users and managers */}
            {(reportData || projectData) && (user?.role !== 'admin' || user?.role === 'manager') && (
              <>
                <button
                  onClick={() => exportReport('csv')}
                  disabled={exporting}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors duration-200"
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </button>
                {reportType === 'summary' && (
                  <button
                    onClick={() => exportReport('pdf')}
                    disabled={exporting}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors duration-200"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </button>
                )}
              </>
            )}

            {/* Export buttons for admin users - only PDF */}
            {(reportData || projectData) && user?.role === 'admin' && (
              <>
                {reportType === 'summary' && (
                  <button
                    onClick={() => exportReport('pdf')}
                    disabled={exporting}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors duration-200"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Summary Report View */}
      {reportType === 'summary' && reportData && (
        <div className="space-y-6 mt-6">
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Report Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-4 transition-colors duration-200">
                <div className="text-violet-800 dark:text-violet-200 font-bold text-2xl">{reportData?.data?.totalProjects || 0}</div>
                <div className="text-violet-700 dark:text-violet-300">Total Tasks</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 transition-colors duration-200">
                <div className="text-blue-800 dark:text-blue-200 font-bold text-2xl">{reportData?.data?.activeProjects || 0}</div>
                <div className="text-blue-700 dark:text-blue-300">Active Tasks</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 transition-colors duration-200">
                <div className="text-green-800 dark:text-green-200 font-bold text-2xl">{reportData?.data?.completedProjects || 0}</div>
                <div className="text-green-700 dark:text-green-300">Completed Tasks</div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 transition-colors duration-200">
                <div className="text-yellow-800 dark:text-yellow-200 font-bold text-2xl">{reportData?.data?.pendingApprovalProjects || 0}</div>
                <div className="text-yellow-700 dark:text-yellow-300">Pending Approval</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 transition-colors duration-200">
                <div className="text-red-800 dark:text-red-200 font-bold text-2xl">{reportData?.data?.delayedProjects || 0}</div>
                <div className="text-red-700 dark:text-red-300">Delayed Tasks</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Task Status Distribution</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Active', value: reportData?.data?.activeProjects || 0, fill: '#3b82f6' },
                        { name: 'Completed', value: reportData?.data?.completedProjects || 0, fill: '#10b981' },
                        { name: 'Delayed', value: reportData?.data?.delayedProjects || 0, fill: '#ef4444' },
                        { name: 'Pending', value: reportData?.data?.pendingApprovalProjects || 0, fill: '#f59e0b' }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {[
                        { name: 'Active', value: reportData?.data?.activeProjects || 0, fill: '#3b82f6' },
                        { name: 'Completed', value: reportData?.data?.completedProjects || 0, fill: '#10b981' },
                        { name: 'Delayed', value: reportData?.data?.delayedProjects || 0, fill: '#ef4444' },
                        { name: 'Pending', value: reportData?.data?.pendingApprovalProjects || 0, fill: '#f59e0b' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Task Status Overview</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Active', value: reportData?.data?.activeProjects || 0 },
                      { name: 'Completed', value: reportData?.data?.completedProjects || 0 },
                      { name: 'Delayed', value: reportData?.data?.delayedProjects || 0 },
                      { name: 'Pending', value: reportData?.data?.pendingApprovalProjects || 0 }
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6">
                      {[
                        { name: 'Active', value: reportData?.data?.activeProjects || 0, fill: '#3b82f6' },
                        { name: 'Completed', value: reportData?.data?.completedProjects || 0, fill: '#10b981' },
                        { name: 'Delayed', value: reportData?.data?.delayedProjects || 0, fill: '#ef4444' },
                        { name: 'Pending', value: reportData?.data?.pendingApprovalProjects || 0, fill: '#f59e0b' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* CSV Data Display */}
          {csvData.length > 0 && (user?.role !== 'admin' || user?.role === 'manager') && (
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Tasks Information</h2>
                <button
                  onClick={() => setShowAllCsvData(!showAllCsvData)}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
                >
                  {showAllCsvData ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-1" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-1" />
                      View All
                    </>
                  )}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">OSTA Name</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">FSTA Name</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Action Plan</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Responsibility</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {(showAllCsvData ? csvData : topCsvData).map((item, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                        <td className="px-4 py-3 whitespace-normal text-sm text-gray-900 dark:text-white break-words max-w-xs">{item.osta_name}</td>
                        <td className="px-4 py-3 whitespace-normal text-sm text-gray-900 dark:text-white break-words max-w-xs">{item.fsta_name}</td>
                        <td className="px-4 py-3 whitespace-normal text-sm text-gray-900 dark:text-white break-words max-w-xs">{item.action_plan}</td>
                        <td className="px-4 py-3 whitespace-normal text-sm text-gray-900 dark:text-white break-words max-w-xs">{item.responsibility}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${item.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                              item.status === 'In Progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' :
                                item.status === 'Delayed' ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' :
                                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'}`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Project Summary View - For non-admin users and managers */}
      {(user?.role !== 'admin' || user?.role === 'manager') && reportType === 'project_summary' && projectData && (
        <div className="space-y-6 mt-6">
          {/* CSV Data Display for Project Summary */}
          {csvData.length > 0 && (
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Employee</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Action Plan</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Action Plan Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {csvData.map((item, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white truncate max-w-xs" title={item.employee}>{item.employee}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white break-words max-w-md">{item.action_plan}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${item.action_plan_status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                              item.action_plan_status === 'In Progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' :
                                item.action_plan_status === 'Delayed' ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' :
                                  item.action_plan_status === 'Planning' ? 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100' :
                                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'}`}>
                            {item.action_plan_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {!reportData && !projectData && !loading && (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center transition-colors duration-200">
          <FileText className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No report generated</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Select a report type and click "Generate Report" to get started.
          </p>
        </div>
      )}
    </div>
  );
};

export default Reports;