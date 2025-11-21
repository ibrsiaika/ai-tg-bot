# AI Bot Dashboard - Frontend

React-based web dashboard for monitoring and controlling the autonomous Minecraft bot.

## Features

- **Real-time Updates**: Socket.IO integration for <100ms updates
- **7 Core Pages**:
  - Dashboard: Bot overview and statistics
  - Map: Location and movement tracking
  - Inventory: Items and equipment management
  - Systems: System status monitoring
  - Analytics: Performance metrics and insights
  - Commands: Bot control interface
  - Logs: Real-time activity logs
- **Responsive Design**: Mobile-friendly interface
- **WCAG 2.1 AA Compliant**: Accessible design
- **Modern Stack**: React 18 + Vite + Tailwind CSS

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Create a `.env` file:

```env
VITE_SOCKET_URL=http://localhost:3002
```

## Architecture

- **React 18**: UI framework
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Socket.IO Client**: Real-time communication
- **Recharts**: Data visualization
- **Lucide React**: Icon library
- **React Router**: Client-side routing

## Accessibility

- Semantic HTML
- ARIA labels
- Keyboard navigation
- Screen reader support
- Color contrast compliance

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## License

MIT
