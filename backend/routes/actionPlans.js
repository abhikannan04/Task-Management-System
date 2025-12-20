import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as actionPlanController from '../controllers/actionPlanController.js';

const router = express.Router();

router.use(authenticate);

router.get('/:id', actionPlanController.getActionPlanDetails);
router.put('/:id/status', actionPlanController.updateActionPlanStatus);
router.post('/:id/activities', actionPlanController.addActivity);
router.put('/activities/:activityId', actionPlanController.updateActivity);
router.delete('/activities/:activityId', actionPlanController.deleteActivity);
router.post('/:id/discussions', actionPlanController.addDiscussion);

export default router;
