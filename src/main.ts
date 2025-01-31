import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración de Swagger para FeliTask
  const config = new DocumentBuilder()
    .setTitle('FeliTask API')
    .setDescription(
      'API de gestión de tareas FeliTask - Sistema de organización personal y productividad',
    )
    .setVersion('1.0')
    .addTag('tasks', 'Gestión de tareas personales')
    .addTag('auth', 'Autenticación y gestión de usuarios')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingresa tu token JWT',
        in: 'header',
      },
      'access-token',
    )
    .addServer('http://localhost:8080', 'Servidor de desarrollo')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, documentFactory);

  // Habilitar CORS para el desarrollo
  app.enableCors();

  // Iniciar el servidor
  await app.listen(process.env.PORT || 4000);

  console.log(
    `La documentación de la API está disponible en: ${await app.getUrl()}/docs`,
  );
}

bootstrap();
