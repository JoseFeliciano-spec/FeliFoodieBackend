import { Module } from '@nestjs/common';
import { PlacesController } from './http-api/v1/crud-tasks.ts/crud-places.controller';

@Module({
  imports: [],
  controllers: [PlacesController],
  providers: [],
  exports: [],
})
export class PlacesModules {}
