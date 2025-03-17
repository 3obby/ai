import { ToolResult } from '../../types';

interface WeatherToolParams {
  location: string;
  timeframe?: 'current' | 'today' | 'tomorrow' | 'week';
}

/**
 * A weather tool optimized for voice interaction
 * This is a mock implementation that returns fake weather data
 */
export class VoiceWeatherTool {
  private name: string = 'voice_weather';
  private description: string = 'Get weather information for a location';
  
  /**
   * Get weather information for a specific location
   * @param params The weather query parameters
   * @returns A formatted weather response
   */
  public async execute(params: WeatherToolParams): Promise<ToolResult> {
    try {
      const startTime = Date.now();
      
      // Validate required parameters
      if (!params.location) {
        throw new Error('Location is required');
      }
      
      // Default to current if timeframe not specified
      const timeframe = params.timeframe || 'current';
      
      // Mock weather data - in a real implementation this would call a weather API
      const weatherData = this.getMockWeatherData(params.location, timeframe);
      
      // Format the response for both visual and voice output
      const formattedResponse = this.formatWeatherResponse(weatherData, params.location, timeframe);
      
      return {
        toolName: this.name,
        input: params,
        output: formattedResponse,
        executionTime: Date.now() - startTime
      };
    } catch (error: any) {
      console.error(`Error executing ${this.name}:`, error);
      return {
        toolName: this.name,
        input: params,
        output: null,
        error: error.message || 'Unknown error',
        executionTime: 0
      };
    }
  }
  
  /**
   * Get the tool definition for registration
   */
  public getDefinition() {
    return {
      id: this.name,
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The location to get weather for (city name, zip code)'
          },
          timeframe: {
            type: 'string',
            enum: ['current', 'today', 'tomorrow', 'week'],
            description: 'The timeframe for the weather forecast'
          }
        },
        required: ['location']
      }
    };
  }
  
  /**
   * Generate mock weather data based on location and timeframe
   * In a real implementation, this would call a weather API
   */
  private getMockWeatherData(location: string, timeframe: string) {
    const cities: Record<string, any> = {
      'new york': { temp: 72, condition: 'Partly Cloudy', humidity: 65, wind: 8 },
      'los angeles': { temp: 85, condition: 'Sunny', humidity: 45, wind: 5 },
      'chicago': { temp: 65, condition: 'Windy', humidity: 60, wind: 15 },
      'miami': { temp: 88, condition: 'Thunderstorms', humidity: 80, wind: 10 },
      'seattle': { temp: 60, condition: 'Rainy', humidity: 75, wind: 8 },
      'denver': { temp: 70, condition: 'Clear', humidity: 30, wind: 12 },
      'boston': { temp: 68, condition: 'Cloudy', humidity: 70, wind: 11 },
      'default': { temp: 75, condition: 'Clear', humidity: 50, wind: 7 }
    };
    
    // Find the closest matching city or use default
    const cityKey = Object.keys(cities).find(city => 
      location.toLowerCase().includes(city)
    ) || 'default';
    
    const baseWeather = cities[cityKey];
    
    // Add variance based on timeframe
    switch (timeframe) {
      case 'today':
        return {
          ...baseWeather,
          forecast: 'steady throughout the day',
          high: baseWeather.temp + 5,
          low: baseWeather.temp - 8
        };
      case 'tomorrow':
        // Add some variation for tomorrow
        const tempChange = Math.floor(Math.random() * 10) - 5; // -5 to +5 degrees
        return {
          ...baseWeather,
          temp: baseWeather.temp + tempChange,
          condition: tempChange > 2 ? 'Improving' : (tempChange < -2 ? 'Worsening' : baseWeather.condition),
          forecast: 'changing by tomorrow',
          high: baseWeather.temp + tempChange + 3,
          low: baseWeather.temp + tempChange - 7
        };
      case 'week':
        return {
          ...baseWeather,
          weekForecast: [
            { day: 'Monday', temp: baseWeather.temp + Math.floor(Math.random() * 10) - 5, condition: this.getRandomCondition() },
            { day: 'Tuesday', temp: baseWeather.temp + Math.floor(Math.random() * 10) - 5, condition: this.getRandomCondition() },
            { day: 'Wednesday', temp: baseWeather.temp + Math.floor(Math.random() * 10) - 5, condition: this.getRandomCondition() },
            { day: 'Thursday', temp: baseWeather.temp + Math.floor(Math.random() * 10) - 5, condition: this.getRandomCondition() },
            { day: 'Friday', temp: baseWeather.temp + Math.floor(Math.random() * 10) - 5, condition: this.getRandomCondition() },
          ]
        };
      default: // current
        return baseWeather;
    }
  }
  
  /**
   * Get a random weather condition
   */
  private getRandomCondition(): string {
    const conditions = [
      'Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy', 'Thunderstorms', 
      'Windy', 'Clear', 'Foggy', 'Snow', 'Sleet'
    ];
    return conditions[Math.floor(Math.random() * conditions.length)];
  }
  
  /**
   * Format the weather data into a response suitable for both display and voice
   */
  private formatWeatherResponse(weather: any, location: string, timeframe: string): string {
    // Capitalize the location
    const formattedLocation = location
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    switch (timeframe) {
      case 'today':
        return `The weather in ${formattedLocation} today shows a temperature of ${weather.temp}°F (high ${weather.high}°F, low ${weather.low}°F) with ${weather.condition.toLowerCase()} conditions. Humidity is at ${weather.humidity}% with winds at ${weather.wind} mph. The forecast is ${weather.forecast}.`;
      
      case 'tomorrow':
        return `The forecast for ${formattedLocation} tomorrow predicts a temperature of ${weather.temp}°F (high ${weather.high}°F, low ${weather.low}°F) with ${weather.condition.toLowerCase()} conditions. Humidity is expected to be ${weather.humidity}% with winds at ${weather.wind} mph.`;
      
      case 'week':
        let weekForecast = `The 5-day forecast for ${formattedLocation} is: `;
        weather.weekForecast.forEach((day: any) => {
          weekForecast += `${day.day}: ${day.temp}°F, ${day.condition}. `;
        });
        return weekForecast;
      
      default: // current
        return `Currently in ${formattedLocation}, it's ${weather.temp}°F with ${weather.condition.toLowerCase()} conditions. Humidity is at ${weather.humidity}% with winds at ${weather.wind} mph.`;
    }
  }
}

// Create a singleton instance
const voiceWeatherTool = new VoiceWeatherTool();
export default voiceWeatherTool; 