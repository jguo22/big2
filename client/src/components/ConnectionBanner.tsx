import { Button, Flex, Stack, Text } from '@chakra-ui/react';
import { ConnectionStatus } from '../transport/connection.js';

export interface ConnectionBannerProps {
  status: ConnectionStatus;
  error: { code: string; message: string } | null;
  onDismissError: () => void;
}

const STATUS_TEXT: Partial<Record<ConnectionStatus, string>> = {
  connecting: 'Connecting to the server…',
  reconnecting: 'Reconnecting… your seat is being held.',
  offline: 'Connection lost. Retrying…',
};

/**
 * Connection state and the most recent rejected action, if any. Sits on the
 * felt above the card, so it carries its own light-on-dark colours.
 */
export function ConnectionBanner({ status, error, onDismissError }: ConnectionBannerProps) {
  const statusText = STATUS_TEXT[status];
  if (!statusText && !error) return null;

  return (
    <Stack gap="8px" role="status" aria-live="polite">
      {statusText && (
        <Text
          bg="rgba(0, 0, 0, 0.28)"
          color="fg.onFelt"
          borderRadius="pill"
          px="16px"
          py="9px"
          fontSize="13px"
          fontWeight="600"
          textAlign="center"
        >
          {statusText}
        </Text>
      )}
      {error && (
        <Flex
          align="center"
          justify="space-between"
          gap="12px"
          bg="brand.solid"
          color="brand.contrast"
          borderRadius="pill"
          pl="16px"
          pr="6px"
          py="5px"
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
            color="brand.contrast"
            fontWeight="800"
            _hover={{ bg: 'rgba(255,255,255,.2)' }}
          >
            Dismiss
          </Button>
        </Flex>
      )}
    </Stack>
  );
}
