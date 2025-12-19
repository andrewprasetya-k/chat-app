import { plainToInstance, instanceToPlain, ClassConstructor } from 'class-transformer';

export class TransformUtil {
  static toEntity<T, V>(cls: ClassConstructor<T>, plain: V | V[]): T | T[] {
    return plainToInstance(cls, plain, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });
  }

  static toPlain<T>(instance: T | T[]): any {
    return instanceToPlain(instance, {
      excludeExtraneousValues: true,
    });
  }

  static transform<T, V>(cls: ClassConstructor<T>, plain: V | V[]): any {
    const entity = this.toEntity(cls, plain);
    return this.toPlain(entity);
  }
}
