import { ChakraProvider } from '@chakra-ui/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import { GameProvider } from './state/GameProvider.js';
import { system } from './theme.js';
import './styles/index.css';

const container = document.getElementById('root');
if (!container) throw new Error('missing #root element');

createRoot(container).render(
  <StrictMode>
    <ChakraProvider value={system}>
      <GameProvider>
        <App />
      </GameProvider>
    </ChakraProvider>
  </StrictMode>,
);
