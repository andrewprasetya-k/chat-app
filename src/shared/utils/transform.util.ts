import {
  plainToInstance,
  instanceToPlain,
  ClassConstructor,
} from 'class-transformer';

export class TransformUtil {
  static toEntity<T, V>(cls: ClassConstructor<T>, plain: V | V[]): T | T[] {
    const result = plainToInstance(cls, plain, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });
    return result;
  }

  static toPlain<T>(instance: T | T[]): any {
    const result = instanceToPlain(instance, {
      excludeExtraneousValues: true,
    });
    return result;
  }

  static transform<T, V>(cls: ClassConstructor<T>, plain: V | V[]): any {
    const entity = this.toEntity(cls, plain);
    return this.toPlain(entity);
  }
}
