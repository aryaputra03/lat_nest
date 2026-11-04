import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @ApiOperation({ summary: 'Buat tugas baru' })
  @Post()
  create(@CurrentUser() user: { sub: string }, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(user.sub, dto);
  }

  @ApiOperation({ summary: 'Daftar tugas milik user (filter, search, pagination, sort)' })
  @Get()
  findAll(
    @CurrentUser() user: { sub: string },
    @Query() query: QueryTasksDto,
  ) {
    return this.tasksService.findAll(user.sub, query);
  }

  @ApiOperation({ summary: 'Detail satu tugas' })
  @Get(':id')
  findOne(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tasksService.findOne(user.sub, id);
  }

  @ApiOperation({ summary: 'Ubah sebagian field tugas' })
  @Patch(':id')
  update(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(user.sub, id, dto);
  }

  @ApiOperation({ summary: 'Hapus tugas (hard delete)' })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tasksService.remove(user.sub, id);
  }
}