import { ApiResponse, PaginatedResponse } from '../types/common.types';

export class ResponseUtil {
  static success<T>(data?: T, message?: string): ApiResponse<T> {
    return { success: true, data, message };
  }

  static error(message: string, error?: string): ApiResponse {
    return { success: false, message, error };
  }

  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
  ): PaginatedResponse<T> {
    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
