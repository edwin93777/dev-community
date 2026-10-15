type Environment = Record<string, string | undefined>;

export function validateEnvironment(environment: Environment): Environment {
  const required = [
    'DB_HOST',
    'DB_PORT',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_DATABASE',
    'DB_LOGGING',
    'DB_SYNCHRONIZE',
  ];
  const missing = required.filter((key) => environment[key] === undefined);

  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno requeridas: ${missing.join(', ')}`,
    );
  }

  if (environment.DB_TYPE !== 'mysql') {
    throw new Error('DB_TYPE debe ser mysql.');
  }

  const dbPort = Number(environment.DB_PORT);
  if (!Number.isInteger(dbPort) || dbPort < 1 || dbPort > 65535) {
    throw new Error('DB_PORT debe ser un puerto válido entre 1 y 65535.');
  }

  const appPort = Number(environment.PORT ?? 3000);
  if (!Number.isInteger(appPort) || appPort < 1 || appPort > 65535) {
    throw new Error('PORT debe ser un puerto válido entre 1 y 65535.');
  }

  for (const key of ['DB_LOGGING', 'DB_SYNCHRONIZE']) {
    const value = environment[key];
    if (value !== 'true' && value !== 'false') {
      throw new Error(`${key} solo puede ser true o false.`);
    }
  }

  if (
    environment.NODE_ENV === 'production' &&
    environment.DB_SYNCHRONIZE === 'true'
  ) {
    throw new Error('DB_SYNCHRONIZE debe ser false en producción.');
  }

  return environment;
}
