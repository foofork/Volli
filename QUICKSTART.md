# 🚀 Volli Quick Start Guide

## ✅ Installation Complete!

The Volli project has been successfully set up. Here's how to get started:

## 🎯 Quick Commands

```bash
# Start the web development server
npm run dev

# This will:
# 1. Navigate to the web app directory
# 2. Start the Vite development server
# 3. Open at http://localhost:3000
```

## 📁 Current Structure

The project is organized as follows:

```
volli/
├── apps/
│   └── web/              # SvelteKit web application (ready to run!)
├── packages/             # Core packages (ready for implementation)
│   ├── identity-core/    # Post-quantum crypto
│   ├── vault-core/       # Encrypted storage
│   ├── messaging/        # Message handling
│   └── ui-kit/          # UI components
├── docs/                # Full documentation
└── README.md            # Project overview
```

## 🔧 Development Workflow

### 1. Start Development Server
```bash
npm run dev
```

### 2. View the App
Open your browser to http://localhost:3000

### 3. Edit Code
- Main app: `apps/web/src/routes/+page.svelte`
- Add new routes in `apps/web/src/routes/`
- Components go in `apps/web/src/lib/`

## 📦 Package Development

The core packages are scaffolded and ready for implementation:

### @volli/identity-core
```bash
cd packages/identity-core
npm install
npm run dev
```

### @volli/vault-core
```bash
cd packages/vault-core
npm install
npm run dev
```

## 🏗️ Next Steps

### Week 1-2: Cryptographic Foundation
1. Implement post-quantum crypto in `packages/identity-core`
2. Add libsodium integration
3. Create key generation and management

### Week 3-4: Storage Layer
1. Implement encrypted SQLite in `packages/vault-core`
2. Add CRDT support with Automerge
3. Create message schemas

### Week 5-6: UI Development
1. Build UI components in `packages/ui-kit`
2. Create chat interface in `apps/web`
3. Add routing and navigation

## 🛠️ Common Tasks

### Add a New Package
```bash
mkdir -p packages/new-package/src
cd packages/new-package
npm init -y
```

### Run Tests
```bash
# When tests are implemented
npm test
```

### Build for Production
```bash
cd apps/web
npm run build
```

## 🔍 Troubleshooting

### Port Already in Use
```bash
# Change port in apps/web/vite.config.ts
# Or kill the process using the port
lsof -ti:3000 | xargs kill -9
```

### Dependencies Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📚 Resources

- [Architecture Guide](docs/ARCHITECTURE.md)
- [Security Documentation](docs/SECURITY.md)
- [Developer Guide](docs/DEVELOPER.md)
- [Roadmap](docs/ROADMAP.md)

## 🎉 Ready to Build!

The foundation is set. Start with `npm run dev` and begin building the future of secure messaging!

---

**Need Help?** Check the docs folder or use the SPARC commands:
```bash
npm run sparc:modes
npm run sparc:info architect
```