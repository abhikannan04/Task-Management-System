import Joi from 'joi';
import { findUserByEmpCode, createUser, updateUserById, deleteUserByEmpCode, getUniqueDepartments } from '../models/User.js';
import { hashPassword, comparePassword, generateToken } from '../utils/auth.js';
import logger from '../utils/logger.js';

const loginSchema = Joi.object({
  emp_code: Joi.string().required(),
  password: Joi.string().min(6).required()
});

const registerSchema = Joi.object({
  emp_code: Joi.string().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().min(2).max(100).required(),
  role: Joi.string().valid('admin', 'manager', 'employee').required(),
  department: Joi.string().max(100).optional(),
  dept_code: Joi.string().max(50).optional()
});

const selfRegisterSchema = Joi.object({
  emp_code: Joi.string().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().min(2).max(100).required(),
  role: Joi.string().valid('employee', 'manager').default('employee'), // Only allow employee or manager roles for self-registration
  department: Joi.string().max(100).optional(),
  dept_code: Joi.string().max(50).optional()
});

const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  currentPassword: Joi.string().min(6).optional(),
  newPassword: Joi.string().min(6).optional(),
  department: Joi.string().max(100).optional(),
  dept_code: Joi.string().max(50).optional()
}).or('name', 'newPassword', 'department', 'dept_code'); // At least one of name, newPassword, department or dept_code must be provided

const supervisorResetSchema = Joi.object({
  emp_code: Joi.string().required()
});

const supervisorDeleteSchema = Joi.object({
  emp_code: Joi.string().required()
});

// Add schema for supervisor employee creation
const supervisorCreateSchema = Joi.object({
  emp_code: Joi.string().required(),
  name: Joi.string().min(2).max(100).required(),
  role: Joi.string().valid('employee', 'manager').required(),
  department: Joi.string().max(100).optional(),
  dept_code: Joi.string().max(50).optional()
});

export const login = async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { emp_code, password } = value;
    const user = await findUserByEmpCode(emp_code);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = generateToken(user);
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const register = async (req, res) => {
  try {
    // Only admin can register new users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can register new users' });
    }
    
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const { emp_code, password, name, role, department, dept_code } = value;
    
    // Check if user already exists by emp_code
    const existingUser = await findUserByEmpCode(emp_code);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this employee code already exists' });
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Create user
    const userId = await createUser({
      emp_code,
      password: hashedPassword,
      name,
      role,
      department: department || null,
      dept_code: dept_code || null
    });
    
    res.status(201).json({ message: 'User registered successfully', userId });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const selfRegister = async (req, res) => {
  try {
    // Log the incoming request for debugging
    logger.info('Self-registration request received:', { body: req.body });
    
    const { error, value } = selfRegisterSchema.validate(req.body);
    if (error) {
      logger.warn('Self-registration validation error:', { error: error.details[0].message });
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const { emp_code, password, name, role, department, dept_code } = value;
    
    // Check if user already exists by emp_code
    const existingUser = await findUserByEmpCode(emp_code);
    if (existingUser) {
      logger.warn('Self-registration failed: User already exists', { emp_code });
      return res.status(400).json({ error: 'User with this employee code already exists' });
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Create user with selected role (default to employee if not specified)
    // Note: For security, we only allow employee or manager roles for self-registration
    const userId = await createUser({
      emp_code,
      password: hashedPassword,
      name,
      role: role || 'employee',
      department: department || null,
      dept_code: dept_code || null
    });
    
    // Get the created user
    const user = await findUserByEmpCode(emp_code);
    
    // Generate token for automatic login
    const token = generateToken(user);
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    
    logger.info('Self-registration successful', { userId, emp_code });
    res.status(201).json({ 
      message: 'User registered successfully', 
      user: userWithoutPassword, 
      token 
    });
  } catch (error) {
    logger.error('Self-registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { emp_code } = req.body;
    
    const user = await findUserByEmpCode(emp_code);
    if (!user) {
      // Don't reveal if user exists or not
      return res.json({ message: 'If employee code exists, password reset instructions have been sent' });
    }
    
    // Email functionality has been removed - users should contact administrator for password reset
    res.json({ message: 'Please contact your administrator to reset your password' });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const supervisorResetPassword = async (req, res) => {
  try {
    // Validate input
    const { error, value } = supervisorResetSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { emp_code } = value;
    
    // Find user by emp_code
    const user = await findUserByEmpCode(emp_code);
    if (!user) {
      return res.status(404).json({ error: 'User with this employee code not found' });
    }
    
    // Hash the emp_code to use as the new password
    const hashedPassword = await hashPassword(emp_code);
    
    // Update user's password
    await updateUserById(user.id, { password: hashedPassword });
    
    logger.info(`Supervisor reset password for user ${emp_code}`);
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    logger.error('Supervisor password reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const supervisorDeleteEmployee = async (req, res) => {
  try {
    // Validate input
    const { error, value } = supervisorDeleteSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { emp_code } = value;
    
    // Delete user and all related data
    const user = await deleteUserByEmpCode(emp_code);
    if (!user) {
      return res.status(404).json({ error: 'User with this employee code not found' });
    }
    
    logger.info(`Supervisor deleted employee ${emp_code}`);
    
    res.json({ message: `Employee ${emp_code} and all related data have been deleted successfully` });
  } catch (error) {
    logger.error('Supervisor employee deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const supervisorCreateEmployee = async (req, res) => {
  try {
    // Validate input
    const { error, value } = supervisorCreateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { emp_code, name, role, department, dept_code } = value;
    
    // Check if user already exists by emp_code
    const existingUser = await findUserByEmpCode(emp_code);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this employee code already exists' });
    }
    
    // Set initial password to match employee code
    const hashedPassword = await hashPassword(emp_code);
    
    // Create user
    const userId = await createUser({
      emp_code,
      password: hashedPassword,
      name,
      role,
      department: department || null,
      dept_code: dept_code || null,
      is_active: true
    });
    
    logger.info(`Supervisor created employee ${emp_code}`);
    
    res.status(201).json({ 
      message: 'Employee created successfully', 
      user: { id: userId, emp_code, name, role, department, dept_code } 
    });
  } catch (error) {
    logger.error('Supervisor employee creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDepartments = async (req, res) => {
  try {
    const departments = await getUniqueDepartments();
    res.json({ departments });
  } catch (error) {
    logger.error('Get departments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const { password: _, ...user } = req.user;
    res.json(user);
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, currentPassword, newPassword, department, dept_code } = value;
    const userId = req.user.id;

    // If password change is requested, verify current password except for reset to emp_code
    if (newPassword) {
      // Get the current user to verify password or to use emp_code as new password
      const currentUser = await findUserByEmpCode(req.user.emp_code);
      
      // Check if this is a password reset to employee code (newPassword equals emp_code)
      const isResetToEmpCode = newPassword === currentUser.emp_code;
      
      // For regular password changes, current password is required
      // For reset to emp_code, current password is optional
      if (!isResetToEmpCode && !currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change password' });
      }
      
      // If current password is provided, verify it (except for reset to emp_code)
      if (currentPassword && !isResetToEmpCode) {
        const isValidPassword = await comparePassword(currentPassword, currentUser.password);
        if (!isValidPassword) {
          return res.status(400).json({ error: 'Current password is incorrect' });
        }
      }
      
      // Log the type of operation for audit purposes
      if (isResetToEmpCode) {
        console.log(`User ${req.user.emp_code} resetting password to employee code`);
      }
    }

    // Prepare update data
    const updateData = {};
    if (name) {
      updateData.name = name;
    }

    if (newPassword) {
      updateData.password = await hashPassword(newPassword);
    }

    if (department !== undefined) {
      updateData.department = department || null;
    }

    if (dept_code !== undefined) {
      updateData.dept_code = dept_code || null;
    }

    // Update user
    const updatedUser = await updateUserById(userId, updateData);

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = updatedUser;
    
    res.json(userWithoutPassword);
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};