import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../utils/mockData';
import { toast } from 'react-toastify';
import { Calendar, Upload, X } from 'lucide-react';

const DailyStatus = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Changed from projectId to id to match the route parameter
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [markAsCompleted, setMarkAsCompleted] = useState(false);

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      hours_worked: 8,
      progress_percentage: 0,
      status_text: '',
      project_id: ''
    }
  });

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await apiService.getProjects();
      const userProjects = response.data || [];
      setProjects(userProjects);

      // Auto-select project from URL if available, otherwise select first project
      if (id) { // Changed from projectId to id
        setValue('project_id', id);
      } else if (userProjects.length > 0) {
        setValue('project_id', userProjects[0].id.toString());
      }
    } catch (error) {
      toast.error('Failed to load projects');
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [id]); // Changed from projectId to id

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    if (files.length + selectedFiles.length > 5) {
      toast.error('Maximum 5 files allowed');
      return;
    }
    
    const validFiles = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      if (!validTypes.includes(file.type)) {
        toast.error(`Invalid file type: ${file.name}`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File too large: ${file.name}`);
        return false;
      }
      return true;
    });
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return [];
    
    setUploading(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3002'}/api/uploads/status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('psm_token')}`
        },
        body: formData
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload files');
      }
      
      return result.files;
    } catch (error) {
      toast.error(error.message || 'Failed to upload files');
      return [];
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      // Upload files first
      const uploadedFiles = await uploadFiles();
      
      // Ensure date is in YYYY-MM-DD format
      const submissionData = {
        project_id: parseInt(data.project_id),
        date: data.date || new Date().toISOString().split('T')[0],
        status_text: data.status_text,
        hours_worked: parseFloat(data.hours_worked),
        progress_percentage: parseInt(data.progress_percentage),
        attachments: uploadedFiles
      };

      await apiService.submitStatus(submissionData);

      toast.success('Status submitted successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit status');
    } finally {
      setSubmitting(false);
    }
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Daily Status Update
        </h1>
      </div>

      {/* Status Submission Form */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Project
              </label>
              {id ? ( // Changed from projectId to id
                <div className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white">
                  {projects.find(p => p.id.toString() === id)?.name || 'Loading project...'} {/* Changed from projectId to id */}
                </div>
              ) : (
                <select
                  {...register('project_id', { required: 'Project is required' })}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                >
                  <option value="">Select a project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name} ({project.status})
                    </option>
                  ))}
                </select>
              )}
              {errors.project_id && (
                <p className="mt-1 text-sm text-red-600">{errors.project_id.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Date
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  {...register('date', { 
                    required: 'Date is required',
                    validate: (value) => {
                      const selectedDate = new Date(value);
                      const today = new Date();
                      today.setHours(23, 59, 59, 999); // End of today
                      
                      if (selectedDate > today) {
                        return 'Cannot submit status for future dates';
                      }
                      return true;
                    }
                  })}
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  className="pl-10 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                />
              </div>
              {errors.date && (
                <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="hours_worked" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Hours Worked
              </label>
              <input
                {...register('hours_worked', {
                  required: 'Hours worked is required',
                  min: { value: 0, message: 'Hours must be at least 0' },
                  valueAsNumber: true
                })}
                type="number"
                step="0.25"
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
              />
              {errors.hours_worked && (
                <p className="mt-1 text-sm text-red-600">{errors.hours_worked.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="progress_percentage" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Progress Percentage
              </label>
              <input
                {...register('progress_percentage', {
                  required: 'Progress percentage is required',
                  min: { value: 0, message: 'Progress must be at least 0%' },
                  max: { value: 100, message: 'Progress cannot exceed 100%' },
                  valueAsNumber: true
                })}
                type="number"
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
              />
              {errors.progress_percentage && (
                <p className="mt-1 text-sm text-red-600">{errors.progress_percentage.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="status_text" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Status Description
            </label>
            <textarea
              {...register('status_text', {
                required: 'Status description is required',
                minLength: { value: 10, message: 'Status description must be at least 10 characters' },
                maxLength: { value: 2000, message: 'Status description must be less than 2000 characters' }
              })}
              rows={6}
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
              placeholder="Describe the work completed today, challenges faced, and next steps..."
            />
            {errors.status_text && (
              <p className="mt-1 text-sm text-red-600">{errors.status_text.message}</p>
            )}
          </div>


          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Attachments (Optional)
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md transition-colors duration-200">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                <div className="flex text-sm text-gray-600 dark:text-gray-400">
                  <label className="relative cursor-pointer bg-white dark:bg-gray-700 rounded-md font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 transition-colors duration-200">
                    <span>Upload files</span>
                    <input
                      type="file"
                      className="sr-only"
                      multiple
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt"
                      onChange={handleFileSelect}
                      disabled={uploading || submitting}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  PNG, JPG, PDF, DOC, TXT up to 10MB each (max 5 files)
                </p>
              </div>
            </div>
            
            {/* Selected files list */}
            {selectedFiles.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Selected Files:</h4>
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-md transition-colors duration-200">
                      <div className="flex items-center">
                        <Upload className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-2" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200"
                        disabled={uploading || submitting}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Upload progress */}
            {uploading && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Uploading files...</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 transition-colors duration-200">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                type="button"
                onClick={handleSubmit(onSubmit)}
                disabled={submitting || uploading}
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors duration-200"
              >
                {submitting ? 'Submitting...' : 'Submit Daily Update'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DailyStatus;