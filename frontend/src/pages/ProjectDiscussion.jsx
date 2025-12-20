import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../utils/mockData';
import api from '../services/api';
import { toast } from 'react-toastify';
import { MessageCircle, Send, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

const ProjectDiscussion = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const [project, setProject] = useState(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [comments]);

    // Mark discussion as read
    useEffect(() => {
        if (id) {
            api.post(`/assignments/${id}/viewed`).catch(err => console.error('Error marking discussion as viewed:', err));
        }
    }, [id]);

    const loadProject = async () => {
        try {
            const response = await apiService.getProject(id);
            setProject(response.data);
        } catch (error) {
            console.error('Error loading project details:', error);
        }
    };

    const loadComments = async () => {
        try {
            setLoading(true);
            const response = await apiService.getComments(id);
            setComments(response.data);
        } catch (error) {
            console.error('Error loading comments:', error);
            toast.error('Failed to load discussion');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProject();
        loadComments();
    }, [id]);

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            await apiService.addComment(id, { content: newComment });
            setNewComment('');
            // Refresh comments
            const response = await apiService.getComments(id);
            setComments(response.data);
        } catch (error) {
            console.error('Error adding comment:', error);
            toast.error('Failed to add comment');
        }
    };

    if (loading && !comments.length) {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col transition-colors duration-200">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <MessageCircle className="h-5 w-5 text-primary-600" />
                                Task Discussion
                            </h1>
                            {project && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md">
                                    {project.name}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    {comments.length > 0 ? (
                        [...comments].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map((comment) => (
                            <div key={comment.id} className={`flex gap-3 ${comment.user_id === user.id ? 'flex-row-reverse' : ''}`}>
                                <div className="flex-shrink-0">
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-medium shadow-sm border-2 border-white dark:border-gray-800
                    ${comment.user_id === user.id ? 'bg-primary-600' : 'bg-gray-400 dark:bg-gray-600'}`}>
                                        {comment.user_name ? comment.user_name.charAt(0) : '?'}
                                    </div>
                                </div>
                                <div className={`flex flex-col max-w-[80%] ${comment.user_id === user.id ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">{comment.user_name}</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {format(new Date(comment.created_at), 'MMM dd, HH:mm')}
                                        </span>
                                    </div>
                                    <div className={`p-3 rounded-2xl shadow-sm text-sm whitespace-pre-wrap
                    ${comment.user_id === user.id
                                            ? 'bg-primary-600 text-white rounded-tr-none'
                                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-none border border-gray-200 dark:border-gray-700'}`}>
                                        {comment.content}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="h-[60vh] flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
                                <MessageCircle className="h-12 w-12 opacity-50" />
                            </div>
                            <p className="text-lg font-medium">No comments yet</p>
                            <p className="text-sm">Start the discussion by sending a message below.</p>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </main>

            {/* Message Input Bottom Bar */}
            <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 sticky bottom-0 z-10 shadow-lg">
                <div className="max-w-4xl mx-auto">
                    <form onSubmit={handleAddComment} className="flex gap-4 items-center">
                        <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Type your message..."
                            className="flex-1 block w-full rounded-full border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-6 py-3 transition-colors"
                        />
                        <button
                            type="submit"
                            disabled={!newComment.trim()}
                            className="inline-flex items-center justify-center h-12 w-12 rounded-full border border-transparent shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
                        >
                            <Send className="h-5 w-5 ml-0.5" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ProjectDiscussion;
