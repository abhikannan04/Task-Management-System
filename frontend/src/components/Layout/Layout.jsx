import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { useSidebar } from '../../contexts/SidebarContext';

const Layout = () => {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className={`flex-1 p-4 pt-20 bg-gray-50 dark:bg-gray-900 transition-all duration-300 overflow-visible ${isCollapsed ? 'ml-12' : 'ml-48'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;