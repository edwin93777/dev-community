import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError, type Repository } from 'typeorm';
import { Post } from '../posts/entities/post.entity.js';
import { Reaction } from './entities/reaction.entity.js';
import { ReactionsService } from './reactions.service.js';

type Mock = ReturnType<typeof vi.fn>;

describe('ReactionsService', () => {
  let service: ReactionsService;
  let reactionsRepository: {
    create: Mock;
    save: Mock;
    findOneBy: Mock;
    delete: Mock;
    count: Mock;
  };
  let postsRepository: { findOneBy: Mock };

  beforeEach(() => {
    vi.clearAllMocks();
    reactionsRepository = {
      create: vi.fn((data: Partial<Reaction>) => ({ ...data })),
      save: vi.fn(async (reaction: Reaction) => reaction),
      findOneBy: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue({ affected: 1 }),
      count: vi.fn().mockResolvedValue(0),
    };
    postsRepository = {
      findOneBy: vi.fn().mockResolvedValue({ id: '10' }),
    };
    service = new ReactionsService(
      reactionsRepository as unknown as Repository<Reaction>,
      postsRepository as unknown as Repository<Post>,
    );
  });

  it('creates a reaction for the authenticated user only', async () => {
    await service.addLike('10', '25');

    expect(reactionsRepository.create).toHaveBeenCalledWith({
      publicacionId: '10',
      usuarioId: '25',
    });
    expect(reactionsRepository.save).toHaveBeenCalledTimes(1);
  });

  it('rejects a duplicate reaction', async () => {
    reactionsRepository.findOneBy.mockResolvedValue({ id: '1' });

    await expect(service.addLike('10', '25')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(reactionsRepository.save).not.toHaveBeenCalled();
  });

  it('returns conflict for a database duplicate only when this reaction exists', async () => {
    const duplicateError = new QueryFailedError('INSERT', [], {
      code: 'ER_DUP_ENTRY',
    });
    reactionsRepository.save.mockRejectedValue(duplicateError);
    reactionsRepository.findOneBy
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: '1' });

    await expect(service.addLike('10', '25')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('does not report another unique-constraint violation as a duplicate like', async () => {
    const duplicateError = new QueryFailedError('INSERT', [], {
      code: 'ER_DUP_ENTRY',
    });
    reactionsRepository.save.mockRejectedValue(duplicateError);

    await expect(service.addLike('10', '25')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
    expect(reactionsRepository.findOneBy).toHaveBeenCalledTimes(2);
  });

  it('removes only the authenticated user reaction', async () => {
    await service.removeLike('10', '25');

    expect(reactionsRepository.delete).toHaveBeenCalledWith({
      publicacionId: '10',
      usuarioId: '25',
    });
  });

  it('returns 404 when the user has no reaction to remove', async () => {
    reactionsRepository.delete.mockResolvedValue({ affected: 0 });

    await expect(service.removeLike('10', '25')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('counts directly and explicitly returns zero when there are no reactions', async () => {
    reactionsRepository.count.mockResolvedValue(0);

    await expect(service.countLikes('10')).resolves.toEqual({
      publicacionId: '10',
      totalLikes: 0,
    });
    expect(reactionsRepository.count).toHaveBeenCalledWith({
      where: { publicacionId: '10' },
    });
  });

  it('returns 404 when the publication does not exist', async () => {
    postsRepository.findOneBy.mockResolvedValue(null);

    await expect(service.countLikes('10')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(reactionsRepository.count).not.toHaveBeenCalled();
  });
});
