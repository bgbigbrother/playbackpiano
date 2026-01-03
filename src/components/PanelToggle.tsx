import {
  Fab,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Settings as SettingsIcon,
} from '@mui/icons-material';

export interface PanelToggleProps {
  onClick: () => void;
  isOpen: boolean;
}

/**
 * Floating Action Button to toggle the control panel visibility
 * Positioned to not interfere with piano playing experience
 */
export function PanelToggle({ onClick, isOpen }: PanelToggleProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Fab
      color="primary"
      size={isMobile ? "medium" : "large"}
      onClick={onClick}
      aria-label={isOpen ? "Close control panel" : "Open control panel"}
      sx={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: theme.zIndex.speedDial,
        transition: theme.transitions.create(['transform', 'opacity'], {
          duration: theme.transitions.duration.short,
        }),
        transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
        '&:hover': {
          transform: isOpen ? 'rotate(45deg) scale(1.1)' : 'rotate(0deg) scale(1.1)',
        },
        // Ensure it doesn't interfere with piano on mobile
        [theme.breakpoints.down('sm')]: {
          top: 8,
          right: 8,
          size: 'small',
        },
      }}
    >
      <Tooltip 
        title={isOpen ? "Close Controls" : "Open Controls"}
        placement="left"
      >
        <SettingsIcon />
      </Tooltip>
    </Fab>
  );
}