/**
 * ToastContainer - Material UI Snackbar container for notifications
 */

import React from 'react';
import { Snackbar, Alert, AlertTitle } from '@mui/material';
import { useToast } from '@/contexts/ToastContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  const handleClose = (toastId: string) => {
    removeToast(toastId);
  };

  return (
    <>
      {toasts.map((toast) => (
        <Snackbar
          key={toast.id}
          open={true}
          autoHideDuration={toast.duration || 5000}
          onClose={() => handleClose(toast.id)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert
            onClose={() => handleClose(toast.id)}
            severity={toast.type}
            variant="filled"
            sx={{ minWidth: 300 }}
          >
            <AlertTitle>{toast.title}</AlertTitle>
            {toast.message}
          </Alert>
        </Snackbar>
      ))}
    </>
  );
};

