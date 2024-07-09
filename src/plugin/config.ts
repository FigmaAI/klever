interface OpenAIConfig {
    model: string;
    openaiApiModel: string;
    maxTokens: number;
    temperature: number;
    requestInterval: number;
    docRefine: boolean;
    maxRounds: number;
    minDist: number;
    baseUrl: string;
    apiKey: string;
  }
  
  export let openAIConfig: OpenAIConfig = {
    model: 'OpenAI',
    openaiApiModel: 'gpt-4o',
    maxTokens: 300,
    temperature: 0.0,
    requestInterval: 10,
    docRefine: false,
    maxRounds: 20,
    minDist: 30,
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    apiKey: '',
  };
  
  export function updateOpenAIConfig(apiKey: string) {
    openAIConfig = {
      ...openAIConfig,
      apiKey,
    };
  }
  