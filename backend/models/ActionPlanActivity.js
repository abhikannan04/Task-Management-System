import db from '../db.js';

class ActionPlanActivity {
    static async createActivity(activityData) {
        const [id] = await db('action_plan_activities').insert(activityData).returning('id');
        return id;
    }

    static async getActivitiesByActionPlanId(actionPlanId) {
        const result = await db('action_plan_activities')
            .join('users', 'action_plan_activities.created_by', 'users.id')
            .where({ daily_status_id: actionPlanId })
            .select(
                'action_plan_activities.*',
                'users.name as user_name'
            )
            .orderBy('created_at', 'desc');
        return result;
    }

    static async getActivityById(id) {
        return await db('action_plan_activities').where({ id }).first();
    }

    static async updateActivity(id, description) {
        const [updatedActivity] = await db('action_plan_activities')
            .where({ id })
            .update({ description, updated_at: db.fn.now() })
            .returning('*');
        return updatedActivity;
    }

    static async deleteActivity(id) {
        await db('action_plan_activities')
            .where({ id })
            .del();
        return true;
    }
}

export const createActivity = ActionPlanActivity.createActivity;
export const getActivitiesByActionPlanId = ActionPlanActivity.getActivitiesByActionPlanId;
export const getActivityById = ActionPlanActivity.getActivityById;
export const updateActivity = ActionPlanActivity.updateActivity;
export const deleteActivity = ActionPlanActivity.deleteActivity;

export default ActionPlanActivity;
