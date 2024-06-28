import * as React from 'react';
import {
  Box,
  Button,
  Textarea,
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  Stack,
  ModalClose,
  DialogActions,
} from '@mui/joy';
import { AutoAwesome, FaceRetouchingNatural } from '@mui/icons-material';


const App = () => {
  const [taskNode, setTaskNode] = React.useState<string>('');
  const [nodeName, setNodeName] = React.useState<string>('');
  const [taskDesc, setTaskDesc] = React.useState<string>('');
  const [personaDesc, setPersonaDesc] = React.useState<string>('');
  const [reportNode, setReportNode] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState<boolean>(false);
  const [userStatus, setUserStatus] = React.useState('');
  const [trialDays, setTrialDays] = React.useState<string>('0');

  const handleSubmit = (e) => {
    e.preventDefault();

    // create a task name with the current timestamp
    const demoTimestamp = new Date();

    const taskName: string = `self_explore_${demoTimestamp.getFullYear()}-${demoTimestamp.getMonth() + 1
      }-${demoTimestamp.getDate()}_${demoTimestamp.getHours()}-${demoTimestamp.getMinutes()}-${demoTimestamp.getSeconds()}`;

    // personaDesc가 기본값일 경우 제외
    const postData = {
      nodeId: taskNode,
      taskName: taskName,
      taskDesc: taskDesc,
      personaDesc: personaDesc ? personaDesc : undefined,
    };

    // Figma plugin으로 postData 전송 로직...
    parent.postMessage({ pluginMessage: { type: 'submit', data: postData } }, '*');
  };

  const handleKeyDown = async (e) => {
    // Mac에서는 e.metaKey가 true이고, Windows/Linux에서는 e.ctrlKey가 true입니다.
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  // submit button activation condition: taskDesc is not empty + nodeId is not empty

  const isEligible = taskDesc && taskNode && (userStatus === 'PAID' || userStatus === 'IN_TRIAL');

  // 버튼을 클릭했을 때, 만약 node ID가 있다면 controller로 해당 nodeID와 함께 moveFocus 타입 메시지를 보내고, 없다면 console에 에러 메시지를 출력합니다.
  const handleNodeClick = (nodeId: string) => {
    parent.postMessage({ pluginMessage: { type: 'moveFocus', data: nodeId } }, '*');
  };

  // 버튼을 클릭했을 때, controller로 payment 타입 메시지를 보내고, loading을 true로 변경합니다.
  const handlePaymentClick = async () => {
    // payment API가 아직 리뷰 중이라는 메시지를 Parent에 전달합니다.
    parent.postMessage({ pluginMessage: { type: 'payment' } }, '*');
    // setLoading(true);
  };

  // 트라이얼 데이를 계산하는 로직 
  const calculateTrialDays = (trialDays: number): string => {
    
    const days = Math.ceil(trialDays);

    // 만약 days가 1이면, 몇 시간이 남았는지를 계산해서 '00 hours left' 반환합니다. 2 이상 이면, '0 days left'를 반환합니다.
    if (days === 1) {
      const currentTime = new Date();
      const endTrialTime = new Date(currentTime.getTime() + trialDays * 24 * 60 * 60 * 1000);
      const hoursLeft = Math.ceil((endTrialTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60));
      return hoursLeft + ' hours left';
    } else {
      return days + ' days left';
    }
  };

  React.useEffect(() => {
    window.onmessage = (event) => {
      const { type, message } = event.data.pluginMessage;
      if (type === 'nodeInfo') {
        console.log(message);

        setTaskNode(message.id);
        setNodeName(message.name);
      }
      if (type === 'clear') {
        setTaskNode('');
        setNodeName('');
        setReportNode('');
      }
      if (type === 'loading') {
        setLoading(message);
      }
      if (type === 'reportNode') {
        setReportNode(message);
      }
      if (type === 'userStatus') {
        switch (message.status) {
          case 'PAID':
            // 결제 완료 상태 UI 처리
            setUserStatus(message.status);

            break;
          case 'TRIAL_ENDED':
            // 트라이얼 기간 종료 및 결제 유도 UI 처리
            setUserStatus(message.status);
            setTrialDays('0');
            break;
          case 'IN_TRIAL':
            // 트라이얼 기간 중 UI 처리
            setUserStatus(message.status);
            // 트라이얼 남은 일수는 올림 처리 (예 : 1.1일 -> 2일)
            const trialDays = calculateTrialDays(message.trialDays);
            setTrialDays(trialDays);

            break;
        }
      }
    };
  }, []);

  return (
    <>
      <Textarea
        placeholder={
          taskNode
            ? `Please enter the description of the task you want me on \"${nodeName}\" to complete in a few sentences.\nOnce done, click 'Submit' or press 'Cmd/Ctrl + Enter'`
            : 'Select a frame or component to start testing'
        }
        disabled={!taskNode}
        value={taskDesc}
        onChange={(event) => setTaskDesc(event.target.value)}
        onKeyDown={handleKeyDown}
        minRows={2}
        maxRows={6}
        size="md"
        startDecorator={
          <Box sx={{ display: 'flex', gap: 0.5, flex: 1 }}>
            <Button variant="outlined" color="neutral" onClick={() => handleNodeClick(taskNode)} size="sm">
              {/* if taskNode is empty, Button label is "🎨 No frame". If set, use nodeName text and truncate the text */}
              {taskNode ? (nodeName.length > 12 ? `${nodeName.slice(0, 12)}...` : nodeName) : '🎨 No frame'}
            </Button>
            <Button
              variant="outlined"
              color="neutral"
              onClick={() => handleNodeClick(reportNode)}
              size="sm"
              disabled={!reportNode}
            >
              📝 Report
            </Button>
            <Button variant="outlined" color="neutral" sx={{ ml: 'auto' }} onClick={handlePaymentClick}>
              {userStatus === 'PAID' && `💳 Paid`}
              {userStatus === 'IN_TRIAL' && `⏳ ${trialDays}`}
              {userStatus === 'TRIAL_ENDED' && `🔒 Trial Ended`}
            </Button>
          </Box>
        }
        endDecorator={
          <Box
            sx={{
              display: 'flex',
              gap: 'var(--Textarea-paddingBlock)',
              pt: 'var(--Textarea-paddingBlock)',
              borderTop: '1px solid',
              borderColor: 'divider',
              flex: 'auto',
            }}
          >
            <Button
              variant="plain"
              color="neutral"
              onClick={() => setModalOpen(true)}
              disabled={isEligible ? false : true}
              startDecorator={<FaceRetouchingNatural fontSize="small" />}
            >
              {/* if persona is empty, Button label is "Persona". If set use persona text and truncate the text */}
              {personaDesc ? (personaDesc.length > 12 ? `${personaDesc.slice(0, 12)}...` : personaDesc) : 'Persona'}
            </Button>

            <Button
              // if loading is true, button is disabled, if is not eligible, button is disabled as well
              loading={loading}
              disabled={isEligible ? false : true}
              loadingIndicator="Loading…"
              color="primary"
              sx={{ ml: 'auto' }}
              size="sm"
              onClick={handleSubmit}
              startDecorator={<AutoAwesome fontSize="small" />}
            >
              Submit
            </Button>
          </Box>
        }
        sx={{ minWidth: 480, minHeight: 240 }}
      />
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      >
        <ModalDialog layout="fullscreen">
          <ModalClose />
          <DialogTitle>Create Persona</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ height: '100%' }}>
              <Textarea
                placeholder="(Optional) Please enter the description of the user persona you'd like me to emulate : "
                autoFocus
                value={personaDesc}
                minRows={3}
                maxRows={6}
                onChange={(e) => setPersonaDesc(e.target.value)}
                sx={{ height: '100%' }}
              />
              <DialogActions>
                <Button
                  color="primary"
                  variant="soft"
                  onClick={() => {
                    setModalOpen(false);
                  }}
                >
                  Set Persona
                </Button>
                <Button
                  variant="plain"
                  color="neutral"
                  onClick={() => {
                    setPersonaDesc('');
                    setModalOpen(false);
                  }}
                >
                  Reset
                </Button>
              </DialogActions>
            </Stack>
          </DialogContent>
        </ModalDialog>
      </Modal>
    </>
  );
};

export default App;
