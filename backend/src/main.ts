import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use((req: any, res: any, next: any) => {
    console.log(`[REQ] ${req.method} ${req.url} ct=${req.headers['content-type'] ?? 'none'}`);
    const origEnd = res.end;
    res.end = function (...args: any[]) {
      console.log(`[RES] ${req.method} ${req.url} → ${res.statusCode}`);
      return origEnd.apply(this, args);
    };
    next();
  });

  // Global prefix — todas las rutas quedan como /api/v1/...
  app.setGlobalPrefix('api');

  // Global exception filter
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // URI versioning: /api/v1/...
  app.enableVersioning({ type: VersioningType.URI });

  // CORS — supports comma-separated list of origins in CORS_ORIGIN
  const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim());
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  });

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Cronotix API')
    .setDescription('Portal de Agentes IA - API v1')
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', in: 'header', name: 'x-api-key' }, 'api-key')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Cronotix API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
}

void bootstrap();
