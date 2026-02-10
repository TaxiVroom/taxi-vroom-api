# 📘 Guide Complet: Architecture Domain-Driven Hexagon

## 🎯 1. POINT D'ENTRÉE & DÉMARRAGE

### **main.ts** - Le bootstrap de l'application

```typescript
// src/main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);  // ← Crée l'app NestJS

  // Configure Swagger (docs API sur /docs)
  SwaggerModule.setup('docs', app, document);

  // Validation automatique des DTOs
  app.useGlobalPipes(new ValidationPipe({
    transform: true,   // Transforme les payloads en DTOs
    whitelist: true    // Supprime les propriétés non déclarées
  }));

  await app.listen(3000);  // ← Démarre sur port 3000
}
```

**Accès:**
- API REST: `http://localhost:3000/v1/users`
- GraphQL: `http://localhost:3000/graphql`
- Swagger: `http://localhost:3000/docs`

### **app.module.ts** - Le module racine

```typescript
@Module({
  imports: [
    EventEmitterModule.forRoot(),        // ← Domain Events
    RequestContextModule,                 // ← Context par requête
    SlonikModule.forRoot({ ... }),       // ← Connexion PostgreSQL
    CqrsModule,                          // ← Commands & Queries Bus
    GraphQLModule.forRoot({ ... }),      // ← API GraphQL

    UserModule,    // ← Module métier User
    WalletModule,  // ← Module métier Wallet
  ],
  providers: [
    ContextInterceptor,     // Gère le contexte de requête
    ExceptionInterceptor,   // Convertit domain exceptions → HTTP
  ],
})
```

**Ce qui se passe au démarrage:**
1. Connexion à PostgreSQL via Slonik
2. Enregistrement des Command/Query Handlers
3. Initialisation des Domain Event Handlers
4. Génération du schéma GraphQL automatique

---

## 🏗️ 2. ARCHITECTURE GLOBALE

### **Structure en Couches (Hexagonale)**

```
┌─────────────────────────────────────────────────────────┐
│              PRESENTATION LAYER                         │
│  (HTTP Controllers, GraphQL Resolvers, CLI, Messages)  │
│                         ↓↑                              │
│                    CommandBus / QueryBus                │
└─────────────────────────────────────────────────────────┘
                           ↓↑
┌─────────────────────────────────────────────────────────┐
│              APPLICATION LAYER                          │
│    (Command Handlers, Query Handlers, Services)        │
│              USE CASE ORCHESTRATION                     │
└─────────────────────────────────────────────────────────┘
                           ↓↑
┌─────────────────────────────────────────────────────────┐
│                DOMAIN LAYER                             │
│  (Entities, Value Objects, Domain Events, Business Rules) │
│              BUSINESS LOGIC PURE                        │
└─────────────────────────────────────────────────────────┘
                           ↓↑
┌─────────────────────────────────────────────────────────┐
│            INFRASTRUCTURE LAYER                         │
│    (Repositories, Database, External Services)          │
│              TECHNICAL DETAILS                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 3. ORGANISATION D'UN MODULE (Exemple: User)

```
src/modules/user/
│
├── commands/                    # 🔴 WRITE OPERATIONS (CQRS)
│   ├── create-user/
│   │   ├── create-user.http.controller.ts      # Controller REST
│   │   ├── create-user.graphql-resolver.ts     # Resolver GraphQL
│   │   ├── create-user.cli.controller.ts       # CLI interface
│   │   ├── create-user.message.controller.ts   # Message bus (RabbitMQ)
│   │   ├── create-user.command.ts              # Command object
│   │   ├── create-user.service.ts              # ⭐ Command Handler
│   │   └── create-user.request.dto.ts          # Input validation
│   │
│   └── delete-user/
│       ├── delete-user.http-controller.ts
│       └── delete-user.service.ts
│
├── queries/                     # 🔵 READ OPERATIONS (CQRS)
│   └── find-users/
│       ├── find-users.http.controller.ts
│       ├── find-users.graphql-resolver.ts
│       ├── find-users.query-handler.ts         # ⭐ Query Handler
│       └── find-users.request.dto.ts
│
├── domain/                      # 💎 BUSINESS LOGIC (DDD)
│   ├── user.entity.ts                          # ⭐⭐⭐ Aggregate Root
│   ├── user.types.ts                           # Types TypeScript
│   ├── user.errors.ts                          # Domain Exceptions
│   ├── events/
│   │   ├── user-created.domain-event.ts        # Domain Event
│   │   ├── user-deleted.domain-event.ts
│   │   ├── user-role-changed.domain-event.ts
│   │   └── user-address-updated.domain-event.ts
│   └── value-objects/
│       └── address.value-object.ts             # Value Object
│
├── database/                    # 🗄️ PERSISTENCE (Infrastructure)
│   ├── user.repository.port.ts                 # Interface (Port)
│   └── user.repository.ts                      # Implémentation (Adapter)
│
├── dtos/                        # 📤 DATA TRANSFER OBJECTS
│   ├── user.response.dto.ts                    # REST response
│   └── user.paginated.response.dto.ts
│
├── user.mapper.ts               # 🔄 Entity ↔ DTO ↔ DB
├── user.di-tokens.ts            # Tokens pour DI
└── user.module.ts               # Module NestJS
```

---

## 🔄 4. FLUX COMPLET: Créer un User (EXEMPLE CONCRET)

### **Étape par Étape:**

```
1. CLIENT FAIT UNE REQUÊTE
   POST /v1/users
   Body: { email: "john@example.com", country: "France", ... }
              ↓

2. CONTROLLER (Presentation Layer)
   CreateUserHttpController.create()
   - Reçoit le body → CreateUserRequestDto
   - Validation automatique (class-validator)
   - Crée CreateUserCommand
   - Envoie au CommandBus
              ↓

3. COMMAND BUS (NestJS CQRS)
   - Trouve le bon handler: CreateUserService
   - Execute le handler
              ↓

4. COMMAND HANDLER (Application Layer)
   CreateUserService.execute()
   - Crée l'entité: UserEntity.create({ ... })
   - Appelle repo.transaction(() => repo.insert(user))
   - Retourne Result<UserId, UserAlreadyExistsError>
              ↓

5. DOMAIN ENTITY (Domain Layer)
   UserEntity.create()
   - Génère UUID
   - Valide les business rules (Address, Email)
   - Ajoute UserCreatedDomainEvent
   - Retourne instance UserEntity
              ↓

6. REPOSITORY (Infrastructure Layer)
   UserRepository.insert(user)
   - Ouvre transaction SQL
   - Mappe Entity → SQL via Mapper
   - INSERT INTO users ...
   - Publie les Domain Events
   - Commit transaction
              ↓

7. DOMAIN EVENT HANDLER (Application Layer)
   CreateWalletWhenUserIsCreatedDomainEventHandler
   - Écoute UserCreatedDomainEvent
   - Crée automatiquement un Wallet pour ce user
              ↓

8. CONTROLLER RETOURNE RÉSULTAT
   match(result, {
     Ok: (id) => new IdResponse(id),      // 200 OK
     Err: (error) => throw ConflictException  // 409 Conflict
   })
```

---

## 💎 5. CONCEPTS CLÉS À MAÎTRISER

### **A. Aggregate Root (user.entity.ts)**

```typescript
export class UserEntity extends AggregateRoot<UserProps> {
  // ✅ Factory method - SEULE façon de créer un User
  static create(create: CreateUserProps): UserEntity {
    const id = randomUUID();
    const props = { ...create, role: UserRoles.guest };  // Business rule
    const user = new UserEntity({ id, props });

    // ⭐ DOMAIN EVENT - Notification de création
    user.addEvent(new UserCreatedDomainEvent({
      aggregateId: id,
      email: props.email
    }));

    return user;
  }

  // ✅ Méthodes métier - Encapsulent la logique
  makeAdmin(): void {
    this.changeRole(UserRoles.admin);  // Émet UserRoleChangedDomainEvent
  }

  updateAddress(props): void {
    const newAddress = new Address({ ...this.props.address, ...props });
    this.props.address = newAddress;
    this.addEvent(new UserAddressUpdatedDomainEvent({ ... }));
  }

  delete(): void {
    this.addEvent(new UserDeletedDomainEvent({ ... }));
  }
}
```

**Principes:**
- ✅ **Always valid**: Impossible de créer un User invalide
- ✅ **Business rules** dans l'entity, pas dans les services
- ✅ **Immutabilité**: Pas de setters publics, seulement méthodes métier
- ✅ **Domain Events**: Signalent les changements d'état

---

### **B. Value Objects (address.value-object.ts)**

```typescript
export class Address extends ValueObject<AddressProps> {
  get country(): string {
    return this.props.country;
  }

  protected validate(props: AddressProps): void {
    // Business rules validées à la création
    if (props.country.length < 2 || props.country.length > 50) {
      throw new ArgumentInvalidException('Country must be 2-50 chars');
    }
    // ... autres validations
  }
}

// Usage:
const address = new Address({ country: 'France', street: 'Rue de Paris', ... });
```

**Caractéristiques:**
- ✅ **Immutable**: Une fois créé, ne change jamais
- ✅ **Compared by value**: `address1.equals(address2)`
- ✅ **No identity**: Pas d'ID, identifié par ses valeurs
- ✅ **Always valid**: Validation dans le constructeur

---

### **C. Commands vs Queries (CQRS)**

#### **COMMAND** (modifie l'état)
```typescript
// Command object (simple DTO)
export class CreateUserCommand {
  constructor(props: CreateUserCommandProps) {
    this.email = props.email;
    this.country = props.country;
    // ...
  }
}

// Command Handler (orchestration)
@CommandHandler(CreateUserCommand)
export class CreateUserService {
  async execute(command: CreateUserCommand): Promise<Result<UserId, Error>> {
    const user = UserEntity.create({ ... });
    await this.userRepo.insert(user);  // Modifie l'état
    return Ok(user.id);
  }
}
```

#### **QUERY** (lit l'état)
```typescript
// Query Handler (lecture directe SQL)
@QueryHandler(FindUsersQuery)
export class FindUsersQueryHandler {
  async execute(query: FindUsersQuery): Promise<UserPaginatedResponseDto> {
    // ⚠️ BYPASS le domain layer pour performance
    const users = await this.userRepo.findUsers(query);
    return new UserPaginatedResponseDto({ data: users, ... });
  }
}
```

**Pourquoi CQRS?**
- ✅ **Séparation lecture/écriture** pour scaling indépendant
- ✅ **Queries optimisées** (projections SQL directes)
- ✅ **Commands protégés** (passent par business logic)

---

### **D. Domain Events**

```typescript
// 1. L'entity émet l'événement
user.addEvent(new UserCreatedDomainEvent({ aggregateId: user.id }));

// 2. Le repository publie les événements
await this.userRepo.transaction(async () => {
  await this.userRepo.insert(user);
  // ← À la fin de la transaction, tous les events sont publiés
});

// 3. Un handler réagit
@EventsHandler(UserCreatedDomainEvent)
export class CreateWalletWhenUserIsCreatedDomainEventHandler {
  async handle(event: UserCreatedDomainEvent) {
    // Crée automatiquement un wallet pour le user
    const wallet = WalletEntity.create({ userId: event.aggregateId });
    await this.walletRepo.insert(wallet);
  }
}
```

**Avantages:**
- ✅ **Découplage**: User module ne connaît pas Wallet module
- ✅ **Traçabilité**: Historique des événements business
- ✅ **Extensibilité**: Ajouter des handlers sans toucher au code existant

---

### **E. Repository Pattern (Ports & Adapters)**

```typescript
// PORT (Interface dans domain layer)
export interface UserRepositoryPort {
  insert(user: UserEntity): Promise<void>;
  findOneById(id: string): Promise<Option<UserEntity>>;
  delete(user: UserEntity): Promise<void>;
  transaction<T>(handler: () => Promise<T>): Promise<T>;
}

// ADAPTER (Implémentation dans infrastructure)
@Injectable()
export class UserRepository implements UserRepositoryPort {
  constructor(
    private readonly slonik: SlonikService,
    private readonly mapper: UserMapper,
  ) {}

  async insert(user: UserEntity): Promise<void> {
    const record = this.mapper.toPersistence(user);  // Entity → SQL
    await this.slonik.query(sql`INSERT INTO users ...`);
  }
}
```

**Principe Hexagonal:**
- ✅ **Domain dépend d'interfaces** (port), pas d'implémentations
- ✅ **Infrastructure implémente** les interfaces
- ✅ **Testable**: Mock le port, pas besoin de vraie DB

---

### **F. Result Type (Gestion Erreurs Explicite)**

```typescript
// ❌ AVANT (exceptions cachées)
async createUser(data): Promise<UserId> {
  // Peut throw n'importe quelle exception
  // Le caller ne sait pas quoi catcher
}

// ✅ APRÈS (erreurs explicites dans la signature)
async createUser(data): Promise<Result<UserId, UserAlreadyExistsError>> {
  try {
    // ...
    return Ok(userId);
  } catch {
    return Err(new UserAlreadyExistsError());
  }
}

// Le caller DOIT gérer les 2 cas
match(result, {
  Ok: (id) => console.log('Success:', id),
  Err: (error) => console.log('Failed:', error),
});
```

**Avantages:**
- ✅ **Type-safe errors**: TypeScript force à gérer les erreurs
- ✅ **Explicit flow**: Les erreurs font partie du contrat
- ✅ **No hidden exceptions**: Pas de surprise en runtime

---

## 🛠️ 6. LES FICHIERS INDISPENSABLES

### **user.module.ts** - Configuration du module

```typescript
@Module({
  imports: [CqrsModule],  // Pour CommandBus/QueryBus
  controllers: [
    CreateUserHttpController,        // REST endpoint
    CreateUserCliController,         // CLI command
    CreateUserGraphqlResolver,       // GraphQL mutation
  ],
  providers: [
    CreateUserService,               // Command handler
    DeleteUserService,
    FindUsersQueryHandler,           // Query handler
    {
      provide: USER_REPOSITORY,      // DI token
      useClass: UserRepository       // Implémentation
    },
    CreateWalletWhenUserIsCreatedDomainEventHandler,  // Event handler
  ],
})
```

### **user.di-tokens.ts** - Tokens d'injection

```typescript
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
```

### **user.mapper.ts** - Transformations

```typescript
export class UserMapper {
  // Entity → DTO (pour réponses API)
  toResponse(entity: UserEntity): UserResponseDto { ... }

  // Entity → DB Record (pour persistence)
  toPersistence(entity: UserEntity): UserDbModel { ... }

  // DB Record → Entity (pour lecture)
  toDomain(record: UserDbModel): UserEntity { ... }
}
```

---

## 🎓 7. CE QU'IL FAUT ABSOLUMENT RETENIR

### **Les 10 Règles d'Or:**

1. **Domain = Cœur du système**
   - Pas de dépendances vers NestJS, Slonik, etc.
   - Seulement business logic pure

2. **Entities = Always Valid**
   - Validation dans le constructeur
   - Factory methods statiques (`.create()`)
   - Pas de setters publics

3. **Commands changent l'état, Queries lisent**
   - Commands passent par le domain
   - Queries peuvent bypasser (performance)

4. **Domain Events = Communication asynchrone**
   - Émis par les entities
   - Publiés par les repositories
   - Handlers réagissent

5. **Repository = Interface (Port)**
   - Domain définit l'interface
   - Infrastructure implémente
   - Injection via DI tokens

6. **Result Type pour erreurs récupérables**
   - `Ok(value)` ou `Err(error)`
   - Type-safe error handling

7. **Mappers pour isolation**
   - Entity ↔ DTO ↔ DB Record
   - Pas de fuites entre couches

8. **Transactions pour cohérence**
   - Events publiés dans transaction
   - Rollback si erreur

9. **Multiple Controllers, même logique**
   - HTTP, GraphQL, CLI, Message
   - Tous appellent le même Command/Query

10. **Tests BDD avec Gherkin**
    - Feature files lisibles
    - Tests E2E complets

---

## 🚦 8. COMMENT AJOUTER UNE NOUVELLE FEATURE

### Exemple: Ajouter "UpdateUserEmail"

```bash
# 1. Créer le dossier
src/modules/user/commands/update-user-email/

# 2. Fichiers nécessaires:
update-user-email.command.ts           # Command object
update-user-email.service.ts           # Command handler
update-user-email.http.controller.ts   # HTTP endpoint
update-user-email.request.dto.ts       # Input DTO

# 3. Domain (si besoin)
src/modules/user/domain/events/user-email-updated.domain-event.ts

# 4. Ajouter méthode dans Entity
UserEntity.updateEmail(newEmail: string): void {
  // Validation
  // Update props
  // Add event
}

# 5. Enregistrer dans user.module.ts
providers: [
  UpdateUserEmailService,  // ← Handler
]
controllers: [
  UpdateUserEmailHttpController,  // ← Controller
]
```

---

## 📊 Résumé Final

**Points clés à retenir:**
- **Point d'entrée**: `main.ts` → `app.module.ts`
- **Architecture**: Hexagonale + DDD + CQRS + Events
- **Flux**: Controller → CommandBus → Handler → Entity → Repository → DB
- **Domain**: Logique business isolée et testable
- **Events**: Communication découplée entre modules

---

## 📚 Ressources Complémentaires

- [NestJS Documentation](https://docs.nestjs.com/)
- [Domain-Driven Design (Eric Evans)](https://www.domainlanguage.com/ddd/)
- [Implementing Domain-Driven Design (Vaughn Vernon)](https://vaughnvernon.com/)
- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html)
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
