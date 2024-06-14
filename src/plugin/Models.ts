class AIModel {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  modelType: string;

  constructor({ baseUrl, apiKey, model, temperature, maxTokens }) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.model = model;
    this.temperature = temperature;
    this.maxTokens = maxTokens;
  }

  async getModelResponse(prompt: string, images: string[]) {
    const content = [
      {
        role: 'system',
        content: [
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
      {
        role: 'user',
        content: images.map((image) => ({
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${image}`,
          },
        })),
      },
    ];

    const payload = {
      model: this.model,
      messages: content,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
    };

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok || data.error) {
        console.error(`${this.modelType} Model error:`, data.error ? data.error : 'Unknown error');
        return { success: false, error: data.error ? data.error : 'Unknown error' };
      }

      console.log(`${this.modelType} Model response:`, data);
      return { success: true, data: data.choices[0].message.content };
    } catch (error) {
      console.error('Fetch error:', error);
      return { success: false, error: error.message };
    }
  }
}

function createModelInstance(config: any) {
  const baseUrl = config.OPENAI_API_BASE;
  const apiKey = config.OPENAI_API_KEY;
  const model = config.OPENAI_API_MODEL;
  const temperature = config.TEMPERATURE;
  const maxTokens = config.MAX_TOKENS;

  return new AIModel({ baseUrl, apiKey, model, temperature, maxTokens });
}
export { AIModel, createModelInstance };
