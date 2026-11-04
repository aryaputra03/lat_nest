import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTaskDto } from './dto/create-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './entities/task.entity';

export interface PaginatedTasks {
  data: Task[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
  ) {}

  async create(userId: string, dto: CreateTaskDto): Promise<Task> {
    const task = this.tasksRepository.create({
      ...dto,
      userId,
    });
    return this.tasksRepository.save(task);
  }

  async findAll(userId: string, query: QueryTasksDto): Promise<PaginatedTasks> {
    const { page, limit, status, priority, search, sortBy, order } = query;

    const qb = this.tasksRepository
      .createQueryBuilder('task')
      .where('task.userId = :userId', { userId });

    if (status) {
      qb.andWhere('task.status = :status', { status });
    }

    if (priority) {
      qb.andWhere('task.priority = :priority', { priority });
    }

    if (search) {
      qb.andWhere('task.title ILIKE :search', { search: `%${search}%` });
    }

    qb.orderBy(`task.${sortBy}`, order);
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: string, taskId: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id: taskId, userId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async update(
    userId: string,
    taskId: string,
    dto: UpdateTaskDto,
  ): Promise<Task> {
    const task = await this.findOne(userId, taskId);

    Object.assign(task, dto);
    return this.tasksRepository.save(task);
  }

  async remove(userId: string, taskId: string): Promise<void> {
    const task = await this.findOne(userId, taskId);
    await this.tasksRepository.remove(task);
  }
}
