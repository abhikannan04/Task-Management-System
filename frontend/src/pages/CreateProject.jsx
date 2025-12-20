import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../utils/mockData';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { Calendar, FileText, User, Building, Plus } from 'lucide-react';

const CreateProject = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [prdFile, setPrdFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showNewOstaInput, setShowNewOstaInput] = useState(false);
  const [showNewFstaInput, setShowNewFstaInput] = useState(false);
  const [newOstaName, setNewOstaName] = useState('');
  const [newFstaName, setNewFstaName] = useState('');
  const [ostaData, setOstaData] = useState([]);
  const [fstaData, setFstaData] = useState([]);

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm();

  // Set default values for dept_code and department based on user data
  useEffect(() => {
    if (user) {
      // Set department code and name from user data if available
      setValue('dept_code', user.dept_code || '00');
      setValue('department', user.department || 'Systems');
    }
  }, [user, setValue]);

  // Get today's date in YYYY-MM-DD format for min date validation
  const today = new Date().toISOString().split('T')[0];

  // Fetch OSTA and FSTA data when component mounts
  useEffect(() => {
    fetchOstaData();
    fetchFstaData();
  }, []); // Empty dependency array means this runs once on mount

  const fetchOstaData = async () => {
    try {
      const response = await apiService.getOstaData();

      // Extract data from response (axios returns full response object)
      let data = Array.isArray(response.data) ? response.data : [];

      // Remove duplicates based on name and ensure we have valid data
      // Also filter out any empty or whitespace-only names
      const uniqueData = data.filter((item, index, self) =>
        item &&
        item.name &&
        item.name.trim().length > 0 &&
        index === self.findIndex(t => t && t.name === item.name)
      );

      setOstaData(uniqueData);
    } catch (error) {
      console.error('Error fetching OSTA data:', error);
      // Check if it's an authentication error
      if (error.response && error.response.status === 401) {
        // Redirect to login page
        window.location.href = '/login';
      }
      // Empty fallback when API fails
      setOstaData([]);
    }
  };

  const fetchFstaData = async () => {
    try {
      const response = await apiService.getFstaData();

      // Extract data from response (axios returns full response object)
      let data = Array.isArray(response.data) ? response.data : [];

      // Remove duplicates based on name and ensure we have valid data
      // Also filter out any empty or whitespace-only names
      const uniqueData = data.filter((item, index, self) =>
        item &&
        item.name &&
        item.name.trim().length > 0 &&
        index === self.findIndex(t => t && t.name === item.name)
      );

      setFstaData(uniqueData);
    } catch (error) {
      console.error('Error fetching FSTA data:', error);
      // Check if it's an authentication error
      if (error.response && error.response.status === 401) {
        // Redirect to login page
        window.location.href = '/login';
      }
      // Empty fallback when API fails
      setFstaData([]);
    }
  };

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

      // Append PRD file if selected
      if (prdFile) {
        formData.append('prd_file', prdFile);
      }

      // Use the API service to create project with file upload
      await apiService.createProject(formData);

      toast.success('Task created successfully!');
      navigate('/projects');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create task');
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

      // Create preview URL for images
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    } else {
      setPrdFile(null);
      setPreviewUrl(null);
    }
  };

  const handleAddNewOsta = async () => {
    if (newOstaName.trim()) {
      try {
        // Add new OSTA through API
        const response = await apiService.addOsta(newOstaName.trim());
        const newOsta = response.data || response;

        // Update the OSTA data list
        setOstaData(prev => [...prev, newOsta]);

        // Set the form value to the new OSTA name
        setValue('osta_name', newOstaName.trim());

        // Reset the input and hide the form
        setShowNewOstaInput(false);
        setNewOstaName('');

        toast.success('New OSTA added successfully!');
      } catch (error) {
        console.error('Error adding new OSTA:', error);
        toast.error('Failed to add new OSTA');
      }
    }
  };

  const handleAddNewFsta = async () => {
    if (newFstaName.trim()) {
      try {
        // Add new FSTA through API
        const response = await apiService.addFsta(newFstaName.trim());
        const newFsta = response.data || response;

        // Update the FSTA data list
        setFstaData(prev => [...prev, newFsta]);

        // Set the form value to the new FSTA name
        setValue('fsta_name', newFstaName.trim());

        // Reset the input and hide the form
        setShowNewFstaInput(false);
        setNewFstaName('');

        toast.success('New FSTA added successfully!');
      } catch (error) {
        console.error('Error adding new FSTA:', error);
        toast.error('Failed to add new FSTA');
      }
    }
  };

  return (
    <div className="space-y-6">


      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Department and OSTA No Section (Row 1) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <input type="hidden" {...register('dept_code')} />
              <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Department
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  {...register('department')}
                  type="text"
                  readOnly
                  className="pl-10 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed transition-colors duration-200"
                />
              </div>
            </div>

            <div>
              <label htmlFor="osta_no" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                OSTA No (Optional)
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('osta_no')}
                  type="text"
                  className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                  placeholder="Enter OSTA No"
                />
              </div>
              {errors.osta_no && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.osta_no.message}</p>
              )}
            </div>
          </div>

          {/* OSTA and FSTA Section (Row 2) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="osta_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                OSTA Name (Optional)
              </label>
              <div className="mt-1 relative">
                {showNewOstaInput ? (
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newOstaName}
                      onChange={(e) => setNewOstaName(e.target.value)}
                      className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                      placeholder="Enter new OSTA name"
                    />
                    <button
                      type="button"
                      onClick={handleAddNewOsta}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewOstaInput(false);
                        setNewOstaName('');
                      }}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <select
                    {...register('osta_name')}
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 font-bold transition-colors duration-200"
                  >
                    <option value="" className="font-normal">Select OSTA Name or Other Activities</option>
                    {
                      // Filter out any remaining empty values before rendering
                      ostaData
                        .filter(osta => osta && osta.name && osta.name.trim().length > 0)
                        .map(osta => (
                          <option key={osta.id} value={osta.name} className="font-bold">{osta.name}</option>
                        ))
                    }
                  </select>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowNewOstaInput(true)}
                className="mt-2 inline-flex items-center text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add New OSTA
              </button>
              {errors.osta_name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.osta_name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="fsta_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                FSTA Name (Optional)
              </label>
              <div className="mt-1 relative">
                {showNewFstaInput ? (
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newFstaName}
                      onChange={(e) => setNewFstaName(e.target.value)}
                      className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                      placeholder="Enter new FSTA name"
                    />
                    <button
                      type="button"
                      onClick={handleAddNewFsta}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewFstaInput(false);
                        setNewFstaName('');
                      }}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <select
                    {...register('fsta_name')}
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 font-bold transition-colors duration-200"
                  >
                    <option value="" className="font-normal">Select FSTA Name or Other Activities</option>
                    {
                      // Filter out any remaining empty values before rendering
                      fstaData
                        .filter(fsta => fsta && fsta.name && fsta.name.trim().length > 0)
                        .map(fsta => (
                          <option key={fsta.id} value={fsta.name} className="font-bold">{fsta.name}</option>
                        ))
                    }
                  </select>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowNewFstaInput(true)}
                className="mt-2 inline-flex items-center text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add New FSTA
              </button>
              {errors.fsta_name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.fsta_name.message}</p>
              )}
            </div>
          </div>

          {/* Task Name and TRD File (Row 2) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Task Name
              </label>
              <input
                {...register('name', {
                  required: 'Task name is required',
                  minLength: { value: 3, message: 'Task name must be at least 3 characters' }
                })}
                type="text"
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                placeholder="Enter task name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="prd_file" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Task Requirements Document (Optional)
              </label>
              <div className="mt-1 flex items-center">
                <label className="relative cursor-pointer bg-white dark:bg-gray-700 rounded-md font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 transition-colors duration-200">
                  <span className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                    <FileText className="h-5 w-5 mr-2" />
                    {prdFile ? 'Change File' : 'Upload File'}
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

          {/* Description with full width */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              {...register('description', {
                maxLength: { value: 1000, message: 'Description must be less than 1000 characters' }
              })}
              rows={4}
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
              placeholder="Enter task description"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Start Date
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  {...register('start_date', {
                    required: 'Start date is required'
                    // Removed validation that prevented past dates
                  })}
                  type="date"
                  // Removed min={today} to allow past dates
                  className="pl-10 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                />
              </div>
              {errors.start_date && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.start_date.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                  // Removed min={today} to allow past dates
                  className="pl-10 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
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
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProject;