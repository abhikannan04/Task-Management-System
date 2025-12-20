import db from '../db.js';

export const createDiscussion = async (discussionData) => {
    const [id] = await db('action_plan_discussions').insert(discussionData).returning('id');
    return id;
};

export const getDiscussionsByActionPlanId = async (dailyStatusId) => {
    return await db('action_plan_discussions')
        .join('users', 'action_plan_discussions.user_id', 'users.id')
        .where('daily_status_id', dailyStatusId)
        .select(
            'action_plan_discussions.*',
            'users.name as user_name',
            'users.role as user_role'
        )
        .orderBy('created_at', 'asc');
};
