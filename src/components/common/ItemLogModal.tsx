/**
 * ItemLogModal - Modal for displaying logs for a specific download item
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Stack,
  Typography,
  Box,
  Paper,
  Chip,
  Collapse,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import type { IItemLogEntry } from '@/types';

interface ItemLogModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  logs: IItemLogEntry[];
}

export const ItemLogModal: React.FC<ItemLogModalProps> = ({
  open,
  onClose,
  title,
  logs,
}) => {
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  const getLevelIcon = (level: IItemLogEntry['level']) => {
    switch (level) {
      case 'success':
        return <SuccessIcon fontSize="small" color="success" />;
      case 'warning':
        return <WarningIcon fontSize="small" color="warning" />;
      case 'error':
        return <ErrorIcon fontSize="small" color="error" />;
      default:
        return <InfoIcon fontSize="small" color="info" />;
    }
  };

  const getLevelColor = (level: IItemLogEntry['level']) => {
    switch (level) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Download Logs</Typography>
          <IconButton edge="end" onClick={onClose} aria-label="close" size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {title}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {logs.length === 0 ? (
          <Alert severity="info">No logs available for this item yet.</Alert>
        ) : (
          <Stack spacing={1}>
            {logs.map((log, index) => (
              <Paper
                key={index}
                elevation={1}
                sx={{
                  p: 1.5,
                  borderLeft: 4,
                  borderColor: `${getLevelColor(log.level)}.main`,
                }}
              >
                <Stack direction="row" alignItems="flex-start" spacing={1}>
                  <Box sx={{ mt: 0.25 }}>{getLevelIcon(log.level)}</Box>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{ mb: 0.5 }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontFamily: 'monospace' }}
                      >
                        {formatTimestamp(log.timestamp)}
                      </Typography>
                      <Chip
                        label={log.level.toUpperCase()}
                        size="small"
                        color={getLevelColor(log.level)}
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    </Stack>
                    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                      {log.message}
                    </Typography>
                    {log.details && (
                      <>
                        <IconButton
                          size="small"
                          onClick={() =>
                            setExpandedLogId(expandedLogId === index ? null : index)
                          }
                          sx={{ mt: 0.5 }}
                        >
                          {expandedLogId === index ? (
                            <ExpandLessIcon fontSize="small" />
                          ) : (
                            <ExpandMoreIcon fontSize="small" />
                          )}
                          <Typography variant="caption" sx={{ ml: 0.5 }}>
                            {expandedLogId === index ? 'Hide' : 'Show'} Details
                          </Typography>
                        </IconButton>
                        <Collapse in={expandedLogId === index}>
                          <Paper
                            variant="outlined"
                            sx={{
                              mt: 1,
                              p: 1,
                              backgroundColor: 'grey.50',
                              maxHeight: 200,
                              overflow: 'auto',
                            }}
                          >
                            <Typography
                              variant="caption"
                              component="pre"
                              sx={{
                                fontFamily: 'monospace',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                margin: 0,
                              }}
                            >
                              {log.details}
                            </Typography>
                          </Paper>
                        </Collapse>
                      </>
                    )}
                  </Box>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
          {logs.length} log {logs.length === 1 ? 'entry' : 'entries'}
        </Typography>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
