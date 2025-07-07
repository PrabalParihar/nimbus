import { AgentService } from '../services/AgentService';
import winston from 'winston';

// Create a test logger
const testLogger = winston.createLogger({
  level: 'error', // Only log errors during tests
  transports: [
    new winston.transports.Console({
      silent: true // Silent during tests
    })
  ]
});

describe('AgentService', () => {
  let agentService: AgentService;

  beforeEach(() => {
    agentService = new AgentService(testLogger);
  });

  describe('getSupportedActions', () => {
    it('should return a list of supported actions', () => {
      const actions = agentService.getSupportedActions();
      
      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThan(0);
      expect(actions).toContain('get_weather_data');
      expect(actions).toContain('analyze_station');
      expect(actions).toContain('predict_weather');
      expect(actions).toContain('health_check');
    });
  });

  describe('processRequest', () => {
    it('should handle health_check action', async () => {
      const response = await agentService.processRequest('health_check');
      
      expect(response.success).toBe(true);
      expect(response.timestamp).toBeDefined();
      expect(response.processing_time).toBeGreaterThanOrEqual(0);
      expect(response.data).toBeDefined();
      expect(response.data.overall_status).toBeDefined();
      expect(response.data.services).toBeDefined();
    });

    it('should reject unsupported actions', async () => {
      const response = await agentService.processRequest('unsupported_action');
      
      expect(response.success).toBe(false);
      expect(response.error).toContain('Unsupported action');
      expect(response.timestamp).toBeDefined();
      expect(response.processing_time).toBeGreaterThanOrEqual(0);
    });

    it('should handle get_weather_data action with missing data', async () => {
      const response = await agentService.processRequest('get_weather_data');
      
      expect(response.success).toBe(false);
      expect(response.error).toContain('Cannot destructure property');
    });

    it('should handle analyze_station action with missing data', async () => {
      const response = await agentService.processRequest('analyze_station');
      
      expect(response.success).toBe(false);
      expect(response.error).toContain('Cannot destructure property');
    });

    it('should handle predict_weather action with missing data', async () => {
      const response = await agentService.processRequest('predict_weather');
      
      expect(response.success).toBe(false);
      expect(response.error).toContain('Cannot destructure property');
    });
  });

  describe('error handling', () => {
    it('should handle invalid data gracefully', async () => {
      const response = await agentService.processRequest('get_weather_data', { invalidData: true });
      
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.timestamp).toBeDefined();
    });

    it('should include processing time in all responses', async () => {
      const response = await agentService.processRequest('health_check');
      
      expect(typeof response.processing_time).toBe('number');
      expect(response.processing_time).toBeGreaterThanOrEqual(0);
    });

    it('should include timestamp in all responses', async () => {
      const response = await agentService.processRequest('health_check');
      
      expect(response.timestamp).toBeDefined();
      expect(new Date(response.timestamp).getTime()).toBeGreaterThan(0);
    });
  });
}); 