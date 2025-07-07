import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

// Validation schemas
const agentRequestSchema = Joi.object({
  action: Joi.string().required().min(1),
  data: Joi.object().optional(),
  metadata: Joi.object({
    timestamp: Joi.string().isoDate().optional(),
    user: Joi.string().optional(),
    source: Joi.string().optional()
  }).optional()
});

const stationIdSchema = Joi.string().required().min(1);

const stationIdsSchema = Joi.array().items(Joi.string().min(1)).min(1).max(50);

const contractActionSchema = Joi.object({
  title: Joi.string().min(1).max(100).when('action', { is: 'open_round', then: Joi.required() }),
  description: Joi.string().max(500).when('action', { is: 'open_round', then: Joi.required() }),
  roundId: Joi.number().integer().min(1).when('action', { 
    is: Joi.alternatives().try('close_round', 'settle_round'), 
    then: Joi.required() 
  }),
  result: Joi.boolean().when('action', { is: 'settle_round', then: Joi.required() }),
  prediction: Joi.boolean().when('action', { is: 'predict', then: Joi.required() }),
  amount: Joi.string().pattern(/^\d+$/).when('action', { is: 'predict', then: Joi.required() }),
  signerAccountId: Joi.string().required().min(1),
  privateKey: Joi.string().required().min(1)
});

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const path = req.path;
  const method = req.method;
  
  try {
    // Skip validation for GET requests without body
    if (method === 'GET') {
      return next();
    }
    
    // Validate based on endpoint
    if (path === '/api/agent/process') {
      const { error } = agentRequestSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: `Validation error: ${error.details?.[0]?.message || 'Invalid request'}`,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    if (path === '/api/weather/rain/multiple') {
      const { error } = Joi.object({
        stationIds: stationIdsSchema.required()
      }).validate(req.body);
      
      if (error) {
        return res.status(400).json({
          success: false,
          error: `Validation error: ${error.details?.[0]?.message || 'Invalid request'}`,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    if (path.startsWith('/api/contract/')) {
      const { error } = contractActionSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: `Validation error: ${error.details?.[0]?.message || 'Invalid request'}`,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal validation error',
      timestamp: new Date().toISOString()
    });
  }
};

export const validateStationId = (req: Request, res: Response, next: NextFunction): void => {
  const { stationId } = req.params;
  
  const { error } = stationIdSchema.validate(stationId);
  if (error) {
    res.status(400).json({
      success: false,
      error: `Invalid station ID: ${error.details?.[0]?.message || 'Invalid station ID'}`,
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  next();
};

export const validateAccountId = (req: Request, res: Response, next: NextFunction): void => {
  const { accountId } = req.params;
  
  const { error } = Joi.string().required().min(1).validate(accountId);
  if (error) {
    res.status(400).json({
      success: false,
      error: `Invalid account ID: ${error.details?.[0]?.message || 'Invalid account ID'}`,
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  next();
};

export const validateRoundId = (req: Request, res: Response, next: NextFunction): void => {
  const { roundId } = req.params;
  
  if (!roundId) {
    res.status(400).json({
      success: false,
      error: 'Round ID is required',
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  const { error } = Joi.number().integer().min(1).validate(parseInt(roundId));
  if (error) {
    res.status(400).json({
      success: false,
      error: `Invalid round ID: ${error.details?.[0]?.message || 'Invalid round ID'}`,
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  next();
}; 