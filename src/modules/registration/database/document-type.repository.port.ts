import { Option } from 'oxide.ts';

export interface DocumentTypeProps {
  name: string;
  backRequired: boolean;
}

export interface DocumentTypeRepositoryPort {
  findOneById(id: string): Promise<Option<DocumentTypeProps>>;
}
