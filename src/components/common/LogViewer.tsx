/**
 * LogViewer - Component for displaying application logs
 */

import React, { useState, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Box,
  Typography,
  Chip,
  Button,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Grid,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useLog, type LogLevel, type ILogEntry } from '@/contexts/LogContext';

interface LogViewerProps {
  maxHeight?: string;
  showFilters?: boolean;
}

export const LogViewer: React.FC<LogViewerProps> = ({
  maxHeight = '400px',
  showFilters = true,
}) => {
  const { logs, clearLogs } = useLog();
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isExpanded, setIsExpanded] = useState(true); // Default to expanded
  const [selectedLog, setSelectedLog] = useState<ILogEntry | null>(null);

  // Get unique categories
  const categories = useMemo(() => {
    const uniqueCategories = new Set(logs.map((log) => log.category));
    return Array.from(uniqueCategories).sort();
  }, [logs]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const levelMatch = selectedLevel === 'all' || log.level === selectedLevel;
      const categoryMatch = selectedCategory === 'all' || log.category === selectedCategory;
      return levelMatch && categoryMatch;
    });
  }, [logs, selectedLevel, selectedCategory]);

  const getLevelColor = (level: LogLevel): 'error' | 'warning' | 'success' | 'info' => {
    switch (level) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'success':
        return 'success';
      default:
        return 'info';
    }
  };

  const formatTimestamp = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    } as any).format(date);
  };

  const formatFullTimestamp = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    } as any).format(date);
  };

  const handleViewDetails = (log: ILogEntry) => {
    setSelectedLog(log);
  };

  const handleCloseModal = () => {
    setSelectedLog(null);
  };

  return (
    <Card sx={{ mt: 3 }}>
      <CardHeader
        title={
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6">Activity Log</Typography>
            {logs.length > 0 && <Chip label={logs.length} size="small" color="default" />}
          </Stack>
        }
        action={
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
            {logs.length > 0 && (
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={clearLogs}
              >
                Clear
              </Button>
            )}
          </Stack>
        }
      />
      {isExpanded && (
        <>
          {showFilters && (
            <CardContent sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Filter by Level</InputLabel>
                    <Select
                      value={selectedLevel}
                      label="Filter by Level"
                      onChange={(e) => setSelectedLevel(e.target.value as LogLevel | 'all')}
                    >
                      <MenuItem value="all">All Levels</MenuItem>
                      <MenuItem value="info">Info</MenuItem>
                      <MenuItem value="success">Success</MenuItem>
                      <MenuItem value="warning">Warning</MenuItem>
                      <MenuItem value="error">Error</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Filter by Category</InputLabel>
                    <Select
                      value={selectedCategory}
                      label="Filter by Category"
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      <MenuItem value="all">All Categories</MenuItem>
                      {categories.map((cat) => (
                        <MenuItem key={cat} value={cat}>
                          {cat}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          )}
          <Box
            sx={{
              maxHeight,
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            {filteredLogs.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  No logs to display
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: '120px' }}>Time</TableCell>
                      <TableCell sx={{ width: '80px' }}>Level</TableCell>
                      <TableCell sx={{ width: '120px' }}>Category</TableCell>
                      <TableCell>Message</TableCell>
                      <TableCell sx={{ width: '60px' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id} hover>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {formatTimestamp(log.timestamp)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={log.level} color={getLevelColor(log.level)} size="small" />
                        </TableCell>
                        <TableCell>
                          <Chip label={log.category} size="small" />
                        </TableCell>
                        <TableCell>{log.message}</TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetails(log)}
                            title="View full details"
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </>
      )}

      {/* Log Details Dialog */}
      <Dialog open={!!selectedLog} onClose={handleCloseModal} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            {selectedLog && (
              <Chip label={selectedLog.level} color={getLevelColor(selectedLog.level)} size="small" />
            )}
            <Typography variant="h6">Log Entry Details</Typography>
            <Box sx={{ flexGrow: 1 }} />
            <IconButton onClick={handleCloseModal} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                  Timestamp
                </Typography>
                <Typography variant="body2">{formatFullTimestamp(selectedLog.timestamp)}</Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                  Level
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip label={selectedLog.level} color={getLevelColor(selectedLog.level)} size="small" />
                </Box>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                  Category
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip label={selectedLog.category} size="small" />
                </Box>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                  Message
                </Typography>
                <Paper sx={{ p: 2, mt: 0.5, bgcolor: 'action.hover' }}>
                  <Typography variant="body2">{selectedLog.message}</Typography>
                </Paper>
              </Box>

              {selectedLog.details && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight="bold">
                    Details
                  </Typography>
                  <Paper
                    sx={{
                      p: 2,
                      mt: 0.5,
                      bgcolor: 'grey.900',
                      color: 'grey.100',
                      maxHeight: 400,
                      overflow: 'auto',
                    }}
                  >
                    <Typography
                      component="pre"
                      variant="caption"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontFamily: 'monospace',
                      }}
                    >
                      {selectedLog.details}
                    </Typography>
                  </Paper>
                </Box>
              )}

              {!selectedLog.details && (
                <Typography variant="caption" color="text.secondary">
                  No additional details available
                </Typography>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Close</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

