import { Box, Button, Flex, Stack, Text } from '@chakra-ui/react';
import { ConnectionStatus } from '../transport/connection.js';

export interface ConnectionBannerProps {
  status: ConnectionStatus;
  error: { code: string; message: string } | null;
  onDismissError: () => void;
}

/** Short labels; the corner indicator has no room for a sentence. */
const STATUS_TEXT: Partial<Record<ConnectionStatus, string>> = {
  connecting: 'Connecting',
  reconnecting: 'Reconnecting',
  offline: 'Offline',
};

const STATUS_DOT: Partial<Record<ConnectionStatus, string>> = {
  connecting: '#e2b04a',
  reconnecting: '#e2b04a',
  offline: '#d85e3d',
};

/**
 * A quiet corner indicator for connection state, plus the most recent rejected
 * action.
 *
 * Fixed to the bottom-left and out of normal flow, so it never reflows the
 * board or the room list. The connection chip is deliberately understated —
 * the client reconnects and holds the player's seat by itself, so a blip is
 * not something to interrupt anyone over. A rejected action is feedback on
 * something the player just did, so it reads a little louder and can be
 * dismissed.
 *
 * Colours are fixed rather than themed because this floats over both the cream
 * pages and the dark felt table.
 */
export function ConnectionBanner({ status, error, onDismissError }: ConnectionBannerProps) {
  const statusText = STATUS_TEXT[status];
  if (!statusText && !error) return null;

  return (
    <Stack
      role="status"
      aria-live="polite"
      position="fixed"
      bottom={{ base: '10px', md: '14px' }}
      left={{ base: '10px', md: '14px' }}
      zIndex="1000"
      gap="8px"
      align="flex-start"
      maxW="calc(100vw - 28px)"
      // Informational; only the dismiss button takes clicks, so this never
      // blocks whatever sits underneath it.
      pointerEvents="none"
    >
      {error && (
        <Flex
          align="center"
          gap="10px"
          bg="rgba(216, 94, 61, .94)"
          color="white"
          borderRadius="pill"
          pl="14px"
          pr="4px"
          py="4px"
          pointerEvents="auto"
        >
          <Text fontSize="13px" fontWeight="600">
            {error.message}
          </Text>
          <Button
            onClick={onDismissError}
            aria-label="Dismiss error"
            variant="ghost"
            size="xs"
            borderRadius="pill"
            color="white"
            borderColor="transparent"
            fontSize="12px"
            fontWeight="800"
            _hover={{ bg: 'rgba(255,255,255,.22)' }}
          >
            Dismiss
          </Button>
        </Flex>
      )}

      {statusText && (
        <Flex
          align="center"
          gap="7px"
          bg="rgba(20, 47, 44, .55)"
          borderRadius="pill"
          px="10px"
          py="5px"
          opacity=".8"
        >
          <Box w="7px" h="7px" borderRadius="full" bg={STATUS_DOT[status]} />
          <Text fontSize="12px" fontWeight="600" color="rgba(255,255,255,.8)">
            {statusText}
          </Text>
        </Flex>
      )}
    </Stack>
  );
}
