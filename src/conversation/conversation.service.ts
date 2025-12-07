import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, MessageRole } from './entities/message.entity';
import { User, ConversationState } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';
import { AstrologyService } from '../astrology/astrology.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly userService: UserService,
    @Inject(forwardRef(() => AstrologyService))
    private readonly astrologyService: AstrologyService,
    @Inject(forwardRef(() => AiService))
    private readonly aiService: AiService,
  ) {}

  /**
   * Main conversation state machine - processes user messages
   */
  async processMessage(user: User, messageText: string): Promise<string> {
    // Save user message
    await this.saveMessage(user.id, MessageRole.USER, messageText);

    let response: string;

    switch (user.conversationState) {
      case ConversationState.NEW:
        response = await this.handleNewUser(user);
        break;

      case ConversationState.AWAITING_NAME:
        response = await this.handleNameInput(user, messageText);
        break;

      case ConversationState.AWAITING_BIRTH_DATE:
        response = await this.handleBirthDateInput(user, messageText);
        break;

      case ConversationState.AWAITING_BIRTH_TIME:
        response = await this.handleBirthTimeInput(user, messageText);
        break;

      case ConversationState.AWAITING_BIRTH_PLACE:
        response = await this.handleBirthPlaceInput(user, messageText);
        break;

      case ConversationState.CHART_READY:
      case ConversationState.CHATTING:
        response = await this.handleChatMessage(user, messageText);
        break;

      default:
        response = await this.handleNewUser(user);
    }

    // Save assistant response
    await this.saveMessage(user.id, MessageRole.ASSISTANT, response);

    return response;
  }

  /**
   * Handle new user - welcome and ask for name
   */
  private async handleNewUser(user: User): Promise<string> {
    await this.userService.updateState(user.id, ConversationState.AWAITING_NAME);

    return `✨ *Welcome to Natal Chart Bot!* ✨

I'm your personal astrology guide. I'll create your unique birth chart and provide insights about your life path, personality, and cosmic influences.

To begin, *what's your name?*`;
  }

  /**
   * Handle name input
   */
  private async handleNameInput(user: User, name: string): Promise<string> {
    const cleanName = name.trim().replace(/[^a-zA-Zа-яА-Я\s-']/g, '');

    if (cleanName.length < 2) {
      return "Please enter a valid name (at least 2 characters).";
    }

    await this.userService.updateBirthInfo(user.id, { name: cleanName });
    await this.userService.updateState(user.id, ConversationState.AWAITING_BIRTH_DATE);

    return `Nice to meet you, *${cleanName}*! 🌟

Now I need your birth date to create your natal chart.

*Please enter your birth date* in format:
📅 DD/MM/YYYY (e.g., 25/12/1990)`;
  }

  /**
   * Handle birth date input
   */
  private async handleBirthDateInput(user: User, input: string): Promise<string> {
    const dateMatch = input.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);

    if (!dateMatch) {
      return `❌ Invalid date format. Please use DD/MM/YYYY format.

Example: 25/12/1990`;
    }

    const [, day, month, year] = dateMatch;
    const birthDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    // Validate date
    if (
      birthDate.getDate() !== parseInt(day) ||
      birthDate.getMonth() !== parseInt(month) - 1 ||
      birthDate.getFullYear() !== parseInt(year)
    ) {
      return "❌ That doesn't seem to be a valid date. Please check and try again.";
    }

    const now = new Date();
    if (birthDate > now) {
      return "❌ Birth date cannot be in the future!";
    }

    if (birthDate.getFullYear() < 1900) {
      return "❌ Please enter a birth year after 1900.";
    }

    await this.userService.updateBirthInfo(user.id, { birthDate });
    await this.userService.updateState(user.id, ConversationState.AWAITING_BIRTH_TIME);

    return `📅 Birth date saved: *${day}/${month}/${year}*

Now, *what time were you born?*

Please enter in 24-hour format:
🕐 HH:MM (e.g., 14:30 or 09:15)

💡 _If you don't know your exact birth time, type "unknown" and I'll use noon (12:00)._`;
  }

  /**
   * Handle birth time input
   */
  private async handleBirthTimeInput(user: User, input: string): Promise<string> {
    let birthTime: string;

    if (input.toLowerCase().includes('unknown') || input.toLowerCase().includes('don\'t know')) {
      birthTime = '12:00';
    } else {
      const timeMatch = input.match(/(\d{1,2}):(\d{2})/);

      if (!timeMatch) {
        return `❌ Invalid time format. Please use HH:MM format.

Example: 14:30 or type "unknown"`;
      }

      const [, hours, minutes] = timeMatch;
      const h = parseInt(hours);
      const m = parseInt(minutes);

      if (h < 0 || h > 23 || m < 0 || m > 59) {
        return "❌ Invalid time. Hours should be 0-23 and minutes 0-59.";
      }

      birthTime = `${hours.padStart(2, '0')}:${minutes}`;
    }

    await this.userService.updateBirthInfo(user.id, { birthTime });
    await this.userService.updateState(user.id, ConversationState.AWAITING_BIRTH_PLACE);

    return `🕐 Birth time saved: *${birthTime}*

Finally, *where were you born?*

Please enter your birth city and country:
📍 Example: London, UK or New York, USA`;
  }

  /**
   * Handle birth place input
   */
  private async handleBirthPlaceInput(user: User, input: string): Promise<string> {
    const place = input.trim();

    if (place.length < 2) {
      return "Please enter a valid city name.";
    }

    try {
      // Geocode the location
      const location = await this.astrologyService.geocodeLocation(place);

      await this.userService.updateBirthInfo(user.id, {
        birthPlace: location.formattedAddress || place,
        birthLatitude: location.latitude,
        birthLongitude: location.longitude,
        timezone: location.timezone,
      });

      // Generate natal chart
      const updatedUser = await this.userService.findById(user.id);
      const chartGenerationMsg = `📍 Location found: *${location.formattedAddress || place}*

⏳ *Calculating your natal chart...*`;

      // Generate the chart (this might take a moment)
      const chart = await this.astrologyService.generateNatalChart(updatedUser);

      await this.userService.updateState(user.id, ConversationState.CHART_READY);

      // Get AI interpretation of the chart
      const interpretation = await this.aiService.interpretNatalChart(chart);

      return `${chartGenerationMsg}

✅ *Your Natal Chart is Ready!*

☀️ *Sun Sign:* ${chart.sunSign}
🌙 *Moon Sign:* ${chart.moonSign}
⬆️ *Ascendant:* ${chart.ascendant}

---

${interpretation}

---

🔮 You can now ask me anything about your chart, life path, relationships, career, or get personalized advice!

Type *"menu"* to see what I can help you with.`;
    } catch (error) {
      this.logger.error(`Error processing birth place: ${error.message}`);
      return `❌ I couldn't find that location. Please try again with a more specific location.

Example: "London, United Kingdom" or "New York City, USA"`;
    }
  }

  /**
   * Handle ongoing chat messages
   */
  private async handleChatMessage(user: User, message: string): Promise<string> {
    const lowerMessage = message.toLowerCase().trim();

    // Handle menu command
    if (lowerMessage === 'menu' || lowerMessage === 'help') {
      return this.getMenuText();
    }

    // Handle reset command
    if (lowerMessage === 'reset' || lowerMessage === 'start over') {
      await this.userService.updateState(user.id, ConversationState.NEW);
      return "🔄 Starting over! Let's create a new chart.\n\n*What's your name?*";
    }

    // Handle chart summary request
    if (lowerMessage.includes('my chart') || lowerMessage.includes('summary')) {
      return this.getChartSummary(user);
    }

    // Handle daily horoscope request
    if (lowerMessage.includes('today') || lowerMessage.includes('daily') || lowerMessage.includes('horoscope')) {
      return this.aiService.getDailyHoroscope(user);
    }

    // Update state to chatting
    if (user.conversationState === ConversationState.CHART_READY) {
      await this.userService.updateState(user.id, ConversationState.CHATTING);
    }

    // Get conversation history for context
    const history = await this.getRecentMessages(user.id, 10);

    // Get AI response with chart context
    return this.aiService.getPersonalizedAdvice(user, message, history);
  }

  /**
   * Get menu text
   */
  private getMenuText(): string {
    return `🔮 *What can I help you with?*

📊 *"my chart"* - View your natal chart summary
🌅 *"today"* - Get your daily horoscope
💕 *"love"* - Relationship insights
💼 *"career"* - Career guidance
🧘 *"health"* - Wellness advice
🔄 *"reset"* - Create a new chart

Or simply ask me any question about your life, personality, or future!`;
  }

  /**
   * Get chart summary for user
   */
  private getChartSummary(user: User): string {
    if (!user.natalChart) {
      return "❌ No chart found. Type *reset* to create one.";
    }

    const chart = user.natalChart;
    return `📊 *Your Natal Chart Summary*

👤 *Name:* ${user.name}
📅 *Born:* ${user.birthDate}
🕐 *Time:* ${user.birthTime}
📍 *Place:* ${user.birthPlace}

---

☀️ *Sun in ${chart.sunSign}*
Your core identity and ego

🌙 *Moon in ${chart.moonSign}*
Your emotions and inner self

⬆️ *Ascendant in ${chart.ascendant}*
How others perceive you

---

Ask me anything about your chart! 🔮`;
  }

  /**
   * Save message to database
   */
  private async saveMessage(userId: string, role: MessageRole, content: string): Promise<Message> {
    const message = this.messageRepository.create({
      userId,
      role,
      content,
    });
    return this.messageRepository.save(message);
  }

  /**
   * Get recent messages for context
   */
  async getRecentMessages(userId: string, limit: number = 10): Promise<Message[]> {
    return this.messageRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}

