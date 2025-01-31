import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FavoritePlaceDocument = HydratedDocument<FavoritePlace>;

@Schema({ collection: 'favorite_places' })
export class FavoritePlace {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  placeId: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  address: string;

  @Prop({ type: { lat: Number, lng: Number }, required: true })
  location: {
    lat: number;
    lng: number;
  };

  @Prop()
  rating?: number;

  @Prop()
  photo?: string;

  @Prop([String])
  types?: string[];

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const FavoritePlaceSchema = SchemaFactory.createForClass(FavoritePlace);
