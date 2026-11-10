import { Injectable } from '@nestjs/common';
import { None, Option, Some } from 'oxide.ts';
import { PrismaService } from '@libs/db/prisma.service';
import {
  DocumentTypeProps,
  DocumentTypeRepositoryPort,
} from './document-type.repository.port';

@Injectable()
export class DocumentTypeRepository implements DocumentTypeRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findOneById(id: string): Promise<Option<DocumentTypeProps>> {
    const record = await this.prisma.documentType.findUnique({
      where: { id },
      select: { id: true, name: true, backRequired: true, expires: true },
    });
    return record ? Some(record) : None;
  }

  async findAll(): Promise<DocumentTypeProps[]> {
    return this.prisma.documentType.findMany({
      select: { id: true, name: true, backRequired: true, expires: true },
    });
  }
}
