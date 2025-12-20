import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, FileText, X, User, Plus } from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { apiService } from '../utils/mockData';

const EditProject = () => {
  const { user } = useAuth();
  const { id } = useParams(); // Get project ID from URL
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [projectData, setProjectData] = useState(null);
  const [prdFile, setPrdFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [existingPrdFile, setExistingPrdFile] = useState(null);
  const [removeExistingFile, setRemoveExistingFile] = useState(false);

  const { register, handleSubmit, formState: { errors }, watch, reset, setValue } = useForm();

  // Get today's date in YYYY-MM-DD format for min date validation
  const today = new Date().toISOString().split('T')[0];

  // Format date to YYYY-MM-DD format for input fields
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Ensure we get the date in local timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fetch project data when component mounts
  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/projects/${id}`);
        const project = response.data;
        setProjectData(project);

        // Set existing PRD file if it exists
        if (project.prd_file) {
          setExistingPrdFile(project.prd_file);
        }

        // Populate form with project data, formatting dates properly
        reset({
          name: project.name,
          description: project.description,
          start_date: formatDateForInput(project.start_date),
          end_date: formatDateForInput(project.end_date),
          osta_no: project.osta_no || '',
          osta_name: project.osta_name || '',
          fsta_name: project.fsta_name || '',
          dept_code: project.dept_code || '00',
          department: project.department || 'Systems'
        });
      } catch (error) {
        toast.error('Failed to load project data');
        console.error('Error loading project:', error);
        navigate('/projects');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProject();
    }
  }, [id, reset, navigate]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Create FormData to handle file uploads
      const formData = new FormData();

      // Append all text fields
      Object.keys(data).forEach(key => {
        // Skip empty osta_no to prevent validation errors (empty string is not a valid number)
        if (key === 'osta_no' && !data[key]) {
          return;
        }
        formData.append(key, data[key]);
      });

      // If user wants to remove existing file, add flag
      if (removeExistingFile) {
        formData.append('remove_prd_file', 'true');
      }
      // Append PRD file if selected
      else if (prdFile) {
        formData.append('prd_file', prdFile);
      }

      // Update project with file upload
      await api.put(`/projects/${id}`, formData);

      toast.success('Project updated successfully!');
      navigate('/projects');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update project');
      console.error('Error updating project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif'
      ];

      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid file type. Only PDF, Word, Excel, text, and image files are allowed.');
        e.target.value = null;
        return;
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size too large. Maximum size is 10MB.');
        e.target.value = null;
        return;
      }

      setPrdFile(file);
      setRemoveExistingFile(false); // Cancel removal if new file is selected

      // Create preview URL for images
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    } else {
      setPrdFile(null);
    }
  };

  const handleRemoveExistingFile = () => {
    setRemoveExistingFile(true);
    setExistingPrdFile(null);
  };

  if (loading && !projectData) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center transition-colors duration-200">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-16">
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 transition-colors duration-200">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Project</h2>
        </div>

        {loading ? (
          <div className="px-6 py-12 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-6 space-y-6">
            {/* OSTA Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="osta_no" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  OSTA No
                </label>
                <input
                  {...register('osta_no')}
                  type="number"
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                  placeholder="Enter OSTA number"
                />
              </div>

              <div>
                <label htmlFor="osta_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  OSTA Name
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    {...register('osta_name')}
                    type="text"
                    className="pl-10 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                    placeholder="Enter OSTA name"
                  />
                </div>
              </div>
            </div>

            {/* Fixed Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="dept_code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Dept Code
                </label>
                <input
                  {...register('dept_code')}
                  type="text"
                  defaultValue="00"
                  readOnly
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed transition-colors duration-200"
                />
              </div>

              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Department
                </label>
                <input
                  {...register('department')}
                  type="text"
                  defaultValue="Systems"
                  readOnly
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed transition-colors duration-200"
                />
              </div>
            </div>

            {/* FSTA Name */}
            <div>
              <label htmlFor="fsta_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                FSTA Name
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  {...register('fsta_name')}
                  type="text"
                  className="pl-10 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                  placeholder="Enter FSTA name"
                />
              </div>
            </div>

            {/* Project Name and PRD File in the same row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Project Name
                </label>
                <input
                  {...register('name', {
                    required: 'Project name is required',
                    minLength: { value: 3, message: 'Project name must be at least 3 characters' }
                  })}
                  type="text"
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                  placeholder="Enter project name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="prd_file" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Product Requirements Document (PRD)
                </label>

                {/* Display existing file if it exists and not marked for removal */}
                {existingPrdFile && !removeExistingFile && !prdFile && (
                  <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-md flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {existingPrdFile.originalname || 'Existing PRD File'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveExistingFile}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                )}

                <div className="mt-1 flex items-center">
                  <label className="relative cursor-pointer bg-white dark:bg-gray-700 rounded-md font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 transition-colors duration-200">
                    <span className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                      <FileText className="h-5 w-5 mr-2" />
                      {prdFile || (existingPrdFile && !removeExistingFile) ? 'Change File' : 'Upload File'}
                    </span>
                    <input
                      type="file"
                      id="prd_file"
                      className="sr-only"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif"
                    />
                  </label>
                  {prdFile && (
                    <span className="ml-4 text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                      {prdFile.name}
                    </span>
                  )}
                </div>
                {previewUrl && (
                  <div className="mt-2">
                    <img src={previewUrl} alt="Preview" className="max-h-32 max-w-xs rounded-md" />
                  </div>
                )}
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Upload PRD file (PDF, Word, Excel, Text, or Image files up to 10MB)
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                {...register('description', {
                  required: 'Description is required',
                  maxLength: { value: 1000, message: 'Description must be less than 1000 characters' }
                })}
                rows={4}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                placeholder="Enter project description"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    {...register('start_date', {
                      required: 'Start date is required'
                    })}
                    type="date"
                    className="pl-10 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                  />
                </div>
                {errors.start_date && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.start_date.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    {...register('end_date', {
                      required: 'End date is required',
                      validate: (value) => {
                        const startDate = watch('start_date');

                        // Check if end date is after start date
                        if (startDate) {
                          const selectedStartDate = new Date(startDate);
                          const selectedEndDate = new Date(value);
                          return selectedEndDate >= selectedStartDate || 'End date must be after start date';
                        }

                        return true;
                      }
                    })}
                    type="date"
                    className="pl-10 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                  />
                </div>
                {errors.end_date && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.end_date.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/projects')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors duration-200"
              >
                {loading ? 'Updating...' : 'Update Project'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EditProject;