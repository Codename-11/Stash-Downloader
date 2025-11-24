/**
 * ErrorMessage - Display error messages
 */

import React from 'react';
import { Alert, AlertTitle, Button, Stack } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

interface ErrorMessageProps {
  error: string | Error;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  onRetry,
  onDismiss,
}) => {
  const errorText = typeof error === 'string' ? error : error.message;

  return (
    <Alert
      severity="error"
      action={
        onDismiss && (
          <Button
            color="inherit"
            size="small"
            onClick={onDismiss}
            startIcon={<CloseIcon />}
          >
            Dismiss
          </Button>
        )
      }
    >
      <AlertTitle>Error</AlertTitle>
      {errorText}
      {onRetry && (
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Button size="small" variant="outlined" color="error" onClick={onRetry}>
            Retry
          </Button>
        </Stack>
      )}
    </Alert>
  );
};
