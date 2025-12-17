# Web Piano 🎹

A fully-featured, browser-based piano keyboard application built with React, TypeScript, and Tone.js. Play realistic piano sounds using your computer keyboard or by clicking on the keys.

## Features

- **48-Key Piano Keyboard** - Full range from C2 to B5 with both white and black keys
- **Realistic Piano Sounds** - High-quality Salamander Grand Piano samples via Tone.js
- **Keyboard Input** - Play notes using your computer keyboard with intuitive key mapping
- **Mouse/Touch Support** - Click or tap keys for playback on any device
- **Polyphonic Playback** - Play multiple notes simultaneously
- **Responsive Design** - Adapts to different screen sizes with Material-UI
- **Visual Feedback** - Keys highlight when pressed
- **Loading States** - Progress indicators with retry functionality
- **Error Handling** - Comprehensive error recovery with automatic retries
- **Mobile Optimized** - Touch-friendly interface for tablets and phones

## Demo

The piano keyboard spans 48 keys across 4 octaves, providing a realistic playing experience with professional-quality audio samples.

## Tech Stack

- **React 18** - Modern UI framework
- **TypeScript** - Type-safe development
- **Tone.js** - Web Audio framework for sound synthesis
- **Material-UI (MUI)** - Component library and styling
- **Vite** - Fast build tool and dev server
- **Vitest** - Unit testing framework

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd web-piano

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will open at `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

## Keyboard Mapping

The keyboard is mapped to provide an intuitive piano-like layout:

### White Keys (Lower Row)
- `Z X C V B N M` - C2 to B2
- `Q W E R T Y U` - C3 to B3  
- `I O P [ ] \` - C4 to A4
- `; ' , . /` - B4 to F5
- `1 8` - G5 to A5

### Black Keys (Upper Row)
- `S D` - C#2, D#2
- `G H J` - F#2, G#2, A#2
- `2 3` - C#3, D#3
- `5 6 7` - F#3, G#3, A#3
- `9 0` - C#4, D#4
- `= A F` - F#4, G#4, A#4
- `K L` - C#5, D#5
- `` ` 4 - `` - F#5, G#5, A#5

## Project Structure

```
web-piano/
├── src/
│   ├── components/          # React components
│   │   ├── PianoKeyboard.tsx    # Main keyboard container
│   │   ├── PianoKey.tsx         # Individual key component
│   │   ├── LoadingIndicator.tsx # Loading UI
│   │   └── index.ts
│   ├── hooks/               # Custom React hooks
│   │   ├── useKeyboardInput.ts      # Keyboard event handling
│   │   ├── useLoadingState.ts       # Loading state management
│   │   ├── useLoadingWithRetry.ts   # Retry logic
│   │   └── index.ts
│   ├── utils/               # Utility modules
│   │   ├── AudioEngine.ts       # Tone.js audio management
│   │   ├── keyboardLayout.ts    # Keyboard mapping logic
│   │   └── index.ts
│   ├── tests/               # Unit tests
│   ├── App.tsx              # Main application component
│   ├── main.tsx             # Application entry point
│   └── index.css            # Global styles
├── 48_key_mapping.json      # Keyboard-to-note mapping configuration
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Key Components

### AudioEngine
Manages the Tone.js audio context and piano sampler with:
- Automatic sample loading with retry logic
- Error handling and recovery
- Note playback and release
- Audio context state management

### PianoKeyboard
Renders the complete 48-key piano interface with:
- Responsive layout calculation
- Separate white and black key layers
- Visual feedback for pressed keys
- Mouse and touch event handling

### useKeyboardInput
Custom hook that handles:
- Keyboard event listeners
- Key press/release detection
- Polyphonic input support
- Key repeat prevention

## Testing

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch
```

The project includes comprehensive unit tests for:
- Audio engine functionality
- Keyboard input handling
- Component rendering
- Keyboard layout generation
- Polyphonic playback

## Browser Compatibility

The application requires a modern browser with Web Audio API support:
- Chrome 34+
- Firefox 25+
- Safari 14.1+
- Edge 79+

## Performance

- Lazy loading of audio samples
- Optimized rendering with React memoization
- Efficient event handling to prevent memory leaks
- Touch action optimization for mobile devices

## Known Limitations

- Audio context may require user interaction to start (browser security policy)
- Sample loading requires internet connection on first load
- Some browsers may have audio latency on mobile devices

## Development

### Code Quality

```bash
# Run linter
npm run lint

# Type checking
npm run build
```

### Architecture Decisions

- **Tone.js** for professional audio synthesis and sample playback
- **Material-UI** for consistent, accessible UI components
- **Custom hooks** for reusable logic and separation of concerns
- **TypeScript** for type safety and better developer experience
- **Vitest** for fast, modern testing

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

This project is open source and available under the MIT License.

## Acknowledgments

- Piano samples from [Tone.js Salamander Grand Piano](https://tonejs.github.io/)
- Built with [Vite](https://vitejs.dev/)
- UI components from [Material-UI](https://mui.com/)

## Future Enhancements

- [ ] Recording and playback functionality
- [ ] MIDI device support
- [ ] Additional instrument sounds
- [ ] Sustain pedal simulation
- [ ] Visual sheet music display
- [ ] Adjustable octave range
- [ ] Volume and reverb controls
- [ ] Keyboard shortcuts customization

---

Made with ♪ using React and Tone.js
