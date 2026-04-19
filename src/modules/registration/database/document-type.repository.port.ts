import { Option } from 'oxide.ts';

export interface DocumentTypeProps {
  id: string;
  name: string;
  backRequired: boolean;
}

export interface DocumentTypeRepositoryPort {
  findOneById(id: string): Promise<Option<DocumentTypeProps>>;
  findAll(): Promise<DocumentTypeProps[]>;
}
