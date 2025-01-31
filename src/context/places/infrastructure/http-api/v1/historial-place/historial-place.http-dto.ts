// history-place.dto.ts
import {
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateHistoryPlaceDto {
  @IsString()
  @IsNotEmpty()
  placeId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsObject()
  @IsNotEmpty()
  location: {
    lat: number;
    lng: number;
  };

  @IsNumber()
  @IsOptional()
  rating?: number;

  @IsString()
  @IsOptional()
  photo?: string;

  @IsOptional()
  types?: string[];
}

export class UpdateHistoryPlaceDto extends CreateHistoryPlaceDto {
  // Campos opcionales para actualización
  @IsOptional()
  accessedAt?: Date;
}
