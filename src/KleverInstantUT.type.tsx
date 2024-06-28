// Defines the type for posting data
export interface PostData {
  nodeId: string;
  taskName: string;
  taskDesc: string;
  personaDesc?: string; // personaDesc is an optional attribute.
}

// Defines the type for UI elements
export interface UIElement {
  id: string;
  type: string;
  name: string;
  bbox: { x: number; y: number; width: number; height: number };
}

// Defines the configuration type passed to the AI model constructor
export interface AIModelConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  modelType: string;
  baseUrl?: string;
  apiKey?: string;
}

// Defines the response type from the AI model
export interface AIModelResponse {
  success: boolean;
  data?: any;
  error?: string;
}
