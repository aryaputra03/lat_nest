import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './entities/task.entity';

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

  async findAll(userId: string): Promise<Task[]> {
    return this.tasksRepository.find({ where: { userId } });
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