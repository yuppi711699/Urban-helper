import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { User } from '../user/entities/user.entity';
import { NatalChart } from '../astrology/entities/natal-chart.entity';
import { Message, MessageRole } from '../conversation/entities/message.entity';
import { AstrologyService } from '../astrology/astrology.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;
  private model: string;

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => AstrologyService))
    private readonly astrologyService: AstrologyService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.model = this.configService.get<string>('OPENAI_MODEL', 'gpt-4-turbo-preview');

    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      this.logger.warn('OpenAI API key not configured');
    }
  }

  /**
   * Interpret natal chart and create life story narrative
   */
  async interpretNatalChart(chart: NatalChart): Promise<string> {
    const prompt = this.buildChartInterpretationPrompt(chart);

    if (!this.openai) {
      return this.getFallbackInterpretation(chart);
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are an expert astrologer with deep knowledge of natal chart interpretation. 
You provide insightful, personalized readings that are both mystical and practical.
Keep responses warm, engaging, and formatted for WhatsApp (use *bold* and emojis sparingly).
Limit your response to ~500 words.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 800,
      });

      const interpretation = response.choices[0]?.message?.content || this.getFallbackInterpretation(chart);

      // Save interpretation to chart
      chart.aiInterpretation = interpretation;

      return interpretation;
    } catch (error) {
      this.logger.error(`OpenAI error: ${error.message}`);
      return this.getFallbackInterpretation(chart);
    }
  }

  /**
   * Get personalized advice based on user's chart and question
   */
  async getPersonalizedAdvice(
    user: User,
    question: string,
    messageHistory: Message[],
  ): Promise<string> {
    if (!this.openai) {
      return this.getFallbackAdvice(user, question);
    }

    const systemPrompt = this.buildAdvisorSystemPrompt(user);
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history (in chronological order, limited)
    const recentHistory = messageHistory.slice(-8).reverse();
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role === MessageRole.USER ? 'user' : 'assistant',
        content: msg.content,
      });
    }

    // Add current question
    messages.push({ role: 'user', content: question });

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 600,
      });

      return response.choices[0]?.message?.content || "I'm having trouble thinking right now. Please try again.";
    } catch (error) {
      this.logger.error(`OpenAI error: ${error.message}`);
      return this.getFallbackAdvice(user, question);
    }
  }

  /**
   * Get daily horoscope personalized to user's chart
   */
  async getDailyHoroscope(user: User): Promise<string> {
    if (!user.natalChart) {
      return "❌ I don't have your chart yet. Let's create one first!";
    }

    const today = new Date();
    const transits = await this.astrologyService.getCurrentTransits();

    if (!this.openai) {
      return this.getFallbackDailyHoroscope(user);
    }

    const prompt = `Generate a personalized daily horoscope for today (${today.toLocaleDateString()}).

User's Natal Chart:
- Sun Sign: ${user.natalChart.sunSign}
- Moon Sign: ${user.natalChart.moonSign}
- Ascendant: ${user.natalChart.ascendant}

Current Transits:
${transits.map((t) => `- ${t.planet} in ${t.sign}`).join('\n')}

Provide:
1. Overall energy for today
2. Lucky areas (love, career, health)
3. A piece of practical advice
4. A power word/mantra for the day

Format for WhatsApp with emojis. Keep it under 300 words.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a mystical yet practical astrologer providing daily guidance. Be encouraging and specific.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.9,
        max_tokens: 500,
      });

      return response.choices[0]?.message?.content || this.getFallbackDailyHoroscope(user);
    } catch (error) {
      this.logger.error(`OpenAI error: ${error.message}`);
      return this.getFallbackDailyHoroscope(user);
    }
  }

  /**
   * Build prompt for chart interpretation
   */
  private buildChartInterpretationPrompt(chart: NatalChart): string {
    let prompt = `Interpret this natal chart and provide insights about the person's personality, strengths, challenges, and life path.

*Core Placements:*
- Sun in ${chart.sunSign}: Core identity
- Moon in ${chart.moonSign}: Emotional nature
- Ascendant in ${chart.ascendant}: Public persona

`;

    if (chart.planets && chart.planets.length > 0) {
      prompt += `*Planetary Positions:*\n`;
      for (const planet of chart.planets) {
        prompt += `- ${planet.planet} in ${planet.sign}${planet.isRetrograde ? ' (Retrograde)' : ''}\n`;
      }
    }

    prompt += `
Provide a reading that covers:
1. Personality overview (who they are at their core)
2. Emotional nature and needs
3. How they appear to others
4. Key strengths to embrace
5. Potential challenges to work on
6. Life purpose hints

Make it personal, insightful, and actionable. Format for WhatsApp (use *bold* for emphasis).`;

    return prompt;
  }

  /**
   * Build system prompt for ongoing advice
   */
  private buildAdvisorSystemPrompt(user: User): string {
    const chart = user.natalChart;

    let prompt = `You are a wise astrological advisor providing personalized guidance to ${user.name || 'this person'}.

Their Natal Chart Profile:
- Sun Sign: ${chart?.sunSign || 'Unknown'} (Core identity, ego, life force)
- Moon Sign: ${chart?.moonSign || 'Unknown'} (Emotions, instincts, inner self)
- Ascendant: ${chart?.ascendant || 'Unknown'} (How they appear to others, first impressions)
`;

    if (chart?.planets) {
      prompt += `\nKey Planetary Placements:\n`;
      chart.planets.slice(0, 7).forEach((p) => {
        prompt += `- ${p.planet} in ${p.sign}\n`;
      });
    }

    prompt += `
Guidelines for your responses:
1. Always consider their chart when giving advice
2. Be warm, supportive, and mystically insightful
3. Provide practical, actionable guidance
4. Reference their specific placements when relevant
5. Keep responses concise (under 300 words) and formatted for WhatsApp
6. Use *bold* for emphasis and emojis sparingly
7. For relationship questions, consider their Venus placement
8. For career questions, consider their Saturn and 10th house
9. For emotional matters, focus on their Moon sign

Never break character. You are their personal astrological guide.`;

    return prompt;
  }

  /**
   * Fallback interpretation when OpenAI is unavailable
   */
  private getFallbackInterpretation(chart: NatalChart): string {
    return `🌟 *Your Cosmic Blueprint*

As a *${chart.sunSign}* Sun, your core essence radiates with the energy of this sign. Your identity, ego, and life force are colored by ${chart.sunSign}'s unique characteristics.

With your Moon in *${chart.moonSign}*, your emotional world runs deep. This placement reveals how you process feelings, seek comfort, and nurture yourself and others.

Your *${chart.ascendant}* Ascendant is the mask you show the world - it's how others first perceive you and how you initiate new beginnings.

*Key Themes for You:*
• Embrace your ${chart.sunSign} strengths
• Honor your ${chart.moonSign} emotional needs
• Use your ${chart.ascendant} rising energy to make great first impressions

Ask me specific questions about love, career, or personal growth to get deeper insights! 🔮`;
  }

  /**
   * Fallback advice when OpenAI is unavailable
   */
  private getFallbackAdvice(user: User, question: string): string {
    const chart = user.natalChart;
    const sunSign = chart?.sunSign || 'your sign';

    const questionLower = question.toLowerCase();

    if (questionLower.includes('love') || questionLower.includes('relationship')) {
      return `💕 *Love Insight for ${sunSign}*

Your ${sunSign} nature influences how you love. Remember to balance your ${chart?.moonSign || 'emotional'} needs with your partner's energy.

Key advice: Communication is essential. Express your feelings openly and listen with compassion.`;
    }

    if (questionLower.includes('career') || questionLower.includes('work') || questionLower.includes('job')) {
      return `💼 *Career Insight for ${sunSign}*

Your ${sunSign} energy brings unique gifts to your professional life. Trust your natural abilities and don't be afraid to lead.

Key advice: This is a time for strategic planning. Set clear goals and take consistent action.`;
    }

    return `🔮 *Guidance for ${user.name || 'You'}*

As a ${sunSign}, trust your natural instincts on this matter. Your ${chart?.moonSign || 'emotional'} Moon helps you sense the right path.

Key advice: Take time to reflect before making major decisions. The stars support thoughtful action.

Feel free to ask me more specific questions! 🌟`;
  }

  /**
   * Fallback daily horoscope
   */
  private getFallbackDailyHoroscope(user: User): string {
    const chart = user.natalChart;
    const today = new Date();
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()];

    return `🌅 *Daily Horoscope for ${user.name || chart?.sunSign}*
📅 ${dayOfWeek}, ${today.toLocaleDateString()}

*Overall Energy:* ⭐⭐⭐⭐

As a ${chart?.sunSign || 'cosmic'} soul, today brings opportunities for growth and connection. Your ${chart?.moonSign || 'emotional'} Moon encourages you to trust your feelings.

*Focus Areas:*
💕 Love: Open heart conversations
💼 Career: Creative problem-solving
🧘 Wellness: Take mindful breaks

*Power Word:* ✨ *Balance* ✨

Remember, you create your own luck. Make today count! 🌟`;
  }
}

