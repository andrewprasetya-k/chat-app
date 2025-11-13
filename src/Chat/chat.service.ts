import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatService {
    getAllMessages() {
        return [{ id: 1, text: 'Hello, world!' }];
    }

    sendMessage(text: string) {
        return { success: true, text };
    }
}
