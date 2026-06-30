import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../config/env.validation';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import {
  ILlmProvider,
  ISttProvider,
  LLM_PROVIDER,
  STT_PROVIDER,
} from './providers/ai-provider.interface';
import { MockLlmProvider } from './providers/mock-llm.provider';
import { MockSttProvider } from './providers/mock-stt.provider';
import { OpenAiLlmProvider } from './providers/openai-llm.provider';
import { WhisperSttProvider } from './providers/whisper-stt.provider';

const llmProvider = {
  provide: LLM_PROVIDER,
  inject: [ConfigService],
  useFactory: (config: ConfigService<Env, true>): ILlmProvider =>
    config.get('AI_MOCK', { infer: true })
      ? new MockLlmProvider()
      : new OpenAiLlmProvider({
          baseUrl: config.get('AI_BASE_URL', { infer: true }),
          model: config.get('AI_MODEL', { infer: true }),
          apiKey: config.get('AI_API_KEY', { infer: true }),
        }),
};

const sttProvider = {
  provide: STT_PROVIDER,
  inject: [ConfigService],
  useFactory: (config: ConfigService<Env, true>): ISttProvider =>
    config.get('STT_MOCK', { infer: true })
      ? new MockSttProvider()
      : new WhisperSttProvider(config.get('STT_BASE_URL', { infer: true })),
};

@Module({
  controllers: [AiController],
  providers: [AiService, llmProvider, sttProvider],
  exports: [AiService],
})
export class AiModule {}
