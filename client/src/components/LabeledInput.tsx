import { Box, Input, Text } from '@chakra-ui/react';
import type { ComponentProps } from 'react';

export interface LabeledInputProps extends Omit<ComponentProps<typeof Input>, 'onChange'> {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
}

/** A text input with the small uppercase label used across the room screens. */
export function LabeledInput({ label, value, onValueChange, ...props }: LabeledInputProps) {
  return (
    <Box>
      <Text
        as="label"
        display="block"
        fontSize="14px"
        fontWeight="800"
        letterSpacing=".1em"
        textTransform="uppercase"
        color="fg.muted"
        mb="8px"
      >
        {label}
      </Text>
      <Input
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        size="lg"
        h="54px"
        fontSize="17px"
        bg="white"
        borderWidth="1px"
        borderColor="border.subtle"
        borderRadius="12px"
        color="fg"
        _placeholder={{ color: 'fg.subtle' }}
        _hover={{ borderColor: 'brand.muted' }}
        _focusVisible={{
          borderColor: 'brand.solid',
          outline: '2px solid',
          outlineColor: 'brand.muted',
          outlineOffset: '0px',
        }}
        {...props}
      />
    </Box>
  );
}
