# Node.js Multi-Platform App Redirect & Analytics Dashboard

This is a lightweight, self-hosted Node.js service that executes instant server-side redirects to iOS or Android App Stores based on client device type. It includes a beautiful management dashboard (`/admin`) to configure store URLs and track visitor stats.

---

## ⚡ Key Highlights
- **Server-Side Redirects (Instant)**: Emits standard HTTP `302 Found` headers to mobile browsers. This is significantly faster and more reliable than HTML/JS client-side redirections.
- **Admin Dashboard (`/admin`)**: A visual control room for link edits, lifetime counters, and visual traffic share allocations.
- **Automated Logging**: Tracks total counts for iOS downloads, Android downloads, and desktop redirects.
- **Dynamic QR Code**: Generates a responsive QR code linking to your host, permitting rapid testing on physical mobile devices.

---

## 🛠️ Project Structure
```text
app-link-redirector/
├── server.js          # Core Express web server, routing & database actions
├── db.json            # Simple local JSON database for settings and stats
├── package.json       # Node package manager declarations
├── README.md          # Setup & execution instructions
└── public/
    ├── admin.html     # Administration dashboard UI
    └── admin.css      # Custom dashboard CSS styles
```

---

## ⚙️ How to Configure and Run

### 1. Install & Launch
Run the following commands inside the directory:
```bash
# Install dependencies
npm install

# Start the server
npm start
```
The server starts up locally on **`http://localhost:8000`**.

### 2. Set App Store Links
1. Open the Admin Dashboard at **`http://localhost:8000/admin`**.
2. Update the input fields for **iOS App Store URL**, **Android Play Store URL**, and **Desktop Fallback URL**.
3. Click **Save Settings**. This updates `db.json` in real time.

---

## 🌐 Deploying to Production
You can host this Node.js app on standard hosting providers:
- **Render** or **Railway**: Import your repository directly; they will auto-detect `package.json` and start the service for free or at very low cost.
- **Heroku** or **DigitalOcean**: Provision a basic Node dyno or droplet, configure your port mapping, and run `npm start`.
