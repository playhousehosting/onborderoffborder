# AWS Deployment Plan - Employee Lifecycle Portal

## Overview
This plan enables **dual deployment** to both AWS and Vercel from the same codebase without conflicts.

---

## Current Architecture Analysis

### Existing Setup (Vercel)
- **Frontend**: React SPA built with `react-scripts`, deployed as static files
- **Backend**: Express.js serverless functions via `@vercel/node`
- **Routing**: `vercel.json` handles API routing and SPA fallback
- **Session Store**: Currently in-memory (needs upgrade for production)
- **Database**: None (stateless operations via Microsoft Graph API)
- **Environment**: Serverless functions

### Key Files
- `vercel.json` - Vercel-specific routing and build config
- `package.json` - Frontend dependencies and build scripts
- `backend/package.json` - Backend dependencies
- `backend/server.js` - Express server (runs as serverless on Vercel)

---

## AWS Deployment Strategy

### Recommended AWS Architecture

#### Option 1: AWS Amplify + Lambda (Serverless - Similar to Vercel)
**Best for**: Cost optimization, auto-scaling, minimal ops

**Services:**
- **AWS Amplify** - Frontend hosting (static files)
- **API Gateway** - REST API endpoint
- **AWS Lambda** - Backend Express app (serverless)
- **ElastiCache (Redis)** - Session storage (shared across Lambda instances)
- **Secrets Manager** - Environment variables/credentials
- **CloudFront** - CDN for global distribution
- **Route 53** - DNS management

**Pros:**
- Very similar to Vercel architecture
- Auto-scaling, pay-per-use
- No server management
- Easy to maintain alongside Vercel

**Cons:**
- Cold starts on Lambda (first request slower)
- 15-minute Lambda timeout limit
- More complex session management

---

#### Option 2: AWS ECS Fargate + ALB (Containerized - Recommended)
**Best for**: Production workloads, consistent performance, hybrid Exchange integration

**Services:**
- **Amazon ECS (Fargate)** - Containerized Express backend
- **Application Load Balancer** - Traffic distribution
- **Amazon S3 + CloudFront** - Frontend static hosting
- **ElastiCache (Redis)** - Session storage
- **AWS Secrets Manager** - Credentials management
- **VPC** - Network isolation, VPN to on-prem
- **Route 53** - DNS

**Pros:**
- ✅ No cold starts (always running)
- ✅ Better for long-running operations (PowerShell remoting)
- ✅ VPC connectivity to on-premises (Exchange, AD)
- ✅ Predictable performance
- ✅ Full Express.js support (no serverless limitations)
- ✅ Easier debugging and logging

**Cons:**
- Higher base cost (always running)
- Requires container management
- More complex setup

---

#### Option 3: EC2 + ALB (Traditional - Most Control)
**Best for**: Maximum control, legacy integrations

**Services:**
- **EC2 instances** - Express backend (t3.medium recommended)
- **Application Load Balancer** - Load balancing
- **S3 + CloudFront** - Frontend hosting
- **ElastiCache (Redis)** - Session storage
- **VPC + VPN/Direct Connect** - On-prem connectivity

**Pros:**
- Full control over server
- Direct VPN to on-premises network
- Easiest for hybrid Exchange
- No platform limitations

**Cons:**
- Manual scaling required
- Must manage OS updates/patches
- Higher operational overhead
- More expensive

---

## Recommended Solution: ECS Fargate (Option 2)

### Why ECS Fargate?
1. **Hybrid Exchange Support**: Persistent connections to on-prem Exchange Server
2. **No Cold Starts**: Backend always warm for PowerShell remoting
3. **VPC Integration**: Direct connectivity to on-premises via VPN/Direct Connect
4. **Scalability**: Auto-scales containers based on CPU/memory
5. **Container Portability**: Can run anywhere (AWS, Azure, on-prem)
6. **Balanced Cost**: Only pay for running containers (can scale to zero off-hours)

---

## Implementation Plan

### Phase 1: Prepare Codebase (No Breaking Changes to Vercel)

#### 1.1 Create AWS-Specific Files (New Files Only)

**Files to Create:**
- `Dockerfile` - Container definition for backend
- `docker-compose.yml` - Local development testing
- `.dockerignore` - Exclude unnecessary files
- `nginx.conf` - Frontend static file serving
- `frontend.Dockerfile` - Frontend container (optional)
- `aws/` - Folder for AWS config files
  - `aws/task-definition.json` - ECS task definition
  - `aws/ecs-params.yml` - ECS parameters
  - `aws/buildspec.yml` - CodeBuild configuration (CI/CD)
  - `aws/cloudformation/` - Infrastructure as Code templates
- `.github/workflows/deploy-aws.yml` - GitHub Actions for AWS deployment
- `aws-deployment.sh` - Deployment script

**Files to Modify:**
- `backend/server.js` - Add Redis session store (with fallback for Vercel)
- `package.json` - Add Docker-related scripts
- `.gitignore` - Ignore AWS build artifacts

#### 1.2 Update Backend for Dual Deployment

**backend/server.js changes:**
```javascript
// Session store - Redis for AWS, Memory for Vercel
const sessionStore = process.env.REDIS_URL 
  ? new RedisStore({
      client: redis.createClient({ url: process.env.REDIS_URL }),
      prefix: 'emp-portal:',
    })
  : new MemoryStore(); // Fallback for Vercel

app.use(session({
  ...sessionConfig,
  store: sessionStore
}));
```

**Why this works:**
- Vercel: No `REDIS_URL` → uses in-memory (existing behavior)
- AWS: `REDIS_URL` set → uses ElastiCache (production-ready)
- No breaking changes to Vercel deployment

---

### Phase 2: Create Docker Containers

#### 2.1 Backend Dockerfile
```dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy backend source
COPY backend/ ./

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start server
CMD ["node", "server.js"]
```

#### 2.2 Frontend Dockerfile (Optional - for container deployment)
```dockerfile
FROM node:18-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**OR** just upload build/ to S3 (simpler, recommended)

---

### Phase 3: AWS Infrastructure Setup

#### 3.1 Prerequisites
- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Docker installed locally for testing

#### 3.2 AWS Services to Create

**VPC & Networking:**
```bash
- VPC (10.0.0.0/16)
- Public Subnets (2 AZs) - for ALB
- Private Subnets (2 AZs) - for ECS tasks
- NAT Gateways - outbound internet for ECS
- VPN Gateway - connection to on-premises (for Exchange/AD)
- Security Groups:
  - ALB: Allow 443 from Internet
  - ECS: Allow 5000 from ALB
  - Redis: Allow 6379 from ECS
```

**Storage & Cache:**
```bash
- ElastiCache Redis Cluster (cache.t3.micro for dev)
- S3 Bucket for frontend static files
- CloudFront distribution for S3
```

**Compute:**
```bash
- ECR Repository for Docker images
- ECS Cluster (Fargate)
- ECS Task Definition (backend container)
- ECS Service (Auto Scaling 2-4 tasks)
- Application Load Balancer
- Target Group (backend:5000)
```

**Security:**
```bash
- AWS Secrets Manager - Store:
  - Azure AD credentials
  - Exchange credentials
  - On-prem AD credentials
  - Session secret
  - Encryption key
```

**CI/CD:**
```bash
- CodePipeline (optional) - or use GitHub Actions
- CodeBuild - Build Docker images
```

---

### Phase 4: Deployment Workflow

#### 4.1 GitHub Actions Workflow

Create `.github/workflows/deploy-aws.yml`:
```yaml
name: Deploy to AWS

on:
  push:
    branches:
      - aws-deploy  # Separate branch for AWS
    paths-ignore:
      - 'vercel.json'
      - '.vercel/**'

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: employee-portal-backend
  ECS_CLUSTER: employee-portal-cluster
  ECS_SERVICE: employee-portal-service

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Login to ECR
        run: |
          aws ecr get-login-password --region ${{ env.AWS_REGION }} | \
          docker login --username AWS --password-stdin ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ env.AWS_REGION }}.amazonaws.com
      
      - name: Build, tag, and push backend image
        run: |
          docker build -t ${{ env.ECR_REPOSITORY }}:latest -f Dockerfile .
          docker tag ${{ env.ECR_REPOSITORY }}:latest ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ env.AWS_REGION }}.amazonaws.com/${{ env.ECR_REPOSITORY }}:latest
          docker push ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ env.AWS_REGION }}.amazonaws.com/${{ env.ECR_REPOSITORY }}:latest
      
      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster ${{ env.ECS_CLUSTER }} \
            --service ${{ env.ECS_SERVICE }} \
            --force-new-deployment
  
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install and build
        run: |
          npm ci
          npm run build
        env:
          REACT_APP_API_URL: https://api.yourcompany.com
          REACT_APP_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
          REACT_APP_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
      
      - name: Deploy to S3
        run: |
          aws s3 sync build/ s3://${{ secrets.S3_BUCKET }}/ --delete
      
      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"
```

#### 4.2 Vercel Workflow (Unchanged)
```yaml
# Vercel auto-deploys on push to main
# No changes needed - continues to work
```

---

### Phase 5: Environment Variables

#### AWS Secrets Manager Structure
```json
{
  "azure": {
    "clientId": "...",
    "clientSecret": "...",
    "tenantId": "..."
  },
  "exchange": {
    "server": "exchange01.domain.com",
    "username": "svc_exchange",
    "password": "...",
    "domain": "DOMAIN",
    "remoteDomain": "tenant.mail.onmicrosoft.com"
  },
  "ad": {
    "server": "dc01.domain.com",
    "username": "svc_ad",
    "password": "...",
    "domain": "DOMAIN"
  },
  "app": {
    "sessionSecret": "...",
    "encryptionKey": "...",
    "allowedOrigins": "https://portal.yourcompany.com,https://portal-aws.yourcompany.com"
  },
  "redis": {
    "url": "redis://employee-portal-redis.cache.amazonaws.com:6379"
  }
}
```

---

### Phase 6: Testing Strategy

#### 6.1 Local Testing
```bash
# Test with Docker Compose
docker-compose up

# Access:
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
# Redis: localhost:6379
```

#### 6.2 AWS Dev Environment
- Deploy to dev ECS cluster first
- Test all functionality
- Verify VPN connectivity to on-prem
- Test Exchange/AD PowerShell remoting
- Load testing

#### 6.3 Parallel Deployment
- Vercel: production.vercel.app (existing)
- AWS: portal-aws.yourcompany.com (new)
- Both use same Azure AD app registration
- Different backend URLs

---

## Cost Estimate (AWS)

### Monthly Cost (us-east-1)

**Compute (ECS Fargate):**
- 2 tasks (0.25 vCPU, 0.5 GB RAM) × 730 hours
- ~$20/month

**Load Balancer:**
- Application Load Balancer
- ~$20/month

**ElastiCache Redis:**
- cache.t3.micro
- ~$12/month

**S3 + CloudFront:**
- 100 GB storage, 1 TB transfer
- ~$15/month

**Data Transfer:**
- VPN to on-premises (optional)
- ~$40/month (if using VPN)

**Secrets Manager:**
- ~$2/month

**Total: ~$70-110/month** (depending on VPN usage)

**Vercel for comparison:** Free tier or $20/month Pro

---

## Migration Checklist

### Pre-Deployment
- [ ] Create AWS account and set up billing alerts
- [ ] Install AWS CLI and Docker
- [ ] Create Dockerfile and test locally
- [ ] Set up AWS infrastructure (VPC, ECS, Redis, etc.)
- [ ] Store secrets in AWS Secrets Manager
- [ ] Configure VPN to on-premises (for Exchange/AD)
- [ ] Update DNS records

### Deployment
- [ ] Build and push Docker image to ECR
- [ ] Deploy ECS service
- [ ] Upload frontend to S3
- [ ] Configure CloudFront
- [ ] Test all functionality
- [ ] Monitor logs and metrics

### Post-Deployment
- [ ] Set up CloudWatch alarms
- [ ] Configure auto-scaling policies
- [ ] Test failover scenarios
- [ ] Document runbook
- [ ] Train team on AWS deployment

---

## Rollback Plan

### If AWS Deployment Fails:
1. Vercel deployment **unaffected** (no changes to Vercel files)
2. DNS still points to Vercel (no downtime)
3. Can debug AWS separately
4. No rush to fix - dual deployment strategy

### Gradual Migration:
1. Week 1: Deploy to AWS, test internally
2. Week 2: 10% of traffic to AWS (Route 53 weighted routing)
3. Week 3: 50% of traffic to AWS
4. Week 4: 100% to AWS (if successful)
5. Keep Vercel as backup for 30 days

---

## Key Advantages of This Plan

### ✅ Zero Impact on Vercel
- No changes to `vercel.json`
- No changes to existing deployment workflow
- Vercel continues to deploy on every push to `main`

### ✅ Separate Deployment Branches
- `main` → Vercel (auto-deploy)
- `aws-deploy` → AWS (GitHub Actions)
- Easy to maintain both

### ✅ Gradual Migration
- Test AWS thoroughly before switching
- Run both simultaneously
- Easy rollback if issues

### ✅ Production-Ready
- Redis session storage (not in-memory)
- VPC connectivity to on-premises
- No Lambda cold starts
- Better for long-running PowerShell operations

---

## Next Steps

1. **Review this plan** - Approve architecture choice
2. **Create AWS account** - Set up billing
3. **Create Dockerfile** - Backend container
4. **Test locally** - Docker Compose
5. **Set up AWS infrastructure** - VPC, ECS, Redis
6. **Deploy to AWS dev** - Test environment
7. **Configure CI/CD** - GitHub Actions
8. **Deploy to production** - Parallel to Vercel
9. **Gradual traffic shift** - Route 53 weighted routing
10. **Monitor and optimize** - CloudWatch metrics

---

## Questions to Answer

1. **Do you want to migrate fully to AWS or run dual deployment long-term?**
   - Fully migrate: Eventually deprecate Vercel
   - Dual: Keep both for redundancy

2. **Do you need VPN to on-premises for Exchange/AD?**
   - Yes: AWS Site-to-Site VPN (~$40/month)
   - No: Public endpoints only (less secure)

3. **What's your budget?**
   - Low: Use Amplify + Lambda (cheaper, similar to Vercel)
   - Medium: ECS Fargate (recommended, ~$100/month)
   - High: EC2 (most control, ~$150/month)

4. **CI/CD preference?**
   - GitHub Actions (recommended, included in plan)
   - AWS CodePipeline (more AWS-native)
   - Manual deployment

5. **Domain strategy?**
   - Separate domain: portal-aws.yourcompany.com
   - Same domain: portal.yourcompany.com (Route 53 failover)

---

**Ready to proceed? Let me know which option you prefer and I'll start creating the deployment files!**
