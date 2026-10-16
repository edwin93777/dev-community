import { PartialType } from '@nestjs/swagger';
import { CreatePostDto } from './create-post.dto.js';

/**
 * DTO de actualización parcial (HU-05, `UpdatePublicacionDto` del caso
 * práctico).
 *
 * `PartialType` vuelve opcionales `titulo` y `contenido` y hereda sus
 * validaciones y documentación Swagger, por lo que una actualización puede
 * enviar solo uno de los dos campos sin perder el otro.
 *
 * El autor, `autorId` y las fechas no forman parte del DTO: cualquier
 * propiedad no declarada se rechaza con `400 Bad Request` gracias al
 * `ValidationPipe` global (`whitelist` + `forbidNonWhitelisted`).
 */
export class UpdatePostDto extends PartialType(CreatePostDto) {}
