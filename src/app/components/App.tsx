import React from 'react';
import { Typography, TextField, IconButton, Box, Card, CardContent, CardMedia } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import LoadingButton from '@mui/lab/LoadingButton';

const uint8ArrayToObjectURL = (data: Uint8Array): string => {
  return URL.createObjectURL(new Blob([data], { type: 'image/png' }));
};

const App = () => {
  const [imageUrl, setImageUrl] = React.useState<string>('');
  const [name, setName] = React.useState<string>('');
  const [nodeId, setNodeId] = React.useState<string>('');
  const [taskName, setTaskName] = React.useState<string>('');
  const [taskDesc, setTaskDesc] = React.useState<string>('');
  const [personaDesc, setPersonaDesc] = React.useState<string>('General User Persona');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    window.onmessage = (event) => {
      const { type, message } = event.data.pluginMessage;
      if (type === 'nodeInfo') {
        console.log(message);

        setImageUrl(uint8ArrayToObjectURL(message.imageData));
        setName(message.name);
        setNodeId(message.id);
        setTaskName(message.taskName);
      }
      if (type === 'clear') {
        setImageUrl('');
        setName('');
        setNodeId('');
        setTaskName('');
      }
      if (type === 'loading') {
        setLoading(message);
      }
    };
  }, [taskDesc, personaDesc]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    // personaDesc가 기본값일 경우 제외
    const postData = {
      nodeId,
      taskName,
      taskDesc,
      personaDesc: personaDesc !== 'General User Persona' ? personaDesc : undefined,
    };

    // Figma plugin으로 postData 전송 로직...
    parent.postMessage({ pluginMessage: { type: 'submit', data: postData } }, '*');
  };

  // submit button activation condition: taskDesc is not empty + nodeId is not empty

  const isEligible = taskDesc && nodeId;

  return (
    <Box
      sx={{
        width: 360, // Setting the width of the UI
        height: 640, // Setting the height of the UI
        overflow: 'auto', // Displaying a scrollbar if the content overflows
        display: 'flex',
        flexDirection: 'column',
        padding: '24px',
        bgcolor: 'background.paper', // Setting the background color
        justifyContent: 'space-between', // Adjusting to space out the content
      }}
    >
      <Box>
        <Card sx={{ mb: 3, borderRadius: '16px' }}>
          <Box sx={{ paddingTop: '4px', paddingBottom: '4px', backgroundColor: '#DDD' }}>
            <CardMedia
              component="img"
              sx={{
                height: '194px',
                maxWidth: '100%',
                objectFit: 'contain',
                margin: 'auto',
                display: 'block',
              }}
              image={imageUrl || 'https://placehold.co/360x194?text=App+Agent'}
              alt={name || 'Image'}
            />
          </Box>
          <CardContent sx={{ p: 3, mb: 0 }}>
            <Typography variant="body1" sx={{ mb: 3 }} color="black">
              {name || 'Please select a node in Figma'}
            </Typography>
          </CardContent>
        </Card>
        <TextField
          id="task_desc"
          label="Task Description"
          multiline
          rows={3}
          variant="outlined"
          fullWidth
          sx={{ borderRadius: '16px', mb: 2 }}
          placeholder="Please enter the description of the task you want me to complete in a few sentences:"
          InputProps={{ style: { borderRadius: 16 } }}
          value={taskDesc}
          onChange={(e) => setTaskDesc(e.target.value)}
          required
          disabled={loading}
        />
        <TextField
          id="persona_desc"
          label="Persona"
          variant="outlined"
          fullWidth
          sx={{ borderRadius: '16px', mb: 2 }}
          placeholder="(Optional) Please enter the description of the user persona you'd like me to emulate :"
          InputProps={{ style: { borderRadius: 16 } }}
          value={personaDesc}
          onChange={(e) => setPersonaDesc(e.target.value)}
          disabled
        />
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 2 }}>
        <LoadingButton
          loading={loading} 
          loadingIndicator="Loading…"
          variant="contained"
          color="primary"
          sx={{ borderRadius: '16px', flexGrow: 1, mr: 1 }}
          onClick={handleSubmit}
          disabled={!isEligible}
        >
          Start Testing
        </LoadingButton>
        <IconButton aria-label="settings" sx={{ ml: 1 }}>
          <SettingsIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

export default App;
