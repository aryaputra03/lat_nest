import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskPriority, TaskStatus } from './entities/task.entity';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let service: TasksService;
  let repository: jest.Mocked<Repository<Task>>;

  const userId = 'user-1';
  const otherUserId = 'user-2';

  const mockTask = {
    id: 'task-1',
    title: 'Belajar NestJS',
    description: null,
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    dueDate: null,
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Task;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get(TasksService);
    repository = module.get(getRepositoryToken(Task));

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('membuat task baru dengan userId yang benar', async () => {
      repository.create.mockReturnValue(mockTask);
      repository.save.mockResolvedValue(mockTask);

      const result = await service.create(userId, {
        title: 'Belajar NestJS',
      });

      expect(repository.create).toHaveBeenCalledWith({
        title: 'Belajar NestJS',
        userId,
      });
      expect(result).toEqual(mockTask);
    });
  });

  describe('findAll', () => {
    it('menerapkan filter, search, sort, dan pagination via query builder', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTask], 1]);

      const result = await service.findAll(userId, {
        page: 1,
        limit: 10,
        status: TaskStatus.TODO,
        priority: undefined,
        search: 'nest',
        sortBy: 'createdAt',
        order: 'DESC',
      });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'task.userId = :userId',
        { userId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.status = :status',
        { status: TaskStatus.TODO },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.title ILIKE :search',
        { search: '%nest%' },
      );
      expect(result).toEqual({
        data: [mockTask],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });
    });
  });

  describe('findOne', () => {
    it('mengembalikan task jika milik user yang benar', async () => {
      repository.findOne.mockResolvedValue(mockTask);

      const result = await service.findOne(userId, mockTask.id);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: mockTask.id, userId },
      });
      expect(result).toEqual(mockTask);
    });

    it('melempar NotFoundException jika task milik user lain', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(otherUserId, mockTask.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('melempar NotFoundException jika update task milik user lain', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update(otherUserId, mockTask.id, { title: 'Hack' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('melempar NotFoundException jika hapus task milik user lain', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.remove(otherUserId, mockTask.id),
      ).rejects.toThrow(NotFoundException);
    });
  });
});