import { MISTRAL_AI } from '../../globals';
import {
    FimCompletionResponse,
    ErrorResponse,
    ProviderConfig,
    MistralFinishReason
  } from '../types';

  import {
    generateErrorResponse,
    generateInvalidProviderResponseError,
  } from '../utils';

  export const MistralAIFimCompleteConfig: ProviderConfig = {
    prompt: {
        param: 'prompt',
        required: true,
        default: '',
    },
    suffix: {
        param: 'suffix',
        required: false,
        default: '',
    },
    model: {
      param: 'model',
      required: true,
      default: 'codestral-latest',
    },
    temperature: {
      param: 'temperature',
      default: 0.7,
      min: 0,
      max: 1,
    },
    top_p: {
      param: 'top_p',
      default: 1,
      min: 0,
      max: 1,
    },
    max_tokens: {
      param: 'max_tokens',
      default: null,
      min: 1,
    },
    min_tokens: {
        param: 'max_tokens',
        default: null,
        min: 1,
      },
    stream: {
      param: 'stream',
      default: false,
    },
    seed: {
      param: 'random_seed',
      default: null,
    },
    stop: {
        param: 'stop',
        default: []
    }
};

interface MistralAIFimCompleteResponse extends FimCompletionResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
}

export interface MistralAIErrorResponse {
    object: string;
    message: string;
    type: string;
    param: string | null;
    code: string;
}


interface MistralAIStreamChunk {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: {
      delta: {
        role?: string | null;
        content?: string;
      };
      index: number;
      finish_reason: string | null;
    }[];
  }


  function transformMistralFinishReasonToOpenAIFinishReason(finish_reason: MistralFinishReason | string): string {
    switch (finish_reason) {
        case MistralFinishReason.STOP:
            return 'stop';
        case MistralFinishReason.LENGTH:
            return 'length';
        case MistralFinishReason.MODEL_LENGTH:
            return 'model_length';
        case MistralFinishReason.TOOL_CALLS:
            return 'tool_calls';
        default:
            return 'stop'; 
    }
}



export const MistralAIFimCompleteResponseTransform: (
    response: MistralAIFimCompleteResponse | MistralAIErrorResponse,
    responseStatus: number
  ) => FimCompletionResponse | ErrorResponse = (response, responseStatus) => {
    if ('message' in response && responseStatus !== 200) {
      return generateErrorResponse(
        {
          message: response.message,
          type: response.type,
          param: response.param,
          code: response.code,
        },
        MISTRAL_AI
      );
    }
  
    if ('choices' in response) {
      return {
        id: response.id,
        object: response.object,
        created: response.created,
        model: response.model,
        provider: MISTRAL_AI,
        choices: response.choices.map((c) => ({
          index: c.index,
          message: {
            role: c.message.role,
            content: c.message.content,
          },
          finish_reason: transformMistralFinishReasonToOpenAIFinishReason(c.finish_reason),
        })),
        usage: {
          prompt_tokens: response.usage?.prompt_tokens,
          completion_tokens: response.usage?.completion_tokens,
          total_tokens: response.usage?.total_tokens,
        },
      };
    }
  
    return generateInvalidProviderResponseError(response, MISTRAL_AI);
  };


export const MistralAIFimCompleteStreamChunkTransform: (
  response: string
) => string = (responseChunk) => {
  let chunk = responseChunk.trim();
  chunk = chunk.replace(/^data: /, '');
  chunk = chunk.trim();
  if (chunk === '[DONE]') {
    return `data: ${chunk}\n\n`;
}
const parsedChunk: MistralAIStreamChunk = JSON.parse(chunk);
  return (
    `data: ${JSON.stringify({
      id: parsedChunk.id,
      object: parsedChunk.object,
      created: parsedChunk.created,
      model: parsedChunk.model,
      provider: MISTRAL_AI,
      choices: [
        {
          index: parsedChunk.choices[0].index,
          delta: parsedChunk.choices[0].delta,
          finish_reason: parsedChunk.choices[0].finish_reason,
        },
      ],
    })}` + '\n\n'
  );
};

