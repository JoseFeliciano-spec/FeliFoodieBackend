import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import {
  HistoryPlace,
  HistoryPlaceDocument,
} from '@/context/places/infrastructure/schema/history.schema';
import {
  CreateHistoryPlaceDto,
  UpdateHistoryPlaceDto,
} from '@/context/places/infrastructure/http-api/v1/historial-place/historial-place.http-dto';
import { PaginatedResponse } from '@/context/places/infrastructure/http-api/v1/historial-place/historial-place.controller';

@Injectable()
export class HistoryPlaceUseCases {
  constructor(
    @InjectModel(HistoryPlace.name)
    private readonly historyPlaceModel: Model<HistoryPlaceDocument>,
  ) {}

  async create(
    createDto: CreateHistoryPlaceDto,
  ): Promise<HistoryPlaceDocument> {
    try {
      return await this.historyPlaceModel.create({
        ...createDto,
        accessedAt: new Date(),
      });
    } catch (error) {
      throw new Error(`Error creating history entry: ${error.message}`);
    }
  }

  /**
   * Encuentra todos los lugares históricos de un usuario con paginación
   * @param userId - ID del usuario
   * @param pageNo - Número de página (mínimo 1)
   * @param pageSize - Tamaño de página (entre 1 y 100)
   * @returns Respuesta paginada con los lugares históricos
   */
  async findAllByUser(
    userId: string,
    pageNo: number,
    pageSize: number,
  ): Promise<PaginatedResponse<HistoryPlaceDocument>> {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required');
      }

      if (pageSize > 100) {
        throw new BadRequestException("Page size cannot exceed 100");
      }
  
      const validatedPageNo = Math.max(1, pageNo);
      const validatedPageSize = Math.min(Math.max(1, pageSize), 100); // Máximo 100
  
      // Optimizar: Usar estimación de conteo si es posible
      const total = await this.historyPlaceModel.countDocuments({ userId }).maxTimeMS(5000); // Timeout de 5s
  
      const documents = await this.historyPlaceModel
        .find({ userId })
        .sort({ accessedAt: -1 })
        .skip((validatedPageNo - 1) * validatedPageSize)
        .limit(validatedPageSize)
        .lean() // Reduce memoria usando objetos planos
        .maxTimeMS(5000) // Timeout de 5s
        .exec();

      const totalPages = Math.ceil(total / validatedPageSize);

      // Aseguramos que documents sea tratado como HistoryPlaceDocument[]
      const response: PaginatedResponse<HistoryPlaceDocument> = {
        data: documents, // Ahora documents está correctamente tipado
        total,
        page: validatedPageNo,
        totalPages,
        hasNextPage: validatedPageNo < totalPages,
        hasPreviousPage: validatedPageNo > 1,
      };

      return response;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error getting user history: ${error.message}`,
      );
    }
  }

  async findById(id: string): Promise<HistoryPlaceDocument | null> {
    try {
      return await this.historyPlaceModel.findById(id).exec();
    } catch (error) {
      throw new Error(`Error finding history entry: ${error.message}`);
    }
  }

  async update(
    id: string,
    updateDto: UpdateHistoryPlaceDto,
  ): Promise<HistoryPlaceDocument | null> {
    try {
      return await this.historyPlaceModel
        .findByIdAndUpdate(id, updateDto, { new: true })
        .exec();
    } catch (error) {
      throw new Error(`Error updating history entry: ${error.message}`);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.historyPlaceModel.deleteOne({ _id: id }).exec();
      return result.deletedCount > 0;
    } catch (error) {
      throw new Error(`Error deleting history entry: ${error.message}`);
    }
  }
}
