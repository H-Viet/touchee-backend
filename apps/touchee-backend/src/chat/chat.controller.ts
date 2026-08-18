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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard } from '@app/auth';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { EditMessageDto } from './dto/edit-message.dto';

@ApiTags('Chat')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @ApiOperation({ summary: 'List all your chats with last message preview' })
  @ApiResponse({ status: 200, description: 'Returns array of chats' })
  @Get()
  findAll(@CurrentUser() user: { userId: string }) {
    return this.chatService.findAll(user.userId);
  }

  @ApiOperation({ summary: 'Get a chat with its 30 most recent messages' })
  @ApiResponse({
    status: 200,
    description: 'Returns chat with members and recent messages',
  })
  @ApiResponse({ status: 403, description: 'Not a member of this chat' })
  @Get(':id')
  findOne(
    @CurrentUser() user: { userId: string },
    @Param('id') chatId: string,
  ) {
    return this.chatService.findOne(user.userId, chatId);
  }

  @ApiOperation({ summary: 'Get paginated message history for a chat' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Cursor for pagination (last message id)',
  })
  @ApiResponse({ status: 200, description: 'Returns messages newest first' })
  @Get(':id/messages')
  getMessages(
    @CurrentUser() user: { userId: string },
    @Param('id') chatId: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.chatService.getMessages(user.userId, chatId, cursor);
  }

  // REST fallback for sending messages (WebSocket is preferred)
  @ApiOperation({
    summary:
      'Send a message via REST (WebSocket sendMessage event is preferred for real-time)',
  })
  @ApiResponse({ status: 201, description: 'Message sent' })
  @ApiResponse({ status: 403, description: 'Not a member of this chat' })
  @Post('messages')
  sendMessage(
    @CurrentUser() user: { userId: string },
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(user.userId, dto);
  }

  @ApiOperation({
    summary:
      'Edit your own message — original content saved to message history',
  })
  @ApiResponse({
    status: 200,
    description: 'Message edited, status set to "edited"',
  })
  @ApiResponse({ status: 403, description: 'Can only edit your own messages' })
  @Patch('messages/:id')
  editMessage(
    @CurrentUser() user: { userId: string },
    @Param('id') messageId: string,
    @Body() dto: EditMessageDto,
  ) {
    return this.chatService.editMessage(user.userId, messageId, dto);
  }

  @ApiOperation({
    summary:
      'Soft delete your own message — content replaced with "This message was deleted"',
  })
  @ApiResponse({ status: 200, description: 'Message soft deleted' })
  @ApiResponse({
    status: 403,
    description: 'Can only delete your own messages',
  })
  @Delete('messages/:id')
  deleteMessage(
    @CurrentUser() user: { userId: string },
    @Param('id') messageId: string,
  ) {
    return this.chatService.deleteMessage(user.userId, messageId);
  }

  @ApiOperation({
    summary:
      'Add a reaction to a message — replaces existing reaction if present',
  })
  @ApiResponse({ status: 201, description: 'Reaction added' })
  @Post('messages/:id/reactions')
  addReaction(
    @CurrentUser() user: { userId: string },
    @Param('id') messageId: string,
    @Body('reactionType') reactionType: string,
  ) {
    return this.chatService.addReaction(user.userId, messageId, reactionType);
  }

  @ApiOperation({ summary: 'Remove your reaction from a message' })
  @ApiResponse({ status: 200, description: 'Reaction removed' })
  @Delete('messages/:id/reactions')
  removeReaction(
    @CurrentUser() user: { userId: string },
    @Param('id') messageId: string,
  ) {
    return this.chatService.removeReaction(user.userId, messageId);
  }
}
