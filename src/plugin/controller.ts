// postData 인터페이스 정의
interface PostData {
  nodeId: string;
  taskName: string;
  taskDesc: string;
  personaDesc?: string; // personaDesc는 선택적 속성입니다.
}

// UIElement 인터페이스 정의
interface UIElement {
  id: string;
  type: string;
  name: string;
  bbox: { x: number; y: number; width: number; height: number };
}

// Figma 플러그인의 나머지 부분
figma.showUI(__html__, { width: 360 + 64, height: 640 + 64 });

figma.on('selectionchange', async () => {
  const node = figma.currentPage.selection[0];

  if (node) {
    if ('layoutMode' in node && node.type === 'FRAME' && node.layoutMode !== 'HORIZONTAL') {
      const image = await node.exportAsync({ format: 'PNG' });

      // 현재 시간을 기준으로 task_name 생성
      const demoTimestamp = new Date();
      const taskName = `self_explore_${demoTimestamp.getFullYear()}-${demoTimestamp.getMonth() + 1
        }-${demoTimestamp.getDate()}_${demoTimestamp.getHours()}-${demoTimestamp.getMinutes()}-${demoTimestamp.getSeconds()}`;

      figma.ui.postMessage({
        type: 'nodeInfo',
        message: { name: node.name, id: node.id, imageData: image, taskName: taskName },
      });
    } else {
      const errorMessage = 'Please select a vertical frame to continue.';
      console.log(
        `Error: Selected node type: ${node.type}, layoutMode: ${'layoutMode' in node ? node.layoutMode : 'N/A'}`
      );
      figma.ui.postMessage({
        type: 'error',
        message: errorMessage,
      });
      figma.notify(errorMessage);
    }
  } else {
    figma.ui.postMessage({
      type: 'clear',
    });
  }
});

// UT 리포트 생성 함수
const generateReport = async (postData: PostData) => {
  // 폰트 로드
  await loadFonts();

  // "UT Reports" 프레임 검사 및 생성
  const utReportsFrame = getOrCreateUTReportsFrame();

  // Task 프레임 생성 및 추가
  const taskFrame = createTaskFrame(postData.taskName);
  utReportsFrame.appendChild(taskFrame);

  // 선택된 노드의 정보를 가져옵니다.
  const node = (await figma.getNodeByIdAsync(postData.nodeId)) as FrameNode;

  // Name 프레임 생성 및 추가
  const nameFrame = createNameFrame(node.name);
  taskFrame.appendChild(nameFrame);

  // Task Description 프레임 생성 및 추가
  const taskDescFrame = createTaskDescFrame(postData.taskDesc, postData.personaDesc);
  taskFrame.appendChild(taskDescFrame);

  // 라운드 카운트 설정
  const roundCount = 1; // 예시로 1을 사용, 실제 사용 시 적절한 라운드 카운트 값을 설정해야 합니다.

  // Anatomy 프레임 생성 및 추가
  const anatomyFrame = createAnatomyFrame();
  taskFrame.appendChild(anatomyFrame);

  // 프리뷰 프레임을 생성
  const previewFrame = createPreviewFrame();
  anatomyFrame.appendChild(previewFrame);

  // 선택된 노드의 이미지 해시를 추출합니다.
  const imageHash = await addNodeImageToPreviewFrame(node);

  // beforeImage 프레임에 이미지 노드를 추가합니다.
  const beforeImage = createImageFrameFromHash(imageHash, node.width, node.height, roundCount); // roundCount는 예시로 1을 사용
  previewFrame.appendChild(beforeImage);

  // elemList 생성
  const elemList = await createElemList(node);

  // 라벨링된 이미지 프레임 생성 및 관리
  const afterImage = await createLabeledImageFrame(elemList, imageHash, node.width, node.height, roundCount); // roundCount는 예시로 1을 사용
  previewFrame.appendChild(afterImage);

  // 뷰포트 포커스 조정
  figma.viewport.scrollAndZoomIntoView([utReportsFrame]);

  // afterImage 프레임의 이미지를 Base64 문자열로 변환
  const afterImageBase64 = await getFrameImageBase64(afterImage);

  // UI로 메시지 전송
  figma.ui.postMessage({
    type: 'callGPTModel',
    message: {
      imageBase64: afterImageBase64,
      taskFrameId: taskFrame.id
    }
  });

  // 뷰포트 포커스 조정
  // figma.viewport.scrollAndZoomIntoView([utReportsFrame]);
};

// 폰트 로드 함수
async function loadFonts() {
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
}

// "UT Reports" 프레임 검사 및 생성 함수
function getOrCreateUTReportsFrame() {
  let frame = figma.currentPage.findOne((n) => n.type === 'FRAME' && n.name === 'UT Reports') as FrameNode;
  if (!frame) {
    frame = createUTReportsFrame();
    figma.currentPage.appendChild(frame);
  }
  return frame;
}

// "UT Reports" 프레임 생성 함수
function createUTReportsFrame() {
  const frame = figma.createFrame();
  frame.name = 'UT Reports';
  frame.layoutMode = 'HORIZONTAL';
  frame.itemSpacing = 128;
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';
  frame.cornerRadius = 16;
  const maxX = figma.currentPage.children.reduce((max, node) => Math.max(max, node.x + node.width), 0);
  frame.x = maxX + 100;
  frame.y = 0;
  return frame;
}

// Task 프레임 생성 함수
function createTaskFrame(taskName: string) {
  const frame = figma.createFrame();
  frame.name = taskName;
  frame.layoutMode = 'VERTICAL';
  frame.itemSpacing = 64;
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';
  return frame;
}

// Name 프레임 생성 함수
function createNameFrame(nodeName: string) {
  const frame = figma.createFrame();
  frame.name = 'Name';
  frame.layoutMode = 'HORIZONTAL';
  frame.paddingTop = frame.paddingBottom = frame.paddingLeft = frame.paddingRight = 64;
  frame.cornerRadius = 16;
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';

  const text = figma.createText();
  text.characters = nodeName;
  text.fontSize = 64;
  text.fontName = { family: 'Inter', style: 'Bold' };
  text.textAutoResize = 'WIDTH_AND_HEIGHT';
  frame.appendChild(text);

  return frame;
}

// Task Description 프레임 생성 함수
function createTaskDescFrame(taskDesc: string, personaDesc?: string) {
  const frame = figma.createFrame();
  frame.name = 'task_desc';
  frame.layoutMode = 'VERTICAL';
  frame.paddingTop = frame.paddingBottom = frame.paddingLeft = frame.paddingRight = 64;
  frame.itemSpacing = 48;
  frame.cornerRadius = 16;
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';

  const titleText = createText('Task Description', 48, 'Bold');
  frame.appendChild(titleText);

  const descText = createText(taskDesc, 24, 'Regular');
  frame.appendChild(descText);

  if (personaDesc) {
    const personaText = createText(`As a person who is ${personaDesc}`, 24, 'Regular');
    frame.appendChild(personaText);
  }

  return frame;
}

// 텍스트 노드 생성 함수
function createText(characters: string, fontSize: number, fontStyle: 'Regular' | 'Bold'): TextNode {
  const text = figma.createText();
  text.characters = characters;
  text.fontSize = fontSize;
  text.fontName = { family: 'Inter', style: fontStyle };
  text.textAutoResize = 'WIDTH_AND_HEIGHT';
  return text;
}

// Anatomy 프레임 생성 함수
function createAnatomyFrame(): FrameNode {
  const frame = figma.createFrame();
  frame.name = 'anatomy';
  frame.layoutMode = 'VERTICAL';
  frame.paddingTop = frame.paddingBottom = frame.paddingLeft = frame.paddingRight = 64;
  frame.itemSpacing = 32; // 상호 간격 설정
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';

  const titleText = createText('Task Description', 48, 'Bold');
  frame.appendChild(titleText);

  return frame;
}

// Preview 프레임 생성 함수
function createPreviewFrame(): FrameNode {
  const frame = figma.createFrame();
  frame.name = 'preview';
  frame.layoutMode = 'HORIZONTAL';
  frame.paddingTop = frame.paddingBottom = frame.paddingLeft = frame.paddingRight = 64;
  frame.itemSpacing = 64; // 상호 간격 설정
  frame.fills = [{ type: 'SOLID', color: { r: 0.8667, g: 0.8667, b: 0.8667 } }]; // 배경색 #ddd 설정
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';
  return frame;
}

// Preview 프레임에 노드 이미지 추가하는 함수를 이미지 해시를 반환하는 함수로 변경
async function addNodeImageToPreviewFrame(node: FrameNode): Promise<string> {
  const imageBytes = await node.exportAsync({ format: 'PNG' });
  const imageHash = figma.createImage(imageBytes).hash;
  return imageHash;
}

async function createElemList(
  node: SceneNode,
  elemList: UIElement[] = [],
  root: SceneNode = node
): Promise<UIElement[]> {
  // 노드가 숨겨진 상태이면 처리를 건너뜁니다.
  if (!node.visible) {
    return elemList;
  }

  // 'FRAME', 'INSTANCE', 'COMPONENT' 타입의 노드를 처리합니다.
  if (['FRAME', 'INSTANCE', 'COMPONENT', 'GROUP'].includes(node.type)) {
    const { x, y, width, height } = node.absoluteBoundingBox;
    elemList.push({
      id: node.id,
      type: node.type,
      name: node.name,
      bbox: {
        x: x - root.absoluteBoundingBox.x,
        y: y - root.absoluteBoundingBox.y,
        width,
        height,
      },
    });

    // 'COMPONENT'와 'INSTANCE' 타입의 노드는 자식 노드를 탐색하지 않습니다.
    if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      return elemList;
    }
  }

  // 'GROUP' 타입의 노드 또는 'FRAME' 타입의 노드의 자식을 탐색합니다.
  if ('children' in node) {
    for (const child of node.children) {
      await createElemList(child, elemList, root);
    }
  }

  return elemList;
}

// 이미지 해시와 원본 이미지의 크기를 사용하여 이미지 프레임을 생성하는 함수
function createImageFrameFromHash(imageHash: string, width: number, height: number, roundCount: number): FrameNode {
  const imageFrame = figma.createFrame();
  imageFrame.name = `${roundCount}_before_labeled`;

  const imageNode = figma.createRectangle();
  imageNode.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash }];
  imageNode.resize(width, height); // 원본 이미지의 크기로 이미지 노드의 크기를 조정합니다.

  imageFrame.appendChild(imageNode);
  imageFrame.resize(width, height); // 이미지 노드와 동일한 크기로 프레임의 크기를 조정합니다.

  return imageFrame;
}

async function createLabeledImageFrame(
  elemList: UIElement[],
  imageHash: string,
  width: number,
  height: number,
  roundCount: number
) {
  // 라벨링된 이미지를 담을 새로운 프레임 생성
  const imageNode = figma.createRectangle();
  imageNode.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash }];
  imageNode.resize(width, height);
  const labeledFrame = figma.createFrame();
  labeledFrame.name = `${roundCount}_after_labeled`;
  labeledFrame.resize(width, height);
  labeledFrame.appendChild(imageNode); // 이미지 노드 추가

  elemList.forEach((elem, index) => {
    // 각 UI 요소를 나타내는 프레임 생성
    const elemFrame = figma.createFrame();
    elemFrame.name = elem.name;
    elemFrame.layoutMode = 'HORIZONTAL';
    elemFrame.paddingTop = elemFrame.paddingBottom = elemFrame.paddingLeft = elemFrame.paddingRight = 4; // 패딩 설정
    elemFrame.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 }, opacity: 0.5 }]; // 반투명의 짙은 회색 배경
    // sizing은 AUTO로 설정하여 프레임 크기가 자동으로 조정되도록 합니다.
    elemFrame.primaryAxisSizingMode = 'AUTO';
    elemFrame.counterAxisSizingMode = 'AUTO';
    // bbox의 정 가운데에 위치하도록 x, y 값을 조정
    elemFrame.x = elem.bbox.x;
    elemFrame.y = elem.bbox.y;

    // 번호를 표시하는 텍스트 생성 및 프레임에 추가
    const textNode = figma.createText();
    textNode.characters = (index + 1).toString();
    textNode.fontSize = 12;
    textNode.fontName = { family: 'Inter', style: 'Regular' };
    textNode.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]; // 텍스트 색상 설정

    elemFrame.appendChild(textNode);

    // 라벨링된 이미지 프레임에 UI 요소 프레임 추가
    labeledFrame.appendChild(elemFrame);
  });

  // Labeled Frame을 반환합니다.
  return labeledFrame;
}

// 이미지를 Base64 문자열로 변환하는 함수
async function getFrameImageBase64(node: SceneNode): Promise<string> {
  const imageBytes = await node.exportAsync({ format: 'JPG' });
  const base64Encode = figma.base64Encode(imageBytes);
  return base64Encode;
}


figma.ui.onmessage = (msg) => {
  if (msg.type === 'submit') {
    // 수신된 메시지를 콘솔에 로그합니다.
    const postData: PostData = msg.data;
    console.log('Received from UI:', postData);

    // UT 리포트 생성 함수 호출
    generateReport(postData).catch(console.error);
  }
};
