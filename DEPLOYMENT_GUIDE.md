# 🚀 Deployment Guide - Manwonyori Detail Page Generator

## 📋 Prerequisites
- GitHub account
- Render account (free tier available)
- Claude API key (already configured locally)

---

## 🔧 Part 1: GitHub Deployment

### Step 1: Create GitHub Repository
1. Go to https://github.com/new
2. Configure repository:
   - **Repository name**: `manwonyori-detail-generator`
   - **Description**: AI-powered product detail page generator for Manwonyori
   - **Privacy**: Private (recommended)
   - **Important**: DO NOT initialize with README, .gitignore, or license

### Step 2: Push Code to GitHub
Run the following commands in order:

```bash
# If you haven't run push_to_github.bat yet:
cd C:\Users\8899y\SuperClaude\Projects\manwonyori_detail\web-system
push_to_github.bat

# Or manually:
git remote add origin https://github.com/YOUR_USERNAME/manwonyori-detail-generator.git
git branch -M main
git push -u origin main
```

---

## 🌐 Part 2: Render Deployment

### Step 1: Connect GitHub to Render
1. Go to https://render.com
2. Sign up or log in
3. Click "New +" → "Web Service"
4. Connect your GitHub account if not already connected
5. Select the `manwonyori-detail-generator` repository

### Step 2: Configure Render Service
Fill in the following settings:

**Basic Settings:**
- **Name**: `manwonyori-detail-generator`
- **Region**: Singapore (closest to Korea)
- **Branch**: `main`
- **Root Directory**: (leave blank)
- **Runtime**: Node
- **Build Command**: `npm install`
- **Start Command**: `npm start`

**Environment Variables:**
Click "Add Environment Variable" and add:
- **Key**: `CLAUDE_API_KEY`
- **Value**: Your Claude API key (from .env file)

**Instance Type:**
- Select "Free" tier for testing
- Can upgrade later for production

### Step 3: Deploy
1. Click "Create Web Service"
2. Wait for deployment (usually 2-5 minutes)
3. Your app will be available at: `https://manwonyori-detail-generator.onrender.com`

---

## 🔐 Security Notes

### Important Security Measures:
1. **Never commit .env file** - Already excluded via .gitignore
2. **Keep repository private** if it contains sensitive business logic
3. **Use environment variables** for all sensitive data in Render
4. **Enable HTTPS** - Render provides this automatically
5. **Monitor usage** - Check Claude API usage regularly

### API Key Management:
- Local development: Uses `.env` file
- Production (Render): Uses environment variables
- Never expose API key in client-side code

---

## 🧪 Testing Your Deployment

### Local Testing:
```bash
cd C:\Users\8899y\SuperClaude\Projects\manwonyori_detail\web-system
npm start
# Visit http://localhost:3000
```

### Production Testing:
1. Visit your Render URL
2. Test both input modes:
   - Simple: Enter "[인생]옛날치킨700g"
   - Detailed: Use the full form with all fields

### Health Check:
- Render automatically monitors your service
- If it crashes, it will auto-restart
- Check logs in Render dashboard for debugging

---

## 📊 Monitoring & Maintenance

### Render Dashboard Features:
- **Logs**: Real-time application logs
- **Metrics**: CPU, Memory usage
- **Deploys**: Deployment history
- **Settings**: Environment variables, custom domains

### Updating Your App:
1. Make changes locally
2. Commit and push to GitHub:
```bash
git add .
git commit -m "Update: description of changes"
git push
```
3. Render auto-deploys on push (if enabled)

---

## 🆘 Troubleshooting

### Common Issues:

**1. API Key Error:**
- Check environment variable in Render
- Ensure no spaces or quotes in the value

**2. Build Failure:**
- Check package.json dependencies
- Review build logs in Render

**3. App Crashes:**
- Check server logs for errors
- Verify all environment variables are set
- Check Node version compatibility

**4. Slow Response:**
- Free tier may sleep after inactivity
- First request may take 30-60 seconds
- Consider upgrading for production use

---

## 📈 Next Steps

### Recommended Enhancements:
1. **Custom Domain**: Add your own domain in Render settings
2. **Database**: Add PostgreSQL for storing generated pages
3. **CDN**: Use Cloudflare for faster global access
4. **Analytics**: Add Google Analytics or similar
5. **Rate Limiting**: Implement to prevent API abuse

### Scaling Options:
- **Upgrade Render Plan**: For more resources and features
- **Add Redis Cache**: For faster repeated requests
- **Implement Queue System**: For batch processing
- **Add Load Balancer**: For high traffic

---

## 📞 Support

### Render Support:
- Documentation: https://render.com/docs
- Community: https://community.render.com
- Status: https://status.render.com

### Claude API:
- Documentation: https://docs.anthropic.com
- API Reference: https://docs.anthropic.com/claude/reference

### Project Issues:
- GitHub Issues: Create in your repository
- Local Testing: Use console.log for debugging

---

## ✅ Deployment Checklist

- [ ] Git repository initialized
- [ ] Initial commit created
- [ ] GitHub repository created
- [ ] Code pushed to GitHub
- [ ] Render account created
- [ ] GitHub connected to Render
- [ ] Web Service created on Render
- [ ] Environment variables configured
- [ ] Deployment successful
- [ ] Production URL tested
- [ ] Both input modes working
- [ ] API responses verified

---

**Last Updated**: 2025-01-08
**Version**: 1.0.0
**Author**: Manwonyori Tech Team