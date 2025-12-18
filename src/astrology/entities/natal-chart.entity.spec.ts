import {
  NatalChart,
  PlanetPosition,
  HouseData,
  AspectData,
} from './natal-chart.entity';

describe('NatalChart Entity', () => {
  describe('NatalChart class', () => {
    it('should create a natal chart instance', () => {
      const chart = new NatalChart();
      expect(chart).toBeInstanceOf(NatalChart);
    });

    it('should allow setting all properties', () => {
      const chart = new NatalChart();
      chart.id = 'chart-uuid';
      chart.sunSign = 'Capricorn';
      chart.moonSign = 'Aries';
      chart.ascendant = 'Leo';
      chart.planets = [];
      chart.houses = [];
      chart.aspects = [];

      expect(chart.id).toBe('chart-uuid');
      expect(chart.sunSign).toBe('Capricorn');
      expect(chart.moonSign).toBe('Aries');
      expect(chart.ascendant).toBe('Leo');
    });

    it('should store planet positions correctly', () => {
      const chart = new NatalChart();
      const planets: PlanetPosition[] = [
        { planet: 'Sun', sign: 'Capricorn', degree: 15.5, house: 1, isRetrograde: false },
        { planet: 'Moon', sign: 'Aries', degree: 22.3, house: 4, isRetrograde: false },
        { planet: 'Mercury', sign: 'Sagittarius', degree: 5.0, house: 12, isRetrograde: true },
      ];
      chart.planets = planets;

      expect(chart.planets).toHaveLength(3);
      expect(chart.planets[0].planet).toBe('Sun');
      expect(chart.planets[2].isRetrograde).toBe(true);
    });

    it('should store house data correctly', () => {
      const chart = new NatalChart();
      const houses: HouseData[] = [
        { house: 1, sign: 'Leo', degree: 0 },
        { house: 2, sign: 'Virgo', degree: 30 },
        { house: 3, sign: 'Libra', degree: 60 },
      ];
      chart.houses = houses;

      expect(chart.houses).toHaveLength(3);
      expect(chart.houses[0].sign).toBe('Leo');
    });

    it('should store aspect data correctly', () => {
      const chart = new NatalChart();
      const aspects: AspectData[] = [
        { planet1: 'Sun', planet2: 'Moon', aspect: 'Square', orb: 2.5 },
        { planet1: 'Venus', planet2: 'Mars', aspect: 'Trine', orb: 1.2 },
      ];
      chart.aspects = aspects;

      expect(chart.aspects).toHaveLength(2);
      expect(chart.aspects[0].aspect).toBe('Square');
      expect(chart.aspects[1].orb).toBe(1.2);
    });

    it('should store raw API response', () => {
      const chart = new NatalChart();
      const rawResponse = JSON.stringify({ test: 'data' });
      chart.rawApiResponse = rawResponse;

      expect(chart.rawApiResponse).toBe(rawResponse);
      expect(JSON.parse(chart.rawApiResponse)).toEqual({ test: 'data' });
    });

    it('should store AI interpretation', () => {
      const chart = new NatalChart();
      chart.aiInterpretation = 'Your chart shows great potential...';

      expect(chart.aiInterpretation).toContain('great potential');
    });
  });
});

describe('PlanetPosition interface', () => {
  it('should define correct structure', () => {
    const planet: PlanetPosition = {
      planet: 'Saturn',
      sign: 'Aquarius',
      degree: 28.7,
      house: 7,
      isRetrograde: true,
    };

    expect(planet.planet).toBe('Saturn');
    expect(planet.sign).toBe('Aquarius');
    expect(planet.degree).toBe(28.7);
    expect(planet.house).toBe(7);
    expect(planet.isRetrograde).toBe(true);
  });
});

describe('HouseData interface', () => {
  it('should define correct structure', () => {
    const house: HouseData = {
      house: 10,
      sign: 'Taurus',
      degree: 15.0,
    };

    expect(house.house).toBe(10);
    expect(house.sign).toBe('Taurus');
    expect(house.degree).toBe(15.0);
  });
});

describe('AspectData interface', () => {
  it('should define correct structure', () => {
    const aspect: AspectData = {
      planet1: 'Jupiter',
      planet2: 'Neptune',
      aspect: 'Conjunction',
      orb: 0.5,
    };

    expect(aspect.planet1).toBe('Jupiter');
    expect(aspect.planet2).toBe('Neptune');
    expect(aspect.aspect).toBe('Conjunction');
    expect(aspect.orb).toBe(0.5);
  });
});







