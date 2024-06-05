import prompts from './prompts.json'


function createPromptForTask(taskDesc: string, personaDesc?: string): string {

    const template = prompts['self_explore_task_with_persona_template'];

    // 템플릿 내의 플레이스홀더를 실제 값으로 대체합니다.
    let prompt = template.replace('<task_description>', taskDesc);
    if (personaDesc !== undefined) {
      prompt = prompt.replace('<persona_description>', `As a person who is ${personaDesc}`);
    } else {
      prompt = prompt.replace('<persona_description>', '');
    }
  
    return prompt;
  }

  function createPromptForReflection(taskDesc: string, personaDesc?: string): string {
    const template = prompts['self_explore_reflect_with_persona_template'];
  
    let prompt = template.replace('<task_description>', taskDesc);
    if (personaDesc) {
      prompt = prompt.replace('<persona_description>', `As a person who is ${personaDesc}`);
    } else {
      prompt = prompt.replace('<persona_description>', '');
    }
  
    return prompt;
  }

  export { createPromptForTask, createPromptForReflection };