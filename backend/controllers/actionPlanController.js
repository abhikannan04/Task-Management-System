import Joi from 'joi';
import db from '../db.js';
import { getStatusById } from '../models/DailyStatus.js';
import { createActivity, getActivitiesByActionPlanId, getActivityById, updateActivity as updateActivityModel, deleteActivity as deleteActivityModel } from '../models/ActionPlanActivity.js';
import { createDiscussion, getDiscussionsByActionPlanId } from '../models/ActionPlanDiscussion.js';
import logger from '../utils/logger.js';

const activitySchema = Joi.object({
    description: Joi.string().required(),
    progress_percentage: Joi.number().integer().min(0).max(100).default(0)
});

const discussionSchema = Joi.object({
    message: Joi.string().required()
});

export const getActionPlanDetails = async (req, res) => {
    try {
        const { id } = req.params;

        // Get the main action plan (daily status)
        const actionPlan = await getStatusById(id);
        if (!actionPlan) {
            return res.status(404).json({ error: 'Action plan not found' });
        }

        const activities = await getActivitiesByActionPlanId(id);
        const discussions = await getDiscussionsByActionPlanId(id);

        res.json({
            actionPlan,
            activities,
            discussions
        });
    } catch (error) {
        logger.error('Get action plan details error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const addActivity = async (req, res) => {
    try {
        const { id } = req.params;
        const { error, value } = activitySchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { description, progress_percentage } = value;

        // Verify action plan exists
        const actionPlan = await getStatusById(id);
        if (!actionPlan) {
            return res.status(404).json({ error: 'Action plan not found' });
        }

        const activityId = await createActivity({
            daily_status_id: id,
            description,
            progress_percentage,
            created_by: req.user.id
        });

        res.status(201).json({
            message: 'Activity added successfully',
            activityId,
            activity: {
                id: activityId,
                daily_status_id: id,
                description,
                progress_percentage,
                created_by: req.user.id,
                user_name: req.user.name,
                user_role: req.user.role,
                created_at: new Date()
            }
        });
    } catch (error) {
        logger.error('Add activity error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const addDiscussion = async (req, res) => {
    try {
        const { id } = req.params;
        const { error, value } = discussionSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { message } = value;

        // Verify action plan exists
        const actionPlan = await getStatusById(id);
        if (!actionPlan) {
            return res.status(404).json({ error: 'Action plan not found' });
        }

        const discussionId = await createDiscussion({
            daily_status_id: id,
            user_id: req.user.id,
            message
        });

        res.status(201).json({
            message: 'Message posted successfully',
            discussionId,
            discussion: {
                id: discussionId,
                daily_status_id: id,
                user_id: req.user.id,
                user_name: req.user.name,
                user_role: req.user.role,
                message,
                created_at: new Date()
            }
        });
    } catch (error) {
        logger.error('Add discussion error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateActivity = async (req, res) => {
    try {
        const { activityId } = req.params;
        const { description } = req.body;

        const activity = await getActivityById(activityId);
        if (!activity) {
            return res.status(404).json({ error: 'Activity not found' });
        }

        if (activity.created_by !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to update this activity' });
        }

        const updatedActivity = await updateActivityModel(activityId, description);
        res.json({ activity: updatedActivity });
    } catch (error) {
        logger.error('Error updating activity:', error);
        res.status(500).json({ error: 'Failed to update activity' });
    }
};

export const deleteActivity = async (req, res) => {
    try {
        const { activityId } = req.params;

        const activity = await getActivityById(activityId);
        if (!activity) {
            return res.status(404).json({ error: 'Activity not found' });
        }

        if (activity.created_by !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to delete this activity' });
        }

        await deleteActivityModel(activityId);
        res.json({ message: 'Activity deleted successfully' });
    } catch (error) {
        logger.error('Error deleting activity:', error);
        res.status(500).json({ error: 'Failed to delete activity' });
    }
};

export const updateActionPlanStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Verify action plan exists
        const actionPlan = await getStatusById(id);
        if (!actionPlan) {
            return res.status(404).json({ error: 'Action plan not found' });
        }

        const updateData = {
            action_plan_status: status,
            updated_at: db.fn.now()
        };

        // If status is changed to 'under_approval', reset review_status to 'pending'
        if (status === 'under_approval') {
            updateData.review_status = 'pending';
        }

        await db('daily_statuses')
            .where({ id })
            .update(updateData);

        res.json({ message: 'Status updated successfully', status, review_status: updateData.review_status });
    } catch (error) {
        logger.error('Error updating status:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
};
