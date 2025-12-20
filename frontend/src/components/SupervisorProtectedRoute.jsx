import React from 'react';
import { Navigate } from 'react-router-dom';

const SupervisorProtectedRoute = ({ children }) => {
  // Check if supervisor is authenticated
  const isSupervisorAuthenticated = localStorage.getItem('supervisor_authenticated') === 'true';
  
  // If not authenticated, redirect to supervisor login
  if (!isSupervisorAuthenticated) {
    return <Navigate to="/supervisor/login" replace />;
  }
  
  // If authenticated, render the children components
  return children;
};

export default SupervisorProtectedRoute;