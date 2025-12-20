import React, { useState, useEffect } from 'react';
import { Filter, X } from 'lucide-react';
import api from '../services/api';

const ProjectFilters = ({ onFilterChange, onClear, initialFilters = null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(initialFilters?.department || 'all');
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    // Update selected department when initialFilters change
    if (initialFilters?.department) {
      setSelectedDepartment(initialFilters.department);
    } else if (initialFilters === null) {
      // Reset to 'all' when filters are cleared
      setSelectedDepartment('all');
    }
  }, [initialFilters]);

  const loadFilterOptions = async () => {
    try {
      setLoading(true);
      const deptResponse = await api.get('/projects/departments');
      setDepartmentOptions(deptResponse.data?.data || []);
    } catch (error) {
      console.error('Error loading filter options:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDepartmentChange = (value) => {
    setSelectedDepartment(value);
  };

  const handleApplyFilters = () => {
    onFilterChange({ department: selectedDepartment });
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    setSelectedDepartment('all');
    onClear();
    setIsOpen(false);
  };

  const hasActiveFilters = () => {
    return selectedDepartment !== 'all';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium transition-colors duration-200 ${
          hasActiveFilters()
            ? 'border-primary-500 text-primary-700 bg-primary-50 dark:bg-primary-900/20 dark:text-primary-300 dark:border-primary-600'
            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
        }`}
      >
        <Filter className="h-4 w-4 mr-2" />
        Filter by Department
        {hasActiveFilters() && (
          <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-primary-600 rounded-full">
            1
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Filter Panel */}
          <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 transition-colors duration-200">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Filter by Department
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Department Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Department
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200"
                    disabled={loading}
                  >
                    <option value="all">All Departments</option>
                    {departmentOptions.map((dept, index) => (
                      <option key={index} value={dept.code}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleApplyFilters}
                  className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-md text-sm font-medium transition-colors duration-200"
                >
                  Apply Filter
                </button>
                <button
                  onClick={handleClearFilters}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProjectFilters;