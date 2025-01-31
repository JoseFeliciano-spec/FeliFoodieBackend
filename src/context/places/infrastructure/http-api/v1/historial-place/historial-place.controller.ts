import {
  Body,
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  BadRequestException,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { HistoryPlaceUseCases } from '@/context/places/application/historial-place-use-case/historial-place.use-case';
import {
  CreateHistoryPlaceDto,
  UpdateHistoryPlaceDto,
} from './historial-place.http-dto';
import { AuthGuard } from '@/context/shared/guards/auth.guard';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger/dist';
import { HistoryPlaceDocument } from '@/context/places/infrastructure/schema/history.schema';

export interface PaginationParams {
  pageNo: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

@Controller('v1/history-places')
@UseGuards(AuthGuard)
export class HistoryPlaceController {
  constructor(private readonly historyPlaceService: HistoryPlaceUseCases) {}

  @Post()
  async create(@Request() req, @Body() createDto: CreateHistoryPlaceDto) {
    try {
      const entry = {
        ...createDto,
        userId: req.user.sub,
      };
      return await this.historyPlaceService.create(entry);
    } catch (error) {
      throw new BadRequestException({
        errors: error.toString(),
        message: 'Error creating history entry',
      });
    }
  }

  /**
   * Obtiene el historial de lugares con paginación
   * @param req - Request con información del usuario
   * @param query - Query params para paginación
   */
  @Get()
  @ApiOperation({ summary: 'Get paginated history places for user' })
  @ApiQuery({ name: 'pageNo', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns paginated history places' })
  async findAll(
    @Request() req,
    @Query() query: { pageNo?: string; pageSize?: string },
  ): Promise<PaginatedResponse<HistoryPlaceDocument>> {
    try {
      // Validar y transformar parámetros de paginación
      const pageNo = query.pageNo ? parseInt(query.pageNo, 10) : 1;
      const pageSize = query.pageSize ? parseInt(query.pageSize, 10) : 10;

      if (isNaN(pageNo) || isNaN(pageSize)) {
        throw new BadRequestException({
          message: 'Invalid pagination parameters',
          details: 'Page number and size must be valid numbers',
        });
      }

      if (pageNo < 1 || pageSize < 1) {
        throw new BadRequestException({
          message: 'Invalid pagination parameters',
          details: 'Page number and size must be greater than 0',
        });
      }

      return await this.historyPlaceService.findAllByUser(
        req.user.sub,
        pageNo,
        pageSize,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        message: 'Error fetching history',
        details: error.message,
      });
    }
  }

  @Put(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateHistoryPlaceDto,
  ) {
    try {
      const entry = await this.historyPlaceService.findById(id);

      if (entry?.userId !== req.user.sub) {
        throw new BadRequestException('Unauthorized operation');
      }

      return await this.historyPlaceService.update(id, updateDto);
    } catch (error) {
      throw new BadRequestException({
        errors: error.toString(),
        message: 'Error updating entry',
      });
    }
  }

  @Delete(':id')
  async delete(@Request() req, @Param('id') id: string) {
    try {
      const entry = await this.historyPlaceService.findById(id);

      if (entry?.userId !== req.user.sub) {
        throw new BadRequestException('Unauthorized operation');
      }

      return await this.historyPlaceService.delete(id);
    } catch (error) {
      throw new BadRequestException({
        errors: error.toString(),
        message: 'Error deleting entry',
      });
    }
  }
}
