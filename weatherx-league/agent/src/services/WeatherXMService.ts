import axios, { AxiosInstance } from 'axios';
import { Logger } from 'winston';

// WeatherXM API response interfaces
interface WeatherXMResponse {
  data: WeatherXMData[];
  pagination?: {
    current_page: number;
    total_pages: number;
    total_items: number;
  };
}

interface WeatherXMData {
  id: string;
  timestamp: string;
  temperature?: number;
  humidity?: number;
  pressure?: number;
  wind_speed?: number;
  wind_direction?: number;
  precipitation?: number;
  solar_irradiance?: number;
  uv_index?: number;
  value_mm?: number; // Specifically for precipitation measurements
}

interface RainData {
  stationId: string;
  timestamp: string;
  value_mm: number;
  raw_data: WeatherXMData;
}

interface MultipleRainData {
  [stationId: string]: RainData | { error: string };
}

export class WeatherXMService {
  private axios: AxiosInstance;
  private logger: Logger;
  private baseUrl = 'https://api.weatherxm.com/v1';
  private timeout = 10000; // 10 seconds timeout

  constructor(logger: Logger) {
    this.logger = logger;
    this.axios = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'WeatherX-League-Agent/1.0'
      }
    });

    // Add request interceptor for logging
    this.axios.interceptors.request.use(
      (config) => {
        this.logger.info(`Making request to WeatherXM API: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging and error handling
    this.axios.interceptors.response.use(
      (response) => {
        this.logger.info(`WeatherXM API response: ${response.status} for ${response.config.url}`);
        return response;
      },
      (error) => {
        this.logger.error('WeatherXM API error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          message: error.message
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Fetch the latest rainfall data for a specific station
   * @param stationId The WeatherXM station ID
   * @returns The latest rainfall measurement
   */
  async getRain(stationId: string): Promise<RainData> {
    try {
      this.logger.info(`Fetching rain data for station: ${stationId}`);
      
      const response = await this.axios.get<WeatherXMResponse>(
        `/stations/${stationId}/measurements`,
        {
          params: {
            metrics: 'precipitation',
            limit: 1
          }
        }
      );

      if (!response.data.data || response.data.data.length === 0) {
        throw new Error(`No precipitation data found for station ${stationId}`);
      }

      const measurement = response.data.data[0];
      
      if (!measurement) {
        throw new Error(`No measurement data found for station ${stationId}`);
      }
      
      // Extract rainfall value - check multiple possible fields
      const rainfall = measurement.value_mm ?? measurement.precipitation ?? 0;
      
      const rainData: RainData = {
        stationId,
        timestamp: measurement.timestamp,
        value_mm: rainfall,
        raw_data: measurement
      };

      this.logger.info(`Rain data retrieved for station ${stationId}: ${rainfall}mm at ${measurement.timestamp}`);
      return rainData;

    } catch (error) {
      this.logger.error(`Error fetching rain data for station ${stationId}:`, error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`Station ${stationId} not found`);
        }
        if (error.response?.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (error.response?.status && error.response.status >= 500) {
          throw new Error('WeatherXM service is temporarily unavailable');
        }
      }
      
      throw error;
    }
  }

  /**
   * Fetch rainfall data for multiple stations concurrently
   * @param stationIds Array of WeatherXM station IDs
   * @returns Object mapping station IDs to their rainfall data or error
   */
  async getRainMultiple(stationIds: string[]): Promise<MultipleRainData> {
    this.logger.info(`Fetching rain data for ${stationIds.length} stations`);
    
    const results: MultipleRainData = {};
    
    // Create promises for all stations
    const promises = stationIds.map(async (stationId) => {
      try {
        const rainData = await this.getRain(stationId);
        results[stationId] = rainData;
      } catch (error) {
        this.logger.warn(`Failed to fetch rain data for station ${stationId}:`, error);
        results[stationId] = { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // Wait for all promises to resolve
    await Promise.all(promises);

    this.logger.info(`Completed fetching rain data for ${stationIds.length} stations`);
    return results;
  }

  /**
   * Check if a station has recorded recent rainfall above a threshold
   * @param stationId The WeatherXM station ID
   * @param thresholdMm Minimum rainfall threshold in mm (default: 0.1mm)
   * @returns Whether the station has recent rainfall above the threshold
   */
  async hasRecentRain(stationId: string, thresholdMm: number = 0.1): Promise<boolean> {
    try {
      this.logger.info(`Checking recent rain for station ${stationId} with threshold ${thresholdMm}mm`);
      
      const rainData = await this.getRain(stationId);
      const hasRain = rainData.value_mm > thresholdMm;
      
      this.logger.info(`Station ${stationId} has recent rain: ${hasRain} (${rainData.value_mm}mm)`);
      return hasRain;
      
    } catch (error) {
      this.logger.error(`Error checking recent rain for station ${stationId}:`, error);
      throw error;
    }
  }

  /**
   * Get rainfall data for multiple time periods
   * @param stationId The WeatherXM station ID
   * @param limit Number of measurements to retrieve (default: 24)
   * @returns Array of historical rainfall measurements
   */
  async getRainHistory(stationId: string, limit: number = 24): Promise<RainData[]> {
    try {
      this.logger.info(`Fetching rain history for station ${stationId} with limit ${limit}`);
      
      const response = await this.axios.get<WeatherXMResponse>(
        `/stations/${stationId}/measurements`,
        {
          params: {
            metrics: 'precipitation',
            limit
          }
        }
      );

      if (!response.data.data || response.data.data.length === 0) {
        throw new Error(`No precipitation data found for station ${stationId}`);
      }

      const rainHistory: RainData[] = response.data.data.map(measurement => ({
        stationId,
        timestamp: measurement.timestamp,
        value_mm: measurement.value_mm ?? measurement.precipitation ?? 0,
        raw_data: measurement
      }));

      this.logger.info(`Retrieved ${rainHistory.length} rain measurements for station ${stationId}`);
      return rainHistory;

    } catch (error) {
      this.logger.error(`Error fetching rain history for station ${stationId}:`, error);
      throw error;
    }
  }

  /**
   * Get total rainfall over a specific period
   * @param stationId The WeatherXM station ID
   * @param hours Number of hours to look back (default: 24)
   * @returns Total rainfall in the specified period
   */
  async getTotalRainfall(stationId: string, hours: number = 24): Promise<{ total_mm: number; measurements: number }> {
    try {
      this.logger.info(`Calculating total rainfall for station ${stationId} over ${hours} hours`);
      
      const history = await this.getRainHistory(stationId, hours);
      
      // Calculate total rainfall
      const totalRainfall = history.reduce((sum, measurement) => sum + measurement.value_mm, 0);
      
      this.logger.info(`Total rainfall for station ${stationId} over ${hours} hours: ${totalRainfall}mm`);
      
      return {
        total_mm: totalRainfall,
        measurements: history.length
      };
      
    } catch (error) {
      this.logger.error(`Error calculating total rainfall for station ${stationId}:`, error);
      throw error;
    }
  }

  /**
   * Check if multiple stations have rain above threshold
   * @param stationIds Array of station IDs
   * @param thresholdMm Rainfall threshold in mm
   * @returns Summary of stations with rain above threshold
   */
  async getStationsWithRain(stationIds: string[], thresholdMm: number = 0.1): Promise<{
    stations_with_rain: string[];
    stations_without_rain: string[];
    stations_with_errors: string[];
    total_stations: number;
    rain_percentage: number;
  }> {
    try {
      this.logger.info(`Checking ${stationIds.length} stations for rain above ${thresholdMm}mm`);
      
      const results = await this.getRainMultiple(stationIds);
      
      const stationsWithRain: string[] = [];
      const stationsWithoutRain: string[] = [];
      const stationsWithErrors: string[] = [];
      
      for (const [stationId, result] of Object.entries(results)) {
        if ('error' in result) {
          stationsWithErrors.push(stationId);
        } else if (result.value_mm > thresholdMm) {
          stationsWithRain.push(stationId);
        } else {
          stationsWithoutRain.push(stationId);
        }
      }
      
      const validStations = stationsWithRain.length + stationsWithoutRain.length;
      const rainPercentage = validStations > 0 ? (stationsWithRain.length / validStations) * 100 : 0;
      
      this.logger.info(`Rain analysis complete: ${stationsWithRain.length}/${validStations} stations have rain above ${thresholdMm}mm`);
      
      return {
        stations_with_rain: stationsWithRain,
        stations_without_rain: stationsWithoutRain,
        stations_with_errors: stationsWithErrors,
        total_stations: stationIds.length,
        rain_percentage: Math.round(rainPercentage * 100) / 100
      };
      
    } catch (error) {
      this.logger.error('Error analyzing stations for rain:', error);
      throw error;
    }
  }

  /**
   * Health check for WeatherXM service
   * @returns Service health status
   */
  async healthCheck(): Promise<{ status: string; response_time: number }> {
    const startTime = Date.now();
    
    try {
      // Try to fetch a simple endpoint to check service health
      await this.axios.get('/status', { timeout: 5000 });
      
      const responseTime = Date.now() - startTime;
      
      this.logger.info(`WeatherXM service health check passed in ${responseTime}ms`);
      
      return {
        status: 'healthy',
        response_time: responseTime
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      this.logger.error(`WeatherXM service health check failed in ${responseTime}ms:`, error);
      
      return {
        status: 'unhealthy',
        response_time: responseTime
      };
    }
  }
} 