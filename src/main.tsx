import React from 'react'
import ReactDOM from 'react-dom/client'
import { ChakraProvider, extendTheme } from '@chakra-ui/react'
import App from './App'
import './styles.css'

const theme = extendTheme({
  fonts: {
    heading: '"DM Serif Display", Georgia, serif',
    body: '"Manrope", ui-sans-serif, sans-serif',
  },
  colors: {
    ink: '#142f2c',
    coral: '#e86e4b',
    cream: '#f8f3e8',
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <App />
    </ChakraProvider>
  </React.StrictMode>,
)
