import axios from 'axios';

/**
 * Interface for WeatherXM precipitation measurement response
 */
interface PrecipitationMeasurement {
  value_mm: number;
  timestamp: string;
}

/**
 * Interface for WeatherXM API response
 */
interface WeatherXMResponse {
  data: PrecipitationMeasurement[];
  success: boolean;
  message?: string;
}

/**
 * Interface for standardized rain data response
 */
interface RainData {
  stationId: string;
  precipitationMm: number;
  timestamp: string;
  success: boolean;
  error?: string;
}

/**
 * Fetches the latest precipitation data for a specific WeatherXM station
 * @param stationId - The WeatherXM station ID
 * @returns Promise<RainData> - The rain data with precipitation in millimeters
 */
export async function getRain(stationId: string): Promise<RainData> {
  try {
    // Validate station ID
    if (!stationId || typeof stationId !== 'string') {
      throw new Error('Station ID is required and must be a string');
    }

    // Construct the WeatherXM API URL
    const url = `https://api.weatherxm.com/v1/stations/${stationId}/measurements?metrics=precipitation&limit=1`;

    // Make the API request
    const response = await axios.get<WeatherXMResponse>(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'WeatherX-League-Agent/1.0.0'
      },
      timeout: 10000 // 10 second timeout
    });

    // Check if the response is successful
    if (!response.data.success) {
      throw new Error(response.data.message || 'API request failed');
    }

    // Check if we have measurement data
    if (!response.data.data || response.data.data.length === 0) {
      throw new Error('No precipitation data available for this station');
    }

    const measurement = response.data.data[0];

    // Validate measurement data
    if (typeof measurement.value_mm !== 'number') {
      throw new Error('Invalid precipitation value in API response');
    }

    // Return standardized rain data
    return {
      stationId,
      precipitationMm: measurement.value_mm,
      timestamp: measurement.timestamp,
      success: true
    };

  } catch (error) {
    // Handle different types of errors
    let errorMessage = 'Unknown error occurred';
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Server responded with error status
        errorMessage = `API Error: ${error.response.status} - ${error.response.statusText}`;
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'Network error: No response from WeatherXM API';
      } else {
        // Something else happened
        errorMessage = `Request Error: ${error.message}`;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      stationId,
      precipitationMm: 0,
      timestamp: new Date().toISOString(),
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Fetches rain data for multiple stations concurrently
 * @param stationIds - Array of WeatherXM station IDs
 * @returns Promise<RainData[]> - Array of rain data results
 */
export async function getRainMultiple(stationIds: string[]): Promise<RainData[]> {
  try {
    if (!Array.isArray(stationIds) || stationIds.length === 0) {
      throw new Error('Station IDs must be a non-empty array');
    }

    // Fetch all stations concurrently
    const promises = stationIds.map(stationId => getRain(stationId));
    const results = await Promise.all(promises);

    return results;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Return error results for all station IDs
    return stationIds.map(stationId => ({
      stationId,
      precipitationMm: 0,
      timestamp: new Date().toISOString(),
      success: false,
      error: errorMessage
    }));
  }
}

/**
 * Utility function to check if a station has recent precipitation
 * @param stationId - The WeatherXM station ID
 * @param thresholdMm - Minimum precipitation threshold in millimeters (default: 0.1)
 * @returns Promise<boolean> - True if precipitation is above threshold
 */
export async function hasRecentRain(stationId: string, thresholdMm: number = 0.1): Promise<boolean> {
  try {
    const rainData = await getRain(stationId);
    return rainData.success && rainData.precipitationMm > thresholdMm;
  } catch (error) {
    return false;
  }
}

// Export types for external use
export type { RainData, PrecipitationMeasurement, WeatherXMResponse }; 