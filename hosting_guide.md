# Hosting Guide: Multi-App Redirect Service

Here is a step-by-step guide to hosting this Node.js application online.

---

## 🛠️ Step 0: Upload to GitHub (Prerequisite)

Before deploying, push your project folder to a GitHub repository:
1. Initialize a Git repository in `/app-link-redirector`:
   ```bash
   git init
   git add .
   git commit -m "Initial redirect service commit"
   ```
2. Create a new repository on [GitHub](https://github.com).
3. Connect your local repository and push:
   ```bash
   git remote add origin https://github.com/your-username/your-repo-name.git
   git branch -M main
   git push -u origin main
   ```

---

## ☁️ Option 1: Render (100% Free Tier)

[Render](https://render.com) is the easiest free hosting platform for Node.js apps.

### Deployment Steps:
1. Sign up on **Render.com** and connect your GitHub account.
2. Click **New +** at the top right and select **Web Service**.
3. Select your repository from the GitHub list.
4. Configure the settings:
   - **Name**: `app-redirector` (or any custom name)
   - **Region**: Select the region closest to you
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Select the **Free** tier
5. Click **Create Web Service**. Your service will be online in a few minutes!

### 💾 Preserving Click Stats on Render:
Because Render's Free tier containers are *ephemeral* (files are wiped out and reset when the server restarts or deploys new code), your `db.json` stats will reset. 
To prevent this, you can mount a persistent disk:
1. Scroll down to **Disks** under your Web Service settings on Render.
2. Click **Add Disk**.
3. Name it `db-volume`, set the Mount Path to `/var/data`, and choose a size (e.g. 1 GB).
4. Update the DB path in `server.js` to load/save inside `/var/data` (e.g., check if `/var/data/db.json` exists, otherwise use standard `db.json`). Let's configure `server.js` to handle this automatically so it works out-of-the-box!

---

## 🚂 Option 2: Railway (Extremely Fast, Low Cost)

[Railway](https://railway.app) is very fast, cheap, and easily supports persistent disks.

### Deployment Steps:
1. Log in to **Railway.app** using your GitHub account.
2. Click **New Project** > **Deploy from GitHub repo** and select your repository.
3. Railway will auto-detect Node.js and begin deploying.
4. Once deployed, go to the **Settings** tab of the service and click **Generate Domain** to get a public URL (e.g., `app-redirector.up.railway.app`).

### 💾 Preserving Click Stats on Railway:
1. Click on your service block inside the Railway canvas dashboard.
2. Go to the **Volumes** tab.
3. Click **Add Volume** (1 GB is more than enough).
4. Mount the volume to `/var/data`.

---

## 🐧 Option 3: VPS Server (DigitalOcean / Linode / AWS)

For 100% control with automatic data persistence on a cheap virtual server ($4/month).

### Deployment Steps:
1. Create a Linux VPS droplet (Ubuntu 22.04 LTS is recommended).
2. Connect to your VPS via SSH:
   ```bash
   ssh root@your_server_ip
   ```
3. Update packages and install Node.js:
   ```bash
   sudo apt update
   sudo apt install -y curl
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   ```
4. Install `pm2` to run the app continuously in the background:
   ```bash
   sudo npm install -g pm2
   ```
5. Clone your GitHub repository on the VPS:
   ```bash
   git clone https://github.com/your-username/your-repo-name.git
   cd your-repo-name
   npm install
   ```
6. Start the server under PM2 monitoring:
   ```bash
   pm2 start server.js --name "redirector"
   ```
7. Set up PM2 to auto-start the app on system reboots:
   ```bash
   pm2 startup
   # Copy and execute the command line output by the pm2 command above
   pm2 save
   ```
8. The server is now running on port `8000`. You can configure a reverse proxy using Nginx to link it to your domain (e.g. `download.myapp.com`).
