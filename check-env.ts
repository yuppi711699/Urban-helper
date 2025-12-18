import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const EnvVars: string[] = [
  'PORT',
  'NODE_ENV',
  // Database
  'DB_HOST',
  'DB_PORT',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_NAME',

  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_NUMBER',
  'ADMIN_WHATSAPP_NUMBER',
  'OPENAI_PROJECT_NAME',
  'OPENAI_PROJECT_ID',
  'OPENAI_API_KEY',
  'OPENAI_MODEL',
  'ASTROLOGY_API_CLIENT_NAME',
  'ASTROLOGY_API_CLIENT_ID',
  'ASTROLOGY_API_CLIENT_SECRET',
  'WEBHOOK_VERIFY_TOKEN',
];

function checkEnv() {
  const missedVarArr = EnvVars.filter((envVar) => {
    if (envVar === 'DB_PASSWORD' && process.env[envVar] === '') {
      return false;
    }
    return !process.env[envVar];
  });

  const allMissedVarArr = [...missedVarArr];

  if (allMissedVarArr.length > 0) {
    console.error('❌ Missing environment variables:');
    allMissedVarArr.forEach((envVar) => console.error(`   - ${envVar}`));

    process.exit(1);
  }
}

checkEnv();
