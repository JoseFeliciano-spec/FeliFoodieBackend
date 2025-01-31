import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type HistoryPlaceDocument = HydratedDocument<HistoryPlace>;

@Schema({ collection: 'history_places' })
export class HistoryPlace {
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
  accessedAt: Date;
}

export const HistoryPlaceSchema = SchemaFactory.createForClass(HistoryPlace);
