# HTTPS Deployment Guide

## Environment Variables (Production)

```env
PORT=3000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/smart_university
SESSION_SECRET=<long-random-string-min-32-chars>
NODE_ENV=production
SESSION_SECURE=true
```

When `SESSION_SECURE=true`, session cookies are only sent over HTTPS.

## Option 1: Nginx Reverse Proxy

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}
```

## Option 2: Let's Encrypt (Certbot)

```bash
sudo certbot --nginx -d your-domain.com
```

## Running with PM2

```bash
npm install -g pm2
pm2 start server.js --name smart-university
pm2 save
pm2 startup
```

## Security Checklist

- Set a strong `SESSION_SECRET`
- Use `SESSION_SECURE=true` behind HTTPS
- Use MongoDB Atlas with IP allowlist
- Keep dependencies updated (`npm audit`)
- Helmet and CORS are enabled in `app.js`
- Never commit `.env` to version control

## Trust Proxy

`app.set('trust proxy', 1)` is configured so Express respects `X-Forwarded-Proto` from Nginx when setting secure cookies.
