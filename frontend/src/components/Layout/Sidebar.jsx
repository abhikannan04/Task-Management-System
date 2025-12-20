import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from '../../contexts/SidebarContext';
import api from '../../services/api';
import {
  Home,
  FolderOpen,
  Users,
  FileText,
  CheckSquare,
  BarChart3,
  Plus,
  Clock,
  AlertTriangle,
  ClipboardList
} from 'lucide-react';

const Sidebar = () => {
  const { user } = useAuth();
  const { isCollapsed } = useSidebar();
  const [pendingCompletionsCount, setPendingCompletionsCount] = useState(0);
  const [pendingActionPlansCount, setPendingActionPlansCount] = useState(0);

  // Fetch pending completions count for managers only (not admin)
  const fetchPendingCompletionsCount = async () => {
    if (user && user.role === 'manager') {
      try {
        const response = await api.get('/projects/pending-completions/count');
        setPendingCompletionsCount(response.data.count || 0);
      } catch (error) {
        console.error('Failed to fetch pending completions count:', error);
      }
    }
  };

  // Fetch pending action plans count for managers only (not admin)
  const fetchPendingActionPlansCount = async () => {
    if (user && user.role === 'manager') {
      try {
        const response = await api.get('/statuses/pending-action-plans/count');
        setPendingActionPlansCount(response.data.count || 0);
      } catch (error) {
        console.error('Failed to fetch pending action plans count:', error);
      }
    }
  };

  useEffect(() => {
    fetchPendingCompletionsCount();
    fetchPendingActionPlansCount();

    // Listen for completion count changes
    const handleCompletionCountChange = () => {
      fetchPendingCompletionsCount();
    };

    // Listen for action plan count changes
    const handleActionPlanCountChange = () => {
      fetchPendingActionPlansCount();
    };

    window.addEventListener('completionCountChanged', handleCompletionCountChange);
    window.addEventListener('actionPlanCountChanged', handleActionPlanCountChange);

    return () => {
      window.removeEventListener('completionCountChanged', handleCompletionCountChange);
      window.removeEventListener('actionPlanCountChanged', handleActionPlanCountChange);
    };
  }, [user]);

  const getNavigationItems = () => {
    const baseItems = [
      { path: '/dashboard', label: 'Dashboard', icon: Home }
    ];

    if (user?.role === 'admin') {
      // For admin role: only show Dashboard and Reports sections
      return [
        ...baseItems,
        { path: '/reports', label: 'Reports', icon: BarChart3 }
      ];
    }

    if (user?.role === 'manager') {
      return [
        ...baseItems,
        { path: '/projects', label: 'Tasks', icon: FolderOpen },
        { path: '/projects/create', label: 'Create Task', icon: Plus },
        {
          path: '/projects/review',
          label: 'Review Tasks',
          icon: Clock,
          badge: pendingCompletionsCount > 0 ? pendingCompletionsCount : null
        },
        {
          path: '/notifications',
          label: 'Action Plans',
          icon: ClipboardList
        },
        {
          path: '/action-plans/review',
          label: 'Review Action Plans',
          icon: CheckSquare,
          badge: pendingActionPlansCount > 0 ? pendingActionPlansCount : null
        },
        { path: '/reports', label: 'Reports', icon: BarChart3 }
      ];
    }

    if (user?.role === 'employee') {
      return [
        ...baseItems,
        { path: '/projects', label: 'My Tasks', icon: FolderOpen }
      ];
    }

    return baseItems;
  };

  const navigationItems = getNavigationItems();

  return (
    <aside className={`fixed left-0 top-16 h-screen bg-white dark:bg-gray-800 shadow-sm border-r border-gray-200 dark:border-gray-700 z-30 transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-48'}`}>
      <nav className="p-3 space-y-1">
        {navigationItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center px-2 py-2 rounded-lg transition-colors ${isActive
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border-r-2 border-primary-700 dark:border-primary-500'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
              } ${isCollapsed ? 'justify-center' : 'space-x-2'}`
            }
            title={isCollapsed ? item.label : ''}
          >
            <div className="relative">
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {/* Left side notification badge when sidebar is collapsed */}
              {item.badge && isCollapsed && (
                <span className="absolute -top-2 -left-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center z-10">
                  {item.badge}
                </span>
              )}
            </div>
            {!isCollapsed && (
              <span className="font-medium text-sm flex items-center justify-between w-full">
                <span>{item.label}</span>
                {/* Right side notification badge when sidebar is expanded */}
                {item.badge && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
                    {item.badge}
                  </span>
                )}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;