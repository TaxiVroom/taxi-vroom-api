import { Option } from 'oxide.ts';

export interface DocumentTypeProps {
  id: string;
  name: string;
  backRequired: boolean;
  // Its date of end of validity is asked. Spec
  // docs/specs/documents-du-chauffeur.md.
  expires: boolean;
}

export interface DocumentTypeRepositoryPort {
  findOneById(id: string): Promise<Option<DocumentTypeProps>>;
  findAll(): Promise<DocumentTypeProps[]>;
}
