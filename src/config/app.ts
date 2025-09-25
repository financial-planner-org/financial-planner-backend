import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Configurações do servidor
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Configurações do banco de dados
  database: {
    url: process.env.DATABASE_URL || '',
  },
  
  // Autenticação
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    refreshSecret: process.env.REFRESH_TOKEN_SECRET || 'your_refresh_token_secret_here',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  },
  
  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  
  // Logs
  logs: {
    level: process.env.LOG_LEVEL || 'info',
  },
} as const;

export type AppConfig = typeof config;
