import db from '../db.js';

export const logReportGeneration = async (logData) => {
  const [id] = await db('reports_logs').insert(logData).returning('id');
  return id;
};

export const getReportLogs = async (userId) => {
  return await db('reports_logs')
    .where('user_id', userId)
    .orderBy('generated_at', 'desc')
    .limit(50);
};