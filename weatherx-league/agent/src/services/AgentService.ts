import { Logger } from 'winston';
import { WeatherXMService } from './WeatherXMService.js';
import { ContractService } from './ContractService.js';

// Agent request types - keeping for future use
// interface AgentRequest {
//   action: string;
//   data?: any;
//   metadata?: {
//     timestamp?: string;
//     user?: string;
//     source?: string;
//   };
// }

interface AgentResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
  processing_time: number;
}

// Weather prediction analysis
interface WeatherPrediction {
  prediction: boolean; // true = rain, false = no rain
  confidence: number; // 0-1 scale
  reasoning: string;
  data_sources: string[];
  timestamp: string;
}

// Station analysis result
interface StationAnalysis {
  station_id: string;
  current_rain_mm: number;
  has_recent_rain: boolean;
  rain_trend: 'increasing' | 'decreasing' | 'stable';
  prediction: WeatherPrediction;
}

export class AgentService {
  private logger: Logger;
  private weatherService: WeatherXMService;
  private contractService: ContractService;
  private supportedActions: Set<string>;

  constructor(logger: Logger) {
    this.logger = logger;
    this.weatherService = new WeatherXMService(logger);
    this.contractService = new ContractService(logger);
    
    // Define supported actions
    this.supportedActions = new Set([
      'get_weather_data',
      'analyze_station',
      'predict_weather',
      'get_rain_summary',
      'analyze_multiple_stations',
      'check_prediction_outcome',
      'get_contract_stats',
      'health_check'
    ]);
  }

  /**
   * Utility to enforce a timeout on promises
   */
  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), ms)
      ),
    ]);
  }

  /**
   * Process incoming agent requests
   * @param action The action to perform
   * @param data Additional data for the action
   * @returns Processed response
   */
  async processRequest(action: string, data?: any): Promise<AgentResponse> {
    const startTime = Date.now();
    
    try {
      this.logger.info(`Processing agent request: ${action}`);
      
      if (!this.supportedActions.has(action)) {
        throw new Error(`Unsupported action: ${action}. Supported actions: ${Array.from(this.supportedActions).join(', ')}`);
      }

      let result: any;

      switch (action) {
        case 'get_weather_data':
          result = await this.getWeatherData(data);
          break;
        
        case 'analyze_station':
          result = await this.analyzeStation(data);
          break;
        
        case 'predict_weather':
          result = await this.predictWeather(data);
          break;
        
        case 'get_rain_summary':
          result = await this.getRainSummary(data);
          break;
        
        case 'analyze_multiple_stations':
          result = await this.analyzeMultipleStations(data);
          break;
        
        case 'check_prediction_outcome':
          result = await this.checkPredictionOutcome(data);
          break;
        
        case 'get_contract_stats':
          result = await this.getContractStats();
          break;
        
        case 'health_check':
          result = await this.performHealthCheck();
          break;
        
        default:
          throw new Error(`Action ${action} not implemented`);
      }

      const processingTime = Date.now() - startTime;
      
      this.logger.info(`Agent request processed successfully in ${processingTime}ms`);
      
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
        processing_time: processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      this.logger.error(`Agent request failed after ${processingTime}ms:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        processing_time: processingTime
      };
    }
  }

  /**
   * Get weather data for a station
   */
  private async getWeatherData(data: { stationId: string; includeHistory?: boolean }): Promise<any> {
    const { stationId, includeHistory = false } = data;
    
    if (!stationId) {
      throw new Error('Station ID is required');
    }

    const currentData = await this.weatherService.getRain(stationId);
    
    if (includeHistory) {
      const history = await this.weatherService.getRainHistory(stationId, 24);
      return {
        current: currentData,
        history: history.slice(0, 24) // Last 24 hours
      };
    }
    
    return { current: currentData };
  }

  /**
   * Analyze a weather station for prediction insights
   */
  private async analyzeStation(data: { stationId: string }): Promise<StationAnalysis> {
    const { stationId } = data;
    
    if (!stationId) {
      throw new Error('Station ID is required');
    }

    // Get current and historical data
    const currentData = await this.weatherService.getRain(stationId);
    const history = await this.weatherService.getRainHistory(stationId, 6);
    
    // Calculate trend
    const recentAvg = history.slice(0, 3).reduce((sum, h) => sum + h.value_mm, 0) / 3;
    const olderAvg = history.slice(3, 6).reduce((sum, h) => sum + h.value_mm, 0) / 3;
    
    let trend: 'increasing' | 'decreasing' | 'stable';
    if (recentAvg > olderAvg * 1.2) {
      trend = 'increasing';
    } else if (recentAvg < olderAvg * 0.8) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }

    // Generate prediction
    const prediction = await this.generateWeatherPrediction(stationId, currentData, history);
    
    return {
      station_id: stationId,
      current_rain_mm: currentData.value_mm,
      has_recent_rain: currentData.value_mm > 0.1,
      rain_trend: trend,
      prediction
    };
  }

  /**
   * Generate weather prediction based on current data and history
   */
  private async generateWeatherPrediction(
    _stationId: string,
    currentData: any,
    history: any[]
  ): Promise<WeatherPrediction> {
    // Simple prediction logic based on current conditions and trends
    const currentRain = currentData.value_mm;
    const avgRain = history.reduce((sum, h) => sum + h.value_mm, 0) / history.length;
    
    // Prediction logic
    let prediction: boolean;
    let confidence: number;
    let reasoning: string;
    
    if (currentRain > 1.0) {
      prediction = true;
      confidence = 0.8;
      reasoning = `Current rainfall is ${currentRain}mm, indicating active precipitation`;
    } else if (currentRain > 0.1 && avgRain > 0.5) {
      prediction = true;
      confidence = 0.6;
      reasoning = `Light current rain (${currentRain}mm) with recent history suggesting continued precipitation`;
    } else if (avgRain > 1.0) {
      prediction = true;
      confidence = 0.4;
      reasoning = `No current rain but recent history shows active precipitation patterns`;
    } else {
      prediction = false;
      confidence = 0.7;
      reasoning = `No current rain (${currentRain}mm) and low historical average (${avgRain.toFixed(2)}mm)`;
    }
    
    return {
      prediction,
      confidence,
      reasoning,
      data_sources: ['WeatherXM'],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Predict weather conditions for a station
   */
  private async predictWeather(data: { stationId: string }): Promise<WeatherPrediction> {
    const { stationId } = data;
    
    if (!stationId) {
      throw new Error('Station ID is required');
    }

    const analysis = await this.analyzeStation({ stationId });
    return analysis.prediction;
  }

  /**
   * Get rain summary for multiple stations
   */
  private async getRainSummary(data: { stationIds: string[]; thresholdMm?: number }): Promise<any> {
    const { stationIds, thresholdMm = 0.1 } = data;
    
    if (!stationIds || !Array.isArray(stationIds)) {
      throw new Error('Station IDs array is required');
    }

    const summary = await this.weatherService.getStationsWithRain(stationIds, thresholdMm);
    
    // Add additional analysis
    const totalRainfall = await this.weatherService.getRainMultiple(stationIds);
    const totalMm = Object.values(totalRainfall).reduce((sum, result) => {
      return sum + ('value_mm' in result ? result.value_mm : 0);
    }, 0);
    
    return {
      ...summary,
      total_rainfall_mm: totalMm,
      average_rainfall_mm: totalMm / stationIds.length,
      threshold_mm: thresholdMm
    };
  }

  /**
   * Analyze multiple weather stations
   */
  private async analyzeMultipleStations(data: { stationIds: string[] }): Promise<StationAnalysis[]> {
    const { stationIds } = data;
    
    if (!stationIds || !Array.isArray(stationIds)) {
      throw new Error('Station IDs array is required');
    }

    const analyses = await Promise.all(
      stationIds.map(stationId => this.analyzeStation({ stationId }))
    );
    
    return analyses;
  }

  /**
   * Check prediction outcome against actual weather
   */
  private async checkPredictionOutcome(data: { 
    stationId: string; 
    originalPrediction: boolean; 
    predictionTime: string;
  }): Promise<any> {
    const { stationId, originalPrediction, predictionTime } = data;
    
    if (!stationId || typeof originalPrediction !== 'boolean' || !predictionTime) {
      throw new Error('Station ID, original prediction, and prediction time are required');
    }

    const currentData = await this.weatherService.getRain(stationId);
    const actualRain = currentData.value_mm > 0.1;
    
    const correct = originalPrediction === actualRain;
    const predictionAge = Date.now() - new Date(predictionTime).getTime();
    
    return {
      station_id: stationId,
      original_prediction: originalPrediction,
      actual_outcome: actualRain,
      prediction_correct: correct,
      prediction_age_hours: predictionAge / (1000 * 60 * 60),
      current_rain_mm: currentData.value_mm,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get contract statistics
   */
  private async getContractStats(): Promise<any> {
    try {
      const stats = await this.contractService.getStats();
      const openRounds = await this.contractService.getOpenRounds();
      
      return {
        contract_stats: stats,
        open_rounds: openRounds.length,
        open_rounds_details: openRounds.map(round => ({
          id: round.id,
          title: round.title,
          total_predictions: round.yes_predictions + round.no_predictions,
          total_volume: this.contractService.formatAmount(
            (BigInt(round.total_yes_amount) + BigInt(round.total_no_amount)).toString()
          )
        }))
      };
    } catch (error) {
      this.logger.warn('Could not fetch contract stats:', error);
      return {
        contract_stats: null,
        error: 'Contract stats unavailable'
      };
    }
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<any> {
    // Run external health checks concurrently with short timeouts
    const weatherPromise = this.withTimeout(this.weatherService.healthCheck(), 3000)
      .then(res => ({
        service: 'WeatherXM',
        status: res.status,
        response_time: res.response_time,
      }))
      .catch(err => ({
        service: 'WeatherXM',
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      }));

    const contractPromise = this.withTimeout(this.contractService.getStats(), 3000)
      .then(() => ({
        service: 'Contract',
        status: 'healthy',
      }))
      .catch(err => ({
        service: 'Contract',
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      }));

    const healthChecks = await Promise.all([weatherPromise, contractPromise]);

    const overallHealth = healthChecks.every(check => check.status === 'healthy') ? 'healthy' : 'degraded';

    return {
      overall_status: overallHealth,
      services: healthChecks,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get supported actions
   */
  getSupportedActions(): string[] {
    return Array.from(this.supportedActions);
  }} 