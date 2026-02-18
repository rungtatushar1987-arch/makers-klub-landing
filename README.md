# Makers Klub Landing Page

Premium networking platform for creative professionals in Berlin.

## 🚀 Quick Deploy to Vercel

### Prerequisites
- GitHub account: @rungtatushar1987-arch
- Vercel account (sign up at vercel.com)
- Repository: https://github.com/rungtatushar1987-arch/makers-klub-landing

### Deployment Steps

1. **Push code to GitHub** (see commands below)
2. **Go to Vercel** → vercel.com/new
3. **Import** your GitHub repository
4. **Add environment variables**:
   - `VITE_SUPABASE_URL`: https://xfvigqggnpajnidkutmk.supabase.co
   - `VITE_SUPABASE_ANON_KEY`: [your key from .env file]
5. **Deploy!**

### Local Development

```bash
npm install
npm run dev
```

Visit: http://localhost:5173

### Build for Production

```bash
npm run build
```

## 📁 File Structure

```
makers-klub-landing/
├── index.html          # Main landing page
├── supabase.js         # Database functions
├── main.js             # App logic
├── package.json        # Dependencies
├── vite.config.js      # Dev server config
├── vercel.json         # Deployment config
├── .env                # Environment variables (DO NOT COMMIT)
└── .gitignore          # Git ignore rules
```

## 🔐 Environment Variables

All credentials are already set in your `.env` file.
**IMPORTANT:** Never commit `.env` to GitHub!

## 🌐 Custom Domain (GoDaddy)

After Vercel deployment:
1. Go to Vercel → Project Settings → Domains
2. Add `makersklub.com`
3. Copy DNS records
4. Add to GoDaddy DNS settings
5. Wait 10-30 mins for propagation

## ✅ Checklist

- [x] Supabase database created
- [x] Resend domain verification in progress
- [ ] Code pushed to GitHub
- [ ] Deployed to Vercel
- [ ] Custom domain connected
- [ ] Test form submission
- [ ] Verify email delivery (after domain verification)
