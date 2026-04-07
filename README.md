# GDI ELD UI - Next.js Widget Server

A Next.js-based widget server that provides embeddable widgets for Azure spend analytics and other insights. Widgets can be embedded in React applications, microsites, and other web applications using iframe + postMessage architecture.

## 🚀 Quick Start

### Development Server

```bash
npm install
npm run dev
```

The server will start on **http://localhost:8081**

### Access Points

- **Main Application**: http://localhost:8081
- **Azure Spend Widget**: http://localhost:8081/widgets/azure-spend
- **Widget API**: http://localhost:8081/api/widgets/azure-spend
- **Test Page**: http://localhost:8081/embed-example.html

## 📦 Widget Architecture

This project uses a **micro-frontend architecture** with iframe embedding and postMessage communication for secure, isolated widget deployment.

### Key Features

✅ **Framework Agnostic**: Works with React, Vue, Angular, vanilla JS  
✅ **Secure Communication**: postMessage API with origin validation  
✅ **Server-Side Proxy**: API calls made server-side to protect tokens  
✅ **CORS Enabled**: Cross-origin requests supported  
✅ **Independent Deployment**: Widget and consumer apps deploy separately  

## 🔧 Configuration

### Port Configuration

The application runs on port 8081 by default. To change:

```json
// package.json
"scripts": {
  "dev": "next dev -p 8081"
}
```

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=https://api-ccrdev.insight.com
NEXT_PUBLIC_WIDGET_ENV=development
```

## 📚 Documentation

### Widget Integration Guides

- **[WIDGET_ARCHITECTURE.md](./WIDGET_ARCHITECTURE.md)** - Complete architecture overview and design patterns
- **[WIDGET_EMBED_GUIDE.md](./WIDGET_EMBED_GUIDE.md)** - Step-by-step integration guide
- **[examples/README.md](./examples/README.md)** - Framework-specific examples (React, Vue, Angular, Vanilla JS)
- **[examples/AzureSpendEmbed.jsx](./examples/AzureSpendEmbed.jsx)** - Production-ready React component

### Other Documentation

- **[ARCHITECTURE_GUIDE.md](./ARCHITECTURE_GUIDE.md)** - Overall project architecture
- **[REDUX_DATA_FLOW.md](./REDUX_DATA_FLOW.md)** - Redux state management
- **[VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)** - Deployment guide

## 🎯 Embedding Widgets in Your Application

### React Application (Port 8080)

1. **Copy the embed component:**
   ```bash
   cp examples/AzureSpendEmbed.jsx your-react-app/src/components/
   ```

2. **Use in your app:**
   ```jsx
   import AzureSpendEmbed from './components/AzureSpendEmbed';

   function Dashboard() {
     const accessToken = useAuth(); // Your auth logic
     
     return (
       <AzureSpendEmbed 
         soldToId="Insight|SAP|0011035258|2400"
         accessToken={accessToken}
         onLoad={() => console.log('Widget loaded!')}
       />
     );
   }
   ```

3. **That's it!** The widget will securely communicate with the Next.js server.

### Other Frameworks

See [examples/README.md](./examples/README.md) for Vue, Angular, and vanilla JavaScript implementations.

## 🔐 Security

### Token Handling

**DON'T** ❌ Pass tokens in URL parameters:
```jsx
// BAD: Token visible in browser history, logs
<iframe src="/widget?token=secret123" />
```

**DO** ✅ Use postMessage API:
```jsx
// GOOD: Token passed securely in memory
iframe.contentWindow.postMessage(
  { type: 'AUTH_TOKEN', token: 'secret123' },
  'http://localhost:8081'
);
```

### Origin Validation

The widget validates message origins. Add your domain to the allowed list:

```jsx
// src/app/widgets/azure-spend/page.jsx
const [allowedOrigins] = useState([
  'http://localhost:8080',  // Your React app
  'https://app.yourcompany.com',  // Production
]);
```

## 🧪 Testing

### Test the Widget Locally

1. Start the widget server:
   ```bash
   npm run dev  # Port 8081
   ```

2. Open the test page:
   ```
   http://localhost:8081/embed-example.html
   ```

3. Enter your access token and soldToId

4. Monitor the console for postMessage communication

### Testing in Consumer App

1. Start your React app on port 8080
2. Integrate the `AzureSpendEmbed` component
3. Open browser DevTools → Console
4. Verify postMessage flow:
   - `WIDGET_READY` from widget
   - `AUTH_TOKEN` from parent
   - `WIDGET_LOADED` from widget

## 📊 Available Widgets

### Azure Spend Widget

**URL**: `/widgets/azure-spend`  
**API**: `/api/widgets/azure-spend`

Displays Azure spending analytics including:
- Current estimated usage
- Latest billed usage
- Spending trends and changes
- Historical charts

**Parameters:**
- `soldToId` (required): Customer identifier
- `token` (optional): Can be passed via URL or postMessage

## 🛠 Development

### Project Structure

```
src/
├── app/
│   ├── widgets/
│   │   └── azure-spend/      # Widget pages
│   │       ├── page.jsx       # Main widget component
│   │       └── AzureSpendSkeleton.jsx
│   ├── api/
│   │   └── widgets/
│   │       └── azure-spend/   # API proxy
│   │           └── route.js
│   └── dashboard/
│       └── components/
│           └── AzureSpendWidget.jsx  # Widget UI
├── examples/
│   ├── AzureSpendEmbed.jsx   # React integration component
│   └── README.md             # Framework examples
└── public/
    └── embed-example.html    # Test page
```

### Adding New Widgets

1. Create widget page: `src/app/widgets/your-widget/page.jsx`
2. Create API proxy: `src/app/api/widgets/your-widget/route.js`
3. Add to widget registry
4. Create embed example

See [WIDGET_ARCHITECTURE.md](./WIDGET_ARCHITECTURE.md) for detailed guidance.

## 🚢 Deployment

### Production Deployment

Update configuration for production:

```jsx
// src/app/widgets/azure-spend/page.jsx
const [allowedOrigins] = useState([
  'https://app.yourcompany.com',
  'https://portal.yourcompany.com'
]);
```

```jsx
// src/app/api/widgets/azure-spend/route.js
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://app.yourcompany.com',
  // ...
};
```

### Vercel Deployment

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for Vercel-specific setup.

## 🔍 Troubleshooting

### Common Issues

**Widget not loading:**
- Check if widget server is running on port 8081
- Verify CORS headers in Network tab
- Check console for errors

**postMessage not working:**
- Verify origin validation includes your domain
- Check that origins match exactly (protocol + domain + port)
- Look for WIDGET_READY message in console

**Authentication fails:**
- Verify token is valid and not expired
- Check Authorization header in Network tab
- Ensure token is sent via postMessage, not URL

**CORS errors:**
- Add your domain to CORS allowed origins
- Check preflight OPTIONS request succeeds
- Verify credentials configuration

## 📖 Learn More

### Next.js Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

### Micro-Frontend Resources

- [Micro-Frontends Pattern](https://martinfowler.com/articles/micro-frontends.html)
- [postMessage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
- [iframe Security](https://developer.mozilla.org/en-US/docs/Web/Security/Securing_your_site/iframe_sandbox)

## 🤝 Contributing

When adding new features:

1. Follow the existing widget architecture pattern
2. Add comprehensive comments and documentation
3. Include example usage
4. Update relevant documentation files
5. Test across different frameworks

## 📝 License

[Add your license here]

## 💡 Support

For questions or issues:
- Check the documentation files listed above
- Review the examples in `/examples` directory
- Open an issue in the repository

---

**Widget Server**: Port 8081  
**Consumer Apps**: Port 8080 (React), or any other port/domain  
**Architecture**: iframe + postMessage micro-frontend

