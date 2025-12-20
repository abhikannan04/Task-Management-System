import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { toast } from 'react-toastify';
import {
    ArrowLeft,
    Calendar,
    CheckCircle,
    Clock,
    MessageSquare,
    Plus,
    Send,
    Edit2,
    Trash2,
    X,
    XCircle,
    Save
} from 'lucide-react';

const ActionPlanDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();

    const [actionPlan, setActionPlan] = useState(null);
    const [activities, setActivities] = useState([]);
    const [discussions, setDiscussions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'activities');

    const [newActivity, setNewActivity] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Editing state
    const [editingActivityId, setEditingActivityId] = useState(null);
    const [editDescription, setEditDescription] = useState('');

    // Status options
    const statusOptions = [
        { value: 'started', label: 'Started' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'testing', label: 'Testing' },
        { value: 'under_approval', label: 'Under Approval' },
        { value: 'on_hold', label: 'On Hold' }
    ];

    useEffect(() => {
        fetchDetails();

        // Mark action plan as read
        if (id) {
            api.post(`/statuses/action-plan/${id}/read`).catch(err => console.error('Error marking action plan as read:', err));
        }
    }, [id]);

    const fetchDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/action-plans/${id}`);
            setActionPlan(response.data.actionPlan);
            setActivities(response.data.activities);
            setDiscussions(response.data.discussions);
        } catch (error) {
            console.error('Error fetching action plan details:', error);
            toast.error('Failed to load action plan details');
        } finally {
            setLoading(false);
        }
    };

    const handleAddActivity = async (e) => {
        e.preventDefault();
        if (!newActivity.trim()) return;

        try {
            setSubmitting(true);
            const response = await api.post(`/action-plans/${id}/activities`, {
                description: newActivity
            });

            setActivities([response.data.activity, ...activities]);
            setNewActivity('');
            toast.success('Activity added successfully');
        } catch (error) {
            console.error('Error adding activity:', error);
            toast.error('Failed to add activity');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateActivity = async (activityId) => {
        if (!editDescription.trim()) return;

        try {
            const response = await api.put(`/action-plans/activities/${activityId}`, {
                description: editDescription
            });

            setActivities(activities.map(a =>
                a.id === activityId ? { ...a, description: response.data.activity.description } : a
            ));
            setEditingActivityId(null);
            setEditDescription('');
            toast.success('Activity updated successfully');
        } catch (error) {
            console.error('Error updating activity:', error);
            toast.error('Failed to update activity');
        }
    };

    const handleDeleteActivity = async (activityId) => {
        if (!window.confirm('Are you sure you want to delete this activity?')) return;

        try {
            await api.delete(`/action-plans/activities/${activityId}`);
            setActivities(activities.filter(a => a.id !== activityId));
            toast.success('Activity deleted successfully');
        } catch (error) {
            console.error('Error deleting activity:', error);
            toast.error('Failed to delete activity');
        }
    };

    const startEditing = (activity) => {
        setEditingActivityId(activity.id);
        setEditDescription(activity.description);
    };

    const cancelEditing = () => {
        setEditingActivityId(null);
        setEditDescription('');
    };

    const handleStatusChange = async (e) => {
        const newStatus = e.target.value;
        try {
            // Assuming there's an endpoint to update the main action plan status
            // If not, we might need to create one or use an existing one.
            // For now, I'll assume PUT /action-plans/:id/status exists or similar.
            // Wait, the previous implementation plan didn't explicitly add a status update endpoint for the main plan.
            // I should probably check if one exists or add it.
            // Looking at `actionPlanController.js`, I didn't add one.
            // However, `DailyStatus` updates might be handled by `statusController`.
            // Let's try to use a generic update endpoint if available, or just add it to `actionPlanController`.
            // I'll add a TODO to backend if it fails, but for now let's assume we can update it.
            // Actually, I'll use the `api.put('/statuses/:id')` if it exists, or similar.
            // Let's assume `api.put('/action-plans/:id/status')` needs to be implemented.
            // I'll implement it in the frontend to call it, and if it fails I'll fix the backend.

            // Actually, I'll just add the endpoint to `actionPlanController` and routes in the next step if needed.
            // But I can't do "next step" easily without context switching.
            // I'll assume `api.put('/statuses/:id/status')` or similar.
            // Let's look at `ReviewActionPlans.jsx`, it uses `/statuses/approve...`.

            // I'll use `api.put('/action-plans/${id}/status', { status: newStatus })`.
            // I will need to ensure this route exists. I'll add it to `actionPlans.js` and `actionPlanController.js` after this file write if I haven't already.
            // I haven't. So I will do that immediately after.

            const response = await api.put(`/action-plans/${id}/status`, { status: newStatus });

            // Update local state with returned data (including potential review_status change)
            setActionPlan(prev => ({
                ...prev,
                action_plan_status: newStatus,
                review_status: response.data.review_status || prev.review_status
            }));

            toast.success('Status updated successfully');
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Failed to update status');
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            setSubmitting(true);
            const response = await api.post(`/action-plans/${id}/discussions`, {
                message: newMessage
            });

            setDiscussions([...discussions, response.data.discussion]);
            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Failed to send message');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!actionPlan) {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Action Plan Not Found</h2>
                    <button
                        onClick={() => navigate(-1)}
                        className="mt-4 text-primary-600 hover:text-primary-500"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const isRejected = actionPlan.review_status === 'rejected';

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back to List
                    </button>

                    <div className={`bg-white dark:bg-gray-800 shadow rounded-lg p-6 ${isRejected ? 'border-l-4 border-red-500' : ''}`}>
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    {actionPlan.status_text}
                                </h1>
                                <div className="flex items-center flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                                    <span className="flex items-center">
                                        <Calendar className="h-4 w-4 mr-1" />
                                        {new Date(actionPlan.date).toLocaleDateString()}
                                    </span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${actionPlan.review_status === 'approved' ? 'bg-green-100 text-green-800' :
                                        actionPlan.review_status === 'rejected' ? 'bg-red-100 text-red-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {actionPlan.review_status.charAt(0).toUpperCase() + actionPlan.review_status.slice(1)}
                                    </span>


                                </div>

                                {isRejected && actionPlan.review_comments && (
                                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
                                        <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">Rejection Reason:</h4>
                                        <p className="text-sm text-red-700 dark:text-red-200">{actionPlan.review_comments}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs / Content */}
                {!isRejected ? (
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden min-h-[500px] flex flex-col">
                        <div className="border-b border-gray-200 dark:border-gray-700">
                            <nav className="flex -mb-px">
                                <button
                                    onClick={() => setActiveTab('activities')}
                                    className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${activeTab === 'activities'
                                        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                        }`}
                                >
                                    Action Plan Instance
                                </button>
                                <button
                                    onClick={() => setActiveTab('discussion')}
                                    className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${activeTab === 'discussion'
                                        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                        }`}
                                >
                                    Discussion
                                </button>
                            </nav>
                        </div>

                        <div className="p-6 flex-1 flex flex-col">
                            {activeTab === 'activities' ? (
                                <div className="space-y-6">
                                    {/* Add Activity Form */}
                                    <form onSubmit={handleAddActivity} className="flex gap-4">
                                        <input
                                            type="text"
                                            value={newActivity}
                                            onChange={(e) => setNewActivity(e.target.value)}
                                            placeholder="Add a new activity or progress update..."
                                            className="flex-1 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                        />
                                        <button
                                            type="submit"
                                            disabled={submitting || !newActivity.trim()}
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add
                                        </button>
                                    </form>

                                    {/* Activities List */}
                                    <div className="space-y-0 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                        {activities.map((activity, index) => (
                                            <div key={activity.id} className={`p-4 flex gap-4 bg-white dark:bg-gray-800 ${index !== activities.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}>
                                                <div className="flex-shrink-0">
                                                    <div className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-sm bg-primary-600">
                                                        {activity.user_name ? activity.user_name.charAt(0) : '?'}
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {activity.user_name || 'Unknown User'}
                                                        </h3>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                                                <Clock className="h-3 w-3 mr-1" />
                                                                {new Date(activity.created_at).toLocaleString()}
                                                            </span>
                                                            {user && activity.created_by === user.id && (
                                                                <div className="flex items-center gap-1 ml-2">
                                                                    <button
                                                                        onClick={() => startEditing(activity)}
                                                                        className="p-1 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                                                                        title="Edit"
                                                                    >
                                                                        <Edit2 className="h-3 w-3" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteActivity(activity.id)}
                                                                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                                                        title="Delete"
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {editingActivityId === activity.id ? (
                                                        <div className="mt-2">
                                                            <textarea
                                                                value={editDescription}
                                                                onChange={(e) => setEditDescription(e.target.value)}
                                                                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                                                                rows={3}
                                                            />
                                                            <div className="flex justify-end gap-2 mt-2">
                                                                <button
                                                                    onClick={cancelEditing}
                                                                    className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                                                                >
                                                                    <X className="h-3 w-3 mr-1" />
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    onClick={() => handleUpdateActivity(activity.id)}
                                                                    className="inline-flex items-center px-2 py-1 border border-transparent shadow-sm text-xs font-medium rounded text-white bg-primary-600 hover:bg-primary-700"
                                                                >
                                                                    <Save className="h-3 w-3 mr-1" />
                                                                    Save
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                            {activity.description}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {activities.length === 0 && (
                                            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                                <p>No activities recorded yet.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col h-full">
                                    {/* Discussion Messages */}
                                    <div className="flex-1 space-y-4 mb-4 overflow-y-auto max-h-[500px]">
                                        {discussions.map((msg) => (
                                            <div key={msg.id} className={`flex gap-3 ${msg.user_id === user.id ? 'flex-row-reverse' : ''}`}>
                                                <div className="flex-shrink-0">
                                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-medium shadow-sm
                                                        ${msg.user_id === user.id ? 'bg-primary-600' : 'bg-gray-400 dark:bg-gray-600'}`}>
                                                        {msg.user_name.charAt(0)}
                                                    </div>
                                                </div>
                                                <div className={`flex flex-col max-w-[80%] ${msg.user_id === user.id ? 'items-end' : 'items-start'}`}>
                                                    <div className="flex items-baseline gap-2 mb-1">
                                                        <span className="text-xs font-medium text-gray-900 dark:text-white">{msg.user_name}</span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <div className={`p-3 rounded-lg shadow-sm text-sm whitespace-pre-wrap
                                                        ${msg.user_id === user.id
                                                            ? 'bg-primary-50 dark:bg-primary-900/30 text-gray-900 dark:text-white rounded-tr-none border border-primary-100 dark:border-primary-800'
                                                            : 'bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-tl-none border border-gray-200 dark:border-gray-600'}`}>
                                                        {msg.message}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {discussions.length === 0 && (
                                            <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 py-8">
                                                <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
                                                <p>No messages yet. Start the discussion!</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Message Input */}
                                    <form onSubmit={handleSendMessage} className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <div className="flex gap-4">
                                            <input
                                                type="text"
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                placeholder="Type your message..."
                                                className="flex-1 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                            />
                                            <button
                                                type="submit"
                                                disabled={submitting || !newMessage.trim()}
                                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                                            >
                                                <Send className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
                        <div className="mx-auto h-12 w-12 text-red-500 mb-4">
                            <XCircle className="h-12 w-12" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Action Plan Rejected</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                            This action plan has been rejected. You cannot add activities or discussions. Please review the rejection reason above and create a new action plan if necessary.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );

};

export default ActionPlanDetails;
