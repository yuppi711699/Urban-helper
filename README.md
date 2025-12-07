# Natal Chart WhatsApp Bot 🔮

A NestJS-powered WhatsApp bot that creates personalized natal charts and provides AI-driven astrological guidance.

## Features

- 📱 WhatsApp integration via Twilio
- 🌟 Natal chart generation using external astrology APIs
- 🤖 AI-powered chart interpretation (ChatGPT/GPT-4)
- 💬 Conversational interface with state management
- 📊 Personalized daily horoscopes
- 💾 PostgreSQL database for user data persistence

## Architecture

```
src/
├── main.ts                    # Application entry point
├── app.module.ts              # Root module
├── whatsapp/                  # WhatsApp webhook handling
│   ├── whatsapp.module.ts
│   ├── whatsapp.controller.ts
│   ├── whatsapp.service.ts
│   └── dto/
├── astrology/                 # Natal chart generation
│   ├── astrology.module.ts
│   ├── astrology.service.ts
│   └── entities/
├── ai/                        # OpenAI integration
│   ├── ai.module.ts
│   └── ai.service.ts
├── user/                      # User management
│   ├── user.module.ts
│   ├── user.service.ts
│   └── entities/
└── conversation/              # Chat state machine
    ├── conversation.module.ts
    ├── conversation.service.ts
    └── entities/
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `env.example` to `.env` and fill in your credentials:

```bash
cp env.example .env
```

Required environment variables:

| Variable | Description |
|----------|-------------|
| `DB_HOST`, `DB_PORT`, etc. | PostgreSQL connection |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_WHATSAPP_NUMBER` | Your Twilio WhatsApp number |
| `OPENAI_API_KEY` | OpenAI API key for GPT |
| `ASTROLOGY_API_CLIENT_ID` | Prokerala API client ID |
| `ASTROLOGY_API_CLIENT_SECRET` | Prokerala API secret |

### 3. Database Setup

Create a PostgreSQL database:

```bash
createdb natal_bot
```

The app will auto-sync tables in development mode.

### 4. Run the Application

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## WhatsApp Setup (Twilio)

1. Create a Twilio account at https://www.twilio.com
2. Enable the WhatsApp Sandbox or get a WhatsApp-enabled number
3. Set your webhook URL in Twilio console:
   - Webhook URL: `https://your-domain.com/webhook/whatsapp`
   - Method: POST

For local development, use ngrok:

```bash
ngrok http 3000
```

Then update Twilio webhook URL with your ngrok URL.

## API Integrations

### Astrology API (Prokerala)

Sign up at https://api.prokerala.com/ for natal chart data.

The app includes a fallback calculation if the API is unavailable.

### OpenAI (GPT-4)

Get your API key at https://platform.openai.com/

The app includes fallback responses if OpenAI is unavailable.

## User Flow

1. User sends message to WhatsApp bot
2. Bot asks for name
3. Bot asks for birth date (DD/MM/YYYY)
4. Bot asks for birth time (HH:MM or "unknown")
5. Bot asks for birth place (city, country)
6. Bot generates natal chart and AI interpretation
7. User can ask ongoing questions about their chart

## Commands

- `menu` / `help` - Show available options
- `my chart` - View chart summary
- `today` / `daily` - Get daily horoscope
- `reset` - Start over with new chart

## Development

```bash
# Run tests
npm run test

# Lint
npm run lint

# Format
npm run format
```

## License

MIT

