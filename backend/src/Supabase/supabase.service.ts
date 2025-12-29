import { Injectable, OnModuleInit } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private client: SupabaseClient;

  onModuleInit() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Supabase URL or Service Key not found in environment variables',
      );
    }

    this.client = createClient(supabaseUrl, supabaseKey);
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  async uploadFile(
    file: Express.Multer.File,
    bucketName: 'avatars' | 'chat-media',
    folderPath: string,
  ): Promise<string> {
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${folderPath}/${Date.now()}.${fileExt}`;

    // 1. Upload ke Supabase Storage
    const { data, error } = await this.client.storage
      .from(bucketName)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) throw new Error(error.message);

    // 2. Ambil Public URL
    const { data: publicUrlData } = this.client.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  }
}
