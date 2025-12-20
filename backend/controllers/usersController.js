import { getAllUsers, findUserById, getTotalEmployeeCount } from '../models/User.js';
import logger from '../utils/logger.js';

export const getUsers = async (req, res) => {
  try {
    // Only allow admin and manager roles to get all users
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const users = await getAllUsers();
    res.json(users);
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await findUserById(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    logger.error('Get user by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTotalEmployees = async (req, res) => {
  try {
    // Only admin can get total employee count
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const total = await getTotalEmployeeCount();
    res.json({ total });
  } catch (error) {
    logger.error('Get total employees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};