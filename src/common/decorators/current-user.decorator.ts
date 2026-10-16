import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface.js';

/**
 * Extrae la identidad autenticada (`request.user`) publicada por `JwtStrategy`.
 * Opcionalmente recibe el nombre de una propiedad concreta.
 *
 * @example
 * findProfile(@CurrentUser() user: AuthenticatedUser) {}
 * findId(@CurrentUser('id') userId: string) {}
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      return undefined;
    }

    return data ? user[data] : user;
  },
);
