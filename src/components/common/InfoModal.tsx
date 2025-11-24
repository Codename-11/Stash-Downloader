/**
 * InfoModal - Reusable modal for displaying information and warnings
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  Stack,
} from '@mui/material';
import {
  Close as CloseIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';

export type InfoModalSeverity = 'info' | 'warning' | 'error' | 'success';

interface InfoModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  severity?: InfoModalSeverity;
  children: React.ReactNode;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'text' | 'outlined' | 'contained';
    color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  }>;
  showCloseButton?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const InfoModal: React.FC<InfoModalProps> = ({
  open,
  onClose,
  title,
  severity = 'info',
  children,
  actions,
  showCloseButton = true,
  maxWidth = 'sm',
}) => {
  const getSeverityIcon = () => {
    switch (severity) {
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'success':
        return <SuccessIcon color="success" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          {getSeverityIcon()}
          <Typography variant="h6" component="span" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
          {showCloseButton && (
            <IconButton edge="end" onClick={onClose} aria-label="close" size="small">
              <CloseIcon />
            </IconButton>
          )}
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ py: 1 }}>{children}</Box>
      </DialogContent>

      {(actions || showCloseButton) && (
        <DialogActions sx={{ px: 3, py: 2 }}>
          {actions?.map((action, index) => (
            <Button
              key={index}
              onClick={action.onClick}
              variant={action.variant || 'text'}
              color={action.color || 'primary'}
            >
              {action.label}
            </Button>
          ))}
          {!actions && showCloseButton && (
            <Button onClick={onClose} variant="contained">
              Close
            </Button>
          )}
        </DialogActions>
      )}
    </Dialog>
  );
};
