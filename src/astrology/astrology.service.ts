import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  NatalChart,
  PlanetPosition,
  HouseData,
  AspectData,
} from './entities/natal-chart.entity';
import { User } from '../user/entities/user.entity';

export interface GeoLocation {
  latitude: number;
  longitude: number;
  timezone: string;
  formattedAddress?: string;
}

interface ProkeralaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

@Injectable()
export class AstrologyService {
  private readonly logger = new Logger(AstrologyService.name);
  private prokeralaToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(
    @InjectRepository(NatalChart)
    private readonly chartRepository: Repository<NatalChart>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Geocode a location string to coordinates
   * Using Nominatim (OpenStreetMap) - free, no API key needed
   */
  async geocodeLocation(place: string): Promise<GeoLocation> {
    try {
      const response = await axios.get(
        'https://nominatim.openstreetmap.org/search',
        {
          params: {
            q: place,
            format: 'json',
            limit: 1,
          },
          headers: {
            'User-Agent': 'NatalChartBot/1.0',
          },
        },
      );

      if (!response.data || response.data.length === 0) {
        throw new Error(`Location not found: ${place}`);
      }

      const result = response.data[0];
      const latitude = parseFloat(result.lat);
      const longitude = parseFloat(result.lon);

      // Get timezone from coordinates using a free timezone API
      const timezone = await this.getTimezone(latitude, longitude);

      return {
        latitude,
        longitude,
        timezone,
        formattedAddress: result.display_name,
      };
    } catch (error) {
      this.logger.error(`Geocoding error: ${error.message}`);
      throw new Error(`Could not geocode location: ${place}`);
    }
  }

  /**
   * Get timezone from coordinates
   */
  private async getTimezone(lat: number, lon: number): Promise<string> {
    try {
      // Using timeapi.io - free, no key required
      const response = await axios.get(
        `https://timeapi.io/api/TimeZone/coordinate`,
        {
          params: {
            latitude: lat,
            longitude: lon,
          },
        },
      );
      return response.data.timeZone || 'UTC';
    } catch {
      // Fallback: estimate timezone from longitude
      const offset = Math.round(lon / 15);
      return `Etc/GMT${offset >= 0 ? '-' : '+'}${Math.abs(offset)}`;
    }
  }

  /**
   * Get Prokerala API access token
   */
  private async getProkeralaToken(): Promise<string> {
    if (this.prokeralaToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.prokeralaToken;
    }

    const clientId = this.configService.get<string>('ASTROLOGY_API_CLIENT_ID');
    const clientSecret = this.configService.get<string>('ASTROLOGY_API_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Prokerala API credentials not configured');
    }

    try {
      const response = await axios.post<ProkeralaTokenResponse>(
        'https://api.prokerala.com/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      this.prokeralaToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 60) * 1000);

      return this.prokeralaToken;
    } catch (error) {
      this.logger.error(`Failed to get Prokerala token: ${error.message}`);
      throw new Error('Failed to authenticate with astrology API');
    }
  }

  /**
   * Generate natal chart from user birth data
   */
  async generateNatalChart(user: User): Promise<NatalChart> {
    this.logger.log(`Generating natal chart for user ${user.id}`);

    const birthDate = new Date(user.birthDate);
    const [hours, minutes] = user.birthTime.split(':').map(Number);

    try {
      // Try to use Prokerala API
      const chart = await this.fetchFromProkerala(
        birthDate,
        hours,
        minutes,
        user.birthLatitude,
        user.birthLongitude,
        user.timezone,
      );

      chart.user = user;
      return this.chartRepository.save(chart);
    } catch (error) {
      this.logger.warn(`Prokerala API failed, using fallback calculation: ${error.message}`);

      // Fallback: Use basic zodiac calculation
      const chart = this.calculateBasicChart(
        birthDate,
        hours,
        minutes,
        user.birthLatitude,
        user.birthLongitude,
      );

      chart.user = user;
      return this.chartRepository.save(chart);
    }
  }

  /**
   * Fetch chart data from Prokerala API
   */
  private async fetchFromProkerala(
    birthDate: Date,
    hours: number,
    minutes: number,
    latitude: number,
    longitude: number,
    timezone: string,
  ): Promise<NatalChart> {
    const token = await this.getProkeralaToken();

    const datetime = `${birthDate.toISOString().split('T')[0]}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

    const response = await axios.get(
      'https://api.prokerala.com/v2/astrology/kundli',
      {
        params: {
          ayanamsa: 1, // Lahiri
          coordinates: `${latitude},${longitude}`,
          datetime: datetime,
          la: 'en',
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const data = response.data.data;

    const chart = new NatalChart();
    chart.rawApiResponse = JSON.stringify(data);

    // Parse planet positions
    chart.planets = this.parseProkeralaPlanets(data.chart_rasi?.planet_positions || []);

    // Parse houses
    chart.houses = this.parseProkeralaHouses(data.chart_rasi?.house_positions || []);

    // Parse aspects (if available)
    chart.aspects = [];

    // Extract sun, moon, ascendant
    const sunPlanet = chart.planets.find((p) => p.planet === 'Sun');
    const moonPlanet = chart.planets.find((p) => p.planet === 'Moon');
    const ascendantHouse = chart.houses.find((h) => h.house === 1);

    chart.sunSign = sunPlanet?.sign || this.getZodiacSign(birthDate);
    chart.moonSign = moonPlanet?.sign || 'Unknown';
    chart.ascendant = ascendantHouse?.sign || 'Unknown';

    return chart;
  }

  /**
   * Parse Prokerala planet positions
   */
  private parseProkeralaPlanets(positions: any[]): PlanetPosition[] {
    return positions.map((p) => ({
      planet: p.name || p.planet,
      sign: p.rasi?.name || p.sign || 'Unknown',
      degree: p.degree || 0,
      house: p.house || 1,
      isRetrograde: p.is_retrograde || false,
    }));
  }

  /**
   * Parse Prokerala house positions
   */
  private parseProkeralaHouses(houses: any[]): HouseData[] {
    return houses.map((h, index) => ({
      house: index + 1,
      sign: h.rasi?.name || h.sign || 'Unknown',
      degree: h.degree || 0,
    }));
  }

  /**
   * Fallback: Basic zodiac calculation (Western astrology)
   */
  private calculateBasicChart(
    birthDate: Date,
    hours: number,
    minutes: number,
    latitude: number,
    longitude: number,
  ): NatalChart {
    const chart = new NatalChart();

    // Calculate Sun sign (most reliable)
    chart.sunSign = this.getZodiacSign(birthDate);

    // Estimate Moon sign (very rough - cycles through zodiac in ~28 days)
    const moonCycle = ((birthDate.getTime() / (28 * 24 * 60 * 60 * 1000)) % 1) * 12;
    const moonSignIndex = Math.floor(moonCycle);
    chart.moonSign = this.zodiacSigns[moonSignIndex];

    // Estimate Ascendant (based on time of day and latitude)
    const ascendantOffset = (hours + minutes / 60) / 2; // 2 hours per sign
    const sunSignIndex = this.zodiacSigns.indexOf(chart.sunSign);
    const ascendantIndex = Math.floor((sunSignIndex + ascendantOffset) % 12);
    chart.ascendant = this.zodiacSigns[ascendantIndex];

    // Create basic planet positions
    chart.planets = this.createBasicPlanets(birthDate, chart.sunSign, chart.moonSign);

    // Create houses
    chart.houses = this.createBasicHouses(chart.ascendant);

    // No aspects in basic calculation
    chart.aspects = [];

    chart.rawApiResponse = JSON.stringify({
      method: 'basic_calculation',
      note: 'This is an approximation. For accurate readings, please configure an astrology API.',
    });

    return chart;
  }

  /**
   * Get zodiac sign from date
   */
  private getZodiacSign(date: Date): string {
    const month = date.getMonth() + 1;
    const day = date.getDate();

    const zodiacDates = [
      { sign: 'Capricorn', start: [1, 1], end: [1, 19] },
      { sign: 'Aquarius', start: [1, 20], end: [2, 18] },
      { sign: 'Pisces', start: [2, 19], end: [3, 20] },
      { sign: 'Aries', start: [3, 21], end: [4, 19] },
      { sign: 'Taurus', start: [4, 20], end: [5, 20] },
      { sign: 'Gemini', start: [5, 21], end: [6, 20] },
      { sign: 'Cancer', start: [6, 21], end: [7, 22] },
      { sign: 'Leo', start: [7, 23], end: [8, 22] },
      { sign: 'Virgo', start: [8, 23], end: [9, 22] },
      { sign: 'Libra', start: [9, 23], end: [10, 22] },
      { sign: 'Scorpio', start: [10, 23], end: [11, 21] },
      { sign: 'Sagittarius', start: [11, 22], end: [12, 21] },
      { sign: 'Capricorn', start: [12, 22], end: [12, 31] },
    ];

    for (const z of zodiacDates) {
      const afterStart = month > z.start[0] || (month === z.start[0] && day >= z.start[1]);
      const beforeEnd = month < z.end[0] || (month === z.end[0] && day <= z.end[1]);

      if (afterStart && beforeEnd) {
        return z.sign;
      }
    }

    return 'Capricorn';
  }

  private readonly zodiacSigns = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
  ];

  /**
   * Create basic planet positions for fallback
   */
  private createBasicPlanets(date: Date, sunSign: string, moonSign: string): PlanetPosition[] {
    return [
      { planet: 'Sun', sign: sunSign, degree: 15, house: 1, isRetrograde: false },
      { planet: 'Moon', sign: moonSign, degree: 15, house: 4, isRetrograde: false },
      { planet: 'Mercury', sign: sunSign, degree: 10, house: 1, isRetrograde: false },
      { planet: 'Venus', sign: this.getAdjacentSign(sunSign, -1), degree: 20, house: 12, isRetrograde: false },
      { planet: 'Mars', sign: this.getAdjacentSign(sunSign, 2), degree: 5, house: 3, isRetrograde: false },
      { planet: 'Jupiter', sign: this.getAdjacentSign(sunSign, 4), degree: 12, house: 5, isRetrograde: false },
      { planet: 'Saturn', sign: this.getAdjacentSign(sunSign, 6), degree: 25, house: 7, isRetrograde: false },
    ];
  }

  /**
   * Get adjacent zodiac sign
   */
  private getAdjacentSign(sign: string, offset: number): string {
    const index = this.zodiacSigns.indexOf(sign);
    const newIndex = (index + offset + 12) % 12;
    return this.zodiacSigns[newIndex];
  }

  /**
   * Create basic houses for fallback
   */
  private createBasicHouses(ascendant: string): HouseData[] {
    const ascIndex = this.zodiacSigns.indexOf(ascendant);
    return Array.from({ length: 12 }, (_, i) => ({
      house: i + 1,
      sign: this.zodiacSigns[(ascIndex + i) % 12],
      degree: 0,
    }));
  }

  /**
   * Get current planetary transits (for daily horoscope)
   */
  async getCurrentTransits(): Promise<PlanetPosition[]> {
    // In production, you'd fetch real-time data from an API
    // For now, return a basic approximation
    const now = new Date();
    return [
      { planet: 'Sun', sign: this.getZodiacSign(now), degree: now.getDate(), house: 1, isRetrograde: false },
      { planet: 'Moon', sign: this.zodiacSigns[Math.floor(Math.random() * 12)], degree: 15, house: 4, isRetrograde: false },
    ];
  }
}


