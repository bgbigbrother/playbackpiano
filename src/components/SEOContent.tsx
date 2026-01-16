import { Box, Typography, Container, Grid, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useState } from 'react';

interface SEOContentProps {
  isMinimized?: boolean;
}

export function SEOContent({ isMinimized = false }: SEOContentProps) {
  const [expanded, setExpanded] = useState<string | false>(false);

  const handleChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  if (isMinimized) {
    return (
      <Box
        component="section"
        sx={{
          position: 'absolute',
          left: '-9999px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
        aria-hidden="true"
      >
        <h1>Free Online Piano Keyboard - Play Piano in Your Browser</h1>
        <p>Play a realistic 48-key piano keyboard online for free. Use your computer keyboard or mouse to play beautiful piano sounds with high-quality Salamander Grand Piano samples.</p>
      </Box>
    );
  }

  return (
    <Container
      maxWidth="lg"
      sx={{
        py: 4,
        px: 3,
        bgcolor: 'background.paper',
        borderRadius: 2,
        mb: 3,
        boxShadow: 1,
      }}
    >
      {/* Main Heading */}
      <Typography
        variant="h1"
        component="h1"
        sx={{
          fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' },
          fontWeight: 700,
          mb: 2,
          textAlign: 'center',
          color: 'primary.main',
        }}
      >
        Free Online Piano Keyboard
      </Typography>

      <Typography
        variant="h2"
        component="h2"
        sx={{
          fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
          fontWeight: 400,
          mb: 4,
          textAlign: 'center',
          color: 'text.secondary',
        }}
      >
        Play realistic piano sounds in your browser - No download required
      </Typography>

      {/* Features Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" component="h3" gutterBottom>
              🎹 48 Piano Keys
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Full 4-octave range from C2 to B5 with both white and black keys
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" component="h3" gutterBottom>
              🎵 Realistic Sound
            </Typography>
            <Typography variant="body2" color="text.secondary">
              High-quality Salamander Grand Piano samples for authentic tone
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" component="h3" gutterBottom>
              ⌨️ Keyboard Input
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Play using your computer keyboard with intuitive key mapping
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" component="h3" gutterBottom>
              📱 Mobile Ready
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Works perfectly on desktop, tablet, and mobile devices
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* How to Use Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h3" sx={{ fontSize: '1.5rem', fontWeight: 600, mb: 2 }}>
          How to Play the Online Piano
        </Typography>
        <Typography variant="body1" paragraph>
          Playing the virtual piano is simple and intuitive. You can use either your computer keyboard or mouse to create beautiful music:
        </Typography>
        <Typography variant="body1" component="div">
          <strong>Using Your Computer Keyboard:</strong>
          <ul>
            <li>White keys are mapped to the lower row (Z, X, C, V, B, N, M, etc.)</li>
            <li>Black keys are mapped to the upper row (S, D, G, H, J, etc.)</li>
            <li>Play multiple keys simultaneously for chords and harmonies</li>
            <li>The keyboard layout mimics a real piano for natural playing</li>
          </ul>
        </Typography>
        <Typography variant="body1" component="div">
          <strong>Using Your Mouse or Touch Screen:</strong>
          <ul>
            <li>Click or tap any key to play its note</li>
            <li>Hold down multiple keys for polyphonic playback</li>
            <li>Perfect for tablets and mobile devices</li>
          </ul>
        </Typography>
      </Box>

      {/* FAQ Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h3" sx={{ fontSize: '1.5rem', fontWeight: 600, mb: 2 }}>
          Frequently Asked Questions
        </Typography>

        <Accordion expanded={expanded === 'panel1'} onChange={handleChange('panel1')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Is this online piano completely free?</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              Yes! Web Piano is 100% free to use. There are no hidden fees, subscriptions, or downloads required. 
              Simply open your browser and start playing immediately.
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion expanded={expanded === 'panel2'} onChange={handleChange('panel2')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Do I need to download any software?</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              No downloads necessary! Web Piano runs entirely in your web browser using modern Web Audio technology. 
              It works on Chrome, Firefox, Safari, and Edge browsers on any device.
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion expanded={expanded === 'panel3'} onChange={handleChange('panel3')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Can I use this piano to learn and practice?</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              Absolutely! Web Piano is perfect for beginners learning piano, experienced players practicing scales and songs, 
              or anyone who wants to experiment with music. The realistic sound and responsive keys make it an excellent practice tool.
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion expanded={expanded === 'panel4'} onChange={handleChange('panel4')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Does it work on mobile phones and tablets?</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              Yes! The piano keyboard is fully responsive and optimized for touch screens. You can play on your iPhone, 
              iPad, Android phone, or tablet with the same quality as on desktop computers.
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion expanded={expanded === 'panel5'} onChange={handleChange('panel5')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>What makes the sound so realistic?</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              We use high-quality Salamander Grand Piano samples powered by Tone.js, a professional Web Audio framework. 
              Each key is recorded from a real grand piano, providing authentic tone and dynamics.
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion expanded={expanded === 'panel6'} onChange={handleChange('panel6')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Can I play multiple notes at the same time?</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              Yes! Web Piano supports polyphonic playback, meaning you can play chords, harmonies, and complex musical 
              passages just like on a real piano. Press multiple keys simultaneously to create rich, layered sounds.
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* Benefits Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h3" sx={{ fontSize: '1.5rem', fontWeight: 600, mb: 2 }}>
          Why Choose Web Piano?
        </Typography>
        <Typography variant="body1" paragraph>
          Whether you're a beginner learning your first scales, a student practicing for lessons, or an experienced 
          musician composing on the go, Web Piano offers the perfect solution for making music anywhere, anytime.
        </Typography>
        <Typography variant="body1" component="div">
          <ul>
            <li><strong>No Installation:</strong> Start playing instantly without downloading apps or plugins</li>
            <li><strong>Cross-Platform:</strong> Works on Windows, Mac, Linux, iOS, and Android</li>
            <li><strong>Professional Quality:</strong> Studio-grade piano samples for authentic sound</li>
            <li><strong>Always Available:</strong> Practice whenever inspiration strikes, no physical piano needed</li>
            <li><strong>Privacy Focused:</strong> No registration or personal information required</li>
            <li><strong>Regular Updates:</strong> Continuously improved with new features and enhancements</li>
          </ul>
        </Typography>
      </Box>

      {/* Keywords for SEO */}
      <Box
        component="footer"
        sx={{
          pt: 3,
          borderTop: 1,
          borderColor: 'divider',
          textAlign: 'center',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Tags: virtual piano, online piano keyboard, piano simulator, free piano, web piano, play piano online, 
          piano practice tool, learn piano, music keyboard, piano app, browser piano, digital piano
        </Typography>
      </Box>
    </Container>
  );
}
