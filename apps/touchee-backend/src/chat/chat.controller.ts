import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '@app/auth';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { EditMessageDto } from './dto/edit-message.dto';

@UseGuards(JwtAuthGuard)
@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  findAll(@CurrentUser() user: { userId: string }) {
    return this.chatService.findAll(user.userId);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: { userId: string },
    @Param('id') chatId: string,
  ) {
    return this.chatService.findOne(user.userId, chatId);
  }

  @Get(':id/messages')
  getMessages(
    @CurrentUser() user: { userId: string },
    @Param('id') chatId: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.chatService.getMessages(user.userId, chatId, cursor);
  }

  // REST fallback for sending messages (WebSocket is preferred)
  @Post('messages')
  sendMessage(
    @CurrentUser() user: { userId: string },
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(user.userId, dto);
  }

  @Patch('messages/:id')
  editMessage(
    @CurrentUser() user: { userId: string },
    @Param('id') messageId: string,
    @Body() dto: EditMessageDto,
  ) {
    return this.chatService.editMessage(user.userId, messageId, dto);
  }

  @Delete('messages/:id')
  deleteMessage(
    @CurrentUser() user: { userId: string },
    @Param('id') messageId: string,
  ) {
    return this.chatService.deleteMessage(user.userId, messageId);
  }

  @Post('messages/:id/reactions')
  addReaction(
    @CurrentUser() user: { userId: string },
    @Param('id') messageId: string,
    @Body('reactionType') reactionType: string,
  ) {
    return this.chatService.addReaction(user.userId, messageId, reactionType);
  }

  @Delete('messages/:id/reactions')
  removeReaction(
    @CurrentUser() user: { userId: string },
    @Param('id') messageId: string,
  ) {
    return this.chatService.removeReaction(user.userId, messageId);
  }
}
