import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

jest.mock('argon2');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;

  const mockUser = {
    id: 'user-id-1',
    email: 'test@mail.com',
    password: 'hashed-password',
    refreshTokenHash: 'hashed-refresh-token',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            updateRefreshTokenHash: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('signed-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('config-value'),
            getOrThrow: jest.fn().mockReturnValue('config-value'),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    usersService = module.get(UsersService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('berhasil register user baru', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      (argon2.hash as jest.Mock).mockResolvedValue('hashed-password');
      usersService.create.mockResolvedValue(mockUser as any);

      const result = await service.register({
        email: 'Test@Mail.com',
        password: 'password123',
      });

      expect(usersService.findByEmail).toHaveBeenCalledWith('test@mail.com');
      expect(usersService.create).toHaveBeenCalledWith(
        'test@mail.com',
        'hashed-password',
      );
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        createdAt: mockUser.createdAt,
      });
      expect(result).not.toHaveProperty('password');
    });

    it('melempar ConflictException jika email sudah terdaftar', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);

      await expect(
        service.register({
          email: 'test@mail.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('berhasil login dan menyimpan refresh token hash', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      (argon2.hash as jest.Mock).mockResolvedValue('new-hashed-refresh-token');

      const result = await service.login({
        email: 'test@mail.com',
        password: 'password123',
      });

      expect(argon2.verify).toHaveBeenCalledWith(
        mockUser.password,
        'password123',
      );
      expect(usersService.updateRefreshTokenHash).toHaveBeenCalledWith(
        mockUser.id,
        'new-hashed-refresh-token',
      );
      expect(result).toEqual({
        accessToken: 'signed-token',
        refreshToken: 'signed-token',
      });
    });

    it('melempar UnauthorizedException jika email tidak ditemukan', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'notfound@mail.com',
          password: 'password123',
        }),
      ).rejects.toThrow(new UnauthorizedException('Email atau password salah'));
    });

    it('melempar UnauthorizedException dengan pesan SAMA jika password salah', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@mail.com', password: 'salah' }),
      ).rejects.toThrow(new UnauthorizedException('Email atau password salah'));
    });
  });

  describe('refresh', () => {
    it('berhasil refresh dan merotasi token', async () => {
      usersService.findById.mockResolvedValue(mockUser as any);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      (argon2.hash as jest.Mock).mockResolvedValue('rotated-hash');

      const result = await service.refresh(mockUser.id, 'raw-refresh-token');

      expect(argon2.verify).toHaveBeenCalledWith(
        mockUser.refreshTokenHash,
        'raw-refresh-token',
      );
      expect(usersService.updateRefreshTokenHash).toHaveBeenCalledWith(
        mockUser.id,
        'rotated-hash',
      );
      expect(result).toEqual({
        accessToken: 'signed-token',
        refreshToken: 'signed-token',
      });
    });

    it('mengosongkan hash dan melempar 401 jika hash tidak cocok (reuse)', async () => {
      usersService.findById.mockResolvedValue(mockUser as any);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(
        service.refresh(mockUser.id, 'token-lama-dipakai-ulang'),
      ).rejects.toThrow(UnauthorizedException);

      expect(usersService.updateRefreshTokenHash).toHaveBeenCalledWith(
        mockUser.id,
        null,
      );
    });

    it('melempar 401 jika refreshTokenHash user null', async () => {
      usersService.findById.mockResolvedValue({
        ...mockUser,
        refreshTokenHash: null,
      } as any);

      await expect(service.refresh(mockUser.id, 'token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('mengosongkan refreshTokenHash', async () => {
      const result = await service.logout(mockUser.id);

      expect(usersService.updateRefreshTokenHash).toHaveBeenCalledWith(
        mockUser.id,
        null,
      );
      expect(result).toEqual({ message: 'Logout berhasil' });
    });
  });
});
