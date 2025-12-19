import { plainToInstance, instanceToPlain, ClassConstructor } from 'class-transformer';

export class TransformUtil {
  static toEntity<T, V>(cls: ClassConstructor<T>, plain: V | V[]): T | T[] {
    console.log('Input to toEntity:', plain);
    const result = plainToInstance(cls, plain, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });
    console.log('Result from toEntity:', result);
    return result;
  }

  static toPlain<T>(instance: T | T[]): any {
    console.log('Input to toPlain:', instance);
    const result = instanceToPlain(instance, {
      excludeExtraneousValues: true,
    });
    console.log('Result from toPlain:', result);
    return result;
  }

  static transform<T, V>(cls: ClassConstructor<T>, plain: V | V[]): any {
    const entity = this.toEntity(cls, plain);
    return this.toPlain(entity);
  }
}
