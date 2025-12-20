import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { upload, handleUploadError } from '../middleware/upload.js';
import db from '../db.js';

const router = express.Router();

// Upload files for daily status
router.post('/status', authenticate, upload.array('files', 5), handleUploadError, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const fileData = req.files.map(file => ({
      filename: file.originalname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      content: file.buffer.toString('base64'), // Store file content as base64
      url: null // No longer needed as files are stored in database
    }));

    res.json({
      message: 'Files uploaded successfully',
      files: fileData
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

// Get file from database
router.get('/file/:statusId/:filename', authenticate, async (req, res) => {
  try {
    const { statusId, filename } = req.params;
    
    // Get the daily status with attachments
    const status = await db('daily_statuses')
      .where('id', statusId)
      .first();
    
    if (!status) {
      return res.status(404).json({ error: 'Status not found' });
    }
    
    // Check if user has permission to access this file
    const isAssigned = await db('project_assignments')
      .where({
        project_id: status.project_id,
        employee_id: req.user.id,
        is_active: true
      })
      .first();
    
    const isManager = await db('projects')
      .where('id', status.project_id)
      .andWhere('created_by', req.user.id)
      .first();
    
    if (!isAssigned && !isManager && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Parse attachments and find the requested file
    const attachments = status.attachments_with_content || status.attachments || [];
    const attachmentsArray = typeof attachments === 'string' ? JSON.parse(attachments) : attachments;
    
    const file = attachmentsArray.find(f => f.filename === filename || f.originalname === filename);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Convert base64 content back to buffer and send
    const fileContent = Buffer.from(file.content, 'base64');
    
    res.set({
      'Content-Type': file.mimetype,
      'Content-Disposition': `inline; filename="${file.originalname}"`,
      'Content-Length': fileContent.length
    });
    
    res.send(fileContent);
  } catch (error) {
    console.error('File serving error:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

// Get PRD file from project using project ID
router.get('/prd/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the project with PRD file
    const project = await db('projects')
      .where('id', id)
      .first();
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (!project.prd_file) {
      return res.status(404).json({ error: 'PRD file not found' });
    }
    
    // Check permissions
    const isAssigned = await db('project_assignments')
      .where({
        project_id: project.id,
        employee_id: req.user.id,
        is_active: true
      })
      .first();
    
    const isManager = project.created_by === req.user.id;
    
    if (!isAssigned && !isManager && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Parse PRD file data
    const prdFile = typeof project.prd_file === 'string' ? JSON.parse(project.prd_file) : project.prd_file;
    
    if (!prdFile.content) {
      return res.status(404).json({ error: 'PRD file content not found' });
    }
    
    // Convert base64 content back to buffer and send
    const fileContent = Buffer.from(prdFile.content, 'base64');
    
    res.set({
      'Content-Type': prdFile.mimetype,
      'Content-Disposition': `inline; filename="${prdFile.originalname}"`,
      'Content-Length': fileContent.length
    });
    
    res.send(fileContent);
  } catch (error) {
    console.error('PRD file serving error:', error);
    res.status(500).json({ error: 'Failed to serve PRD file' });
  }
});

export default router;
