# DnD-AI-DM Deployment Plan

This document outlines the steps to deploy the DnD-AI-DM project to GitHub and set up any necessary CI/CD pipelines.

## GitHub Repository Setup

1. Create a new repository on GitHub:
   - Go to https://github.com/new
   - Enter "dnd-ai-dm" as the repository name
   - Add a description (optional)
   - Choose whether to make it public or private
   - Do NOT initialize it with a README, .gitignore, or license since we already have files
   - Click "Create repository"

2. Add the GitHub repository as a remote and push your code:
   ```bash
   # Replace YOUR_USERNAME with your actual GitHub username
   git remote add origin https://github.com/YOUR_USERNAME/dnd-ai-dm.git
   git push -u origin main
   ```

## Environment Setup

1. Configure environment variables:
   - Copy the `.env.example` file to `.env`
   - Add your API keys for OpenAI or Anthropic

2. For deployment environments, set up environment variables securely:
   - If using GitHub Actions, use GitHub Secrets
   - If using another hosting platform, use their environment variable system

## CI/CD Setup (Optional)

### GitHub Actions

Create a GitHub Actions workflow file at `.github/workflows/main.yml`:

```yaml
name: DnD-AI-DM CI/CD

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [16.x, 18.x]

    steps:
    - uses: actions/checkout@v3
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    - run: npm ci
    - run: npm run build
    - run: npm test
```

## Deployment Options

### Option 1: Node.js Application Hosting

For deploying as a Node.js application:

1. **Heroku**:
   - Install Heroku CLI
   - Create a Heroku app: `heroku create dnd-ai-dm`
   - Add environment variables: `heroku config:set API_KEY=your_api_key`
   - Push to Heroku: `git push heroku main`

2. **Railway**:
   - Connect your GitHub repository
   - Set environment variables in the Railway dashboard
   - Deploy automatically from your main branch

3. **Vercel**:
   - Connect your GitHub repository
   - Configure environment variables in the Vercel dashboard
   - Deploy automatically from your main branch

### Option 2: Docker Deployment

1. Create a Dockerfile:
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build
   CMD ["npm", "start"]
   ```

2. Build and run the Docker container:
   ```bash
   docker build -t dnd-ai-dm .
   docker run -p 3000:3000 --env-file .env dnd-ai-dm
   ```

3. Deploy to a container service:
   - Docker Hub
   - GitHub Container Registry
   - AWS ECS
   - Google Cloud Run
   - Azure Container Instances

## Monitoring and Maintenance

1. Set up logging:
   - Consider using a service like Datadog, New Relic, or Sentry
   - Implement structured logging in your application

2. Regular maintenance:
   - Keep dependencies updated
   - Monitor API usage and costs
   - Regularly backup data

## Backup Strategy

1. Database backups (if applicable):
   - Set up automated backups
   - Test restoration process

2. Code backups:
   - GitHub already provides version control
   - Consider additional backup solutions for critical data

## Security Considerations

1. API key management:
   - Never commit API keys to the repository
   - Use environment variables or a secure vault

2. Dependency scanning:
   - Set up Dependabot or similar tools to scan for vulnerabilities
   - Regularly update dependencies

3. Code scanning:
   - Set up CodeQL or similar tools for security analysis
   - Implement proper input validation and sanitization 