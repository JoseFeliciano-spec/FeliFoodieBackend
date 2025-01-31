import { Module } from '@nestjs/common';
import { PlacesController } from './http-api/v1/crud-places/crud-places.controller';
/* import { HistoryPlaceSchema, HistoryPlace } from './schema/history.schema';
 */import { FavoritePlaceSchema, FavoritePlace } from './schema/favorite.schema';
import { MongooseModule } from '@nestjs/mongoose';
/* import { HistoryPlaceController } from './http-api/v1/historial-place/historial-place.controller';
import { HistoryPlaceUseCases } from '../application/historial-place-use-case/historial-place.use-case'; */
@Module({
  imports: [
    /* MongooseModule.forFeature([
      { name: HistoryPlace.name, schema: HistoryPlaceSchema },
    ]), */
    MongooseModule.forFeature([
      { name: FavoritePlace.name, schema: FavoritePlaceSchema },
    ]),
  ],
  controllers: [PlacesController, /* HistoryPlaceController */],
  providers: [/* HistoryPlaceUseCases */],
  exports: [],
})
export class PlacesModules {}
