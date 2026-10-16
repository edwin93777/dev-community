export const configuration = () => {
  const nodeEnv = process.env.NODE_ENV;

  return {
    app: {
      nodeEnv,
      port: Number(process.env.PORT),
      apiPrefix: process.env.API_PREFIX,
    },
    database: {
      type: 'mysql' as const,
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      charset: process.env.DB_CHARSET,
      logging: Boolean(process.env.DB_LOGGING),
      synchronize: Boolean(process.env.DB_SYNCHRONIZE),
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN,
    },
    swagger: {
      title: process.env.SWAGGER_TITLE,
      description: process.env.SWAGGER_DESCRIPTION,
      version: process.env.SWAGGER_VERSION,
      path: process.env.SWAGGER_PATH,
    },
  };
};
