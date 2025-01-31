import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TaskDocument = HydratedDocument<TaskMongo>;

@Schema({ collection: 'tasks' })
export class TaskMongo {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: ['pending', 'in-progress', 'completed'] })
  status: 'pending' | 'in-progress' | 'completed';

  @Prop({ default: Date.now })
  createdAt?: Date;

  @Prop({ default: Date.now })
  updatedAt?: Date;

  @Prop({ required: true })
  userId: string;

  @Prop()
  dueDate?: string;
}

export const TaskSchema = SchemaFactory.createForClass(TaskMongo);
