import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Protege rutas que requieren un JWT válido en el encabezado
 * `Authorization: Bearer <token>`. Delega la verificación en `JwtStrategy`.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
