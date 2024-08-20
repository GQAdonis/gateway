import {
  HookEventType,
  PluginContext,
  PluginHandler,
  PluginParameters,
} from '../types';
import { postPatronus } from './globals';

export const handler: PluginHandler = async (
  context: PluginContext,
  parameters: PluginParameters,
  eventType: HookEventType
) => {
  let error = null;
  let verdict = false;
  let data = null;

  const evaluator = 'custom';
  const profile = 'system:is-polite';

  if (eventType !== 'afterRequestHook') {
    return {
      error: {
        message: 'Patronus guardrails only support after_request_hooks.',
      },
      verdict: true,
      data,
    };
  }

  const evaluationBody: any = {
    input: context.request.text,
    output: context.response.text,
    timeout: 15000,
  };

  try {
    const result: any = await postPatronus(
      evaluator,
      parameters.credentials,
      evaluationBody,
      profile
    );

    const evalResult = result.results[0];
    error = evalResult.error_message;

    // verdict is true if evalResult.result.pass is 1
    verdict = evalResult.result.pass === 1;

    data = evalResult.result.additional_info;
  } catch (e: any) {
    delete e.stack;
    error = e;
  }

  return { error, verdict, data };
};
