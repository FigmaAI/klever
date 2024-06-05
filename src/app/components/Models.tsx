// TypeScript 타입 정의를 위한 인터페이스
interface IModel {
    base_url: string;
    api_key: string;
    model: string;
    temperature: GLfloat;
    max_tokens: number;
}

class OpenAIModel {
    base_url: string;
    api_key: string;
    model: string;
    temperature: number; 
    max_tokens: number;

    constructor({ base_url, api_key, model, temperature, max_tokens }: IModel) {
        this.base_url = base_url;
        this.api_key = api_key;
        this.model = model;
        this.temperature = temperature;
        this.max_tokens = max_tokens;
    }

    // async function 키워드를 제거하고 메서드 정의
    async get_model_response(prompt: string, images: string[]) {
        // 프롬프트와 이미지를 포함한 요청 내용 구성
        const content = [
            {
                role: 'system',
                content: [{
                    type: 'text',
                    text: prompt
                }],

            },
            ...images.map((image) => ({
                role: 'user',
                content: [{
                    type: 'image_url',
                    image_url: {
                        url: `data:image/jpeg;base64,${image}`,
                    },
                }],
            })),
        ];

        // 요청 페이로드
        const payload = {
            model: this.model,
            messages: content,
            temperature: this.temperature,
            max_tokens: this.max_tokens,
        };

        // GPT 모델 API 호출
        try {
            const response = await fetch(this.base_url, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'content-type': 'application/json',
                    Authorization: `Bearer ${this.api_key}`,
                },
                body: JSON.stringify(payload),
            });
            const data = await response.json();

            // 응답에서 오류 확인
            if (!response.ok || data.error) {
                console.error('GPT Model error:', data.error ? data.error : 'Unknown error');
                return { success: false, error: data.error ? data.error : 'Unknown error' };
            }

            // 성공적인 응답 처리
            console.log('GPT Model response:', data);
            return { success: true, data: data.choices[0].message.content };
        } catch (error) {
            // 네트워크 오류 또는 기타 예외 처리
            console.error('Fetch error:', error);
            return { success: false, error: error.message };
        }
    }
}

class AzureModel {
    base_url: string;
    api_key: string;
    model: string;
    temperature: number; // GLfloat 대신 number 타입 사용
    max_tokens: number;

    constructor({ base_url, api_key, model, temperature, max_tokens }) {
        this.base_url = base_url;
        this.api_key = api_key;
        this.model = model;
        this.temperature = temperature;
        this.max_tokens = max_tokens;
    }

    async get_model_response(prompt: string, images: string[]) {
        // 프롬프트와 이미지를 포함한 요청 내용 구성
        const content = [
            {
                role: 'system',
                content: [{
                    type: 'text',
                    text: prompt
                }],

            },
            ...images.map((image) => ({
                role: 'user',
                content: [{
                    type: 'image_url',
                    image_url: {
                        url: `data:image/jpeg;base64,${image}`,
                    },
                }],
            })),
        ];

        console.log(content);

        // 요청 페이로드
        const payload = {
            model: this.model,
            messages: content,
            temperature: this.temperature,
            max_tokens: this.max_tokens,
        };

        // GPT 모델 API 호출
        try {
            const response = await fetch(this.base_url, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'content-type': 'application/json',
                    'api-key': this.api_key, // AzureModel에서는 'api-key' 헤더를 사용
                },
                body: JSON.stringify(payload),
            });
            const data = await response.json();

            // 응답에서 오류 확인
            if (!response.ok || data.error) {
                console.error('Azure Model error:', data.error ? data.error : 'Unknown error');
                return { success: false, error: data.error ? data.error : 'Unknown error' };
            }

            // 성공적인 응답 처리
            console.log('Azure Model response:', data);
            return { success: true, data: data.choices[0].message.content };
        } catch (error) {
            // 네트워크 오류 또는 기타 예외 처리
            console.error('Fetch error:', error);
            return { success: false, error: error.message };
        }
    }
}

// config 객체를 파싱하여 필요한 정보를 추출하는 함수
function parseConfigForModel(config: any): IModel {
    const base_url = config.OPENAI_API_BASE
    const api_key = config.OPENAI_API_KEY
    const model = config.OPENAI_API_MODEL
    const temperature = config.TEMPERATURE;
    const max_tokens = config.MAX_TOKENS;

    return { base_url, api_key, model, temperature, max_tokens };
}

// 모델 인스턴스 생성을 위한 함수
function createModelInstance(config: any) {
    const parsedConfig = parseConfigForModel(config);
    if (config.MODEL === 'OpenAI') {
        return new OpenAIModel(parsedConfig);
    } else if (config.MODEL === "Azure") {
        return new AzureModel(parsedConfig);
    } else {
        throw new Error(`ERROR: Unsupported model type ${config.MODEL}!`);
    }
}


export { OpenAIModel, AzureModel, createModelInstance };