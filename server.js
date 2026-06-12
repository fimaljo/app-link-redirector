const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

// Determine database path: use persistent volume mount if available
const PERSISTENT_DIR = '/var/data';
let DB_PATH = path.join(__dirname, 'db.json');

if (fs.existsSync(PERSISTENT_DIR)) {
    DB_PATH = path.join(PERSISTENT_DIR, 'db.json');
    // Copy the local template file to the persistent directory if it doesn't exist yet
    if (!fs.existsSync(DB_PATH)) {
        try {
            const template = fs.readFileSync(path.join(__dirname, 'db.json'), 'utf8');
            fs.writeFileSync(DB_PATH, template, 'utf8');
            console.log('Database initialized in persistent disk:', DB_PATH);
        } catch (err) {
            console.error('Failed to copy db.json to persistent volume:', err);
        }
    }
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Load Database Helper
function getDatabase() {
    try {
        const rawData = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(rawData);
    } catch (error) {
        console.error('Error reading database, using default values:', error);
        return { apps: {} };
    }
}

// Save Database Helper
function saveDatabase(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error('Error writing to database:', error);
    }
}

// URL Validation Helper
const isValidUrl = (str) => {
    try {
        const url = new URL(str);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
        return false;
    }
};

// 1. Admin Page Router: "/admin"
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// 2. API - Get All Apps Configuration and Analytics
app.get('/api/apps', (req, res) => {
    const db = getDatabase();
    res.json(db.apps || {});
});

// 3. API - Create or Update an App Link
app.post('/api/apps', (req, res) => {
    const { slug, name, iosUrl, androidUrl, fallbackUrl } = req.body;

    // Validation
    if (!slug || !name || !iosUrl || !androidUrl || !fallbackUrl) {
        return res.status(400).json({ error: 'All fields must be filled out.' });
    }

    const cleanSlug = slug.trim().toLowerCase();
    const slugRegex = /^[a-z0-9-_]+$/;
    if (!slugRegex.test(cleanSlug)) {
        return res.status(400).json({ error: 'Invalid Slug. Use only lowercase letters, numbers, hyphens, and underscores.' });
    }

    if (['admin', 'api'].includes(cleanSlug)) {
        return res.status(400).json({ error: 'Reserved keyword slug. Use a different slug.' });
    }

    if (!isValidUrl(iosUrl) || !isValidUrl(androidUrl) || !isValidUrl(fallbackUrl)) {
        return res.status(400).json({ error: 'Invalid URL formats. Must start with http:// or https://' });
    }

    const db = getDatabase();
    if (!db.apps) db.apps = {};

    const existingApp = db.apps[cleanSlug] || {};
    const existingStats = existingApp.stats || {
        iosClicks: 0,
        androidClicks: 0,
        fallbackClicks: 0,
        totalClicks: 0
    };

    // Store or Update App details
    db.apps[cleanSlug] = {
        name: name.trim(),
        iosUrl: iosUrl.trim(),
        androidUrl: androidUrl.trim(),
        fallbackUrl: fallbackUrl.trim(),
        stats: existingStats
    };

    saveDatabase(db);
    res.json({ success: true, message: `App '${name}' saved successfully!`, app: db.apps[cleanSlug] });
});

// 4. API - Delete an App Link
app.delete('/api/apps/:slug', (req, res) => {
    const slug = req.params.slug.toLowerCase();
    const db = getDatabase();

    if (!db.apps || !db.apps[slug]) {
        return res.status(404).json({ error: 'App not found.' });
    }

    const appName = db.apps[slug].name;
    delete db.apps[slug];
    
    saveDatabase(db);
    res.json({ success: true, message: `App '${appName}' deleted successfully!` });
});

// 5. API - Reset Statistics Click Counters for a specific App
app.post('/api/apps/:slug/reset', (req, res) => {
    const slug = req.params.slug.toLowerCase();
    const db = getDatabase();

    if (!db.apps || !db.apps[slug]) {
        return res.status(404).json({ error: 'App not found.' });
    }

    db.apps[slug].stats = {
        iosClicks: 0,
        androidClicks: 0,
        fallbackClicks: 0,
        totalClicks: 0
    };

    saveDatabase(db);
    res.json({ success: true, message: 'App statistics reset successfully!', app: db.apps[slug] });
});

// 6. Root Directory Link Catalog Page: "/"
app.get('/', (req, res) => {
    const db = getDatabase();
    const apps = db.apps || {};
    
    const appList = Object.keys(apps).map(slug => {
        return `<li><a href="/${slug}">${apps[slug].name} (/${slug})</a></li>`;
    }).join('');
    
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>App Directory</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <link rel="icon" type="image/png" href="https://img.icons8.com/fluency/48/rocket.png">
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap" rel="stylesheet">
            <style>
                body {
                    background-color: #030014;
                    color: #f8fafc;
                    font-family: 'Outfit', sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                    padding: 1.5rem;
                }
                .container {
                    background: rgba(17, 12, 40, 0.45);
                    backdrop-filter: blur(25px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    padding: 2.5rem;
                    border-radius: 20px;
                    max-width: 500px;
                    width: 100%;
                    text-align: center;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.5);
                }
                h1 {
                    font-size: 1.8rem;
                    margin-bottom: 0.5rem;
                    background: linear-gradient(135deg, #fff 30%, #a855f7 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                p.intro {
                    color: #94a3b8;
                    font-size: 0.95rem;
                    margin-bottom: 2rem;
                }
                ul {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                li a {
                    display: block;
                    padding: 1rem;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 12px;
                    color: #fff;
                    text-decoration: none;
                    font-weight: 600;
                    transition: all 0.3s ease;
                }
                li a:hover {
                    background: rgba(99, 102, 241, 0.15);
                    border-color: rgba(99, 102, 241, 0.4);
                    transform: translateY(-2px);
                }
                .admin-link {
                    margin-top: 2rem;
                    display: inline-block;
                    color: #94a3b8;
                    font-size: 0.9rem;
                    text-decoration: none;
                    border-bottom: 1px solid #475569;
                    padding-bottom: 2px;
                }
                .admin-link:hover {
                    color: #fff;
                    border-color: #fff;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>App Link Directory</h1>
                <p class="intro">Select an application link below to proceed to the download store.</p>
                <ul>
                    ${appList || '<p style="color: #94a3b8">No applications configured yet.</p>'}
                </ul>
                <a class="admin-link" href="/admin">Manage Settings Console</a>
            </div>
        </body>
        </html>
    `);
});

// 7. Dynamic Param Redirect Route: "/:slug" (Catch-All Mobile Redirect)
app.get('/:slug', (req, res, next) => {
    const slug = req.params.slug.trim().toLowerCase();

    // Skip endpoints and standard asset extensions
    if (slug.includes('.') || ['admin', 'api'].includes(slug)) {
        return next();
    }

    const db = getDatabase();
    const appData = db.apps ? db.apps[slug] : null;

    if (!appData) {
        return res.redirect('/?error=app_not_found');
    }

    const userAgent = req.headers['user-agent'] || '';
    let targetUrl = appData.fallbackUrl;
    let category = 'fallbackClicks';

    if (/iPad|iPhone|iPod/.test(userAgent) && !/windows/i.test(userAgent)) {
        targetUrl = appData.iosUrl;
        category = 'iosClicks';
    } else if (/android/i.test(userAgent)) {
        targetUrl = appData.androidUrl;
        category = 'androidClicks';
    }

    // Increment App Clicks
    appData.stats[category] = (appData.stats[category] || 0) + 1;
    appData.stats.totalClicks = (appData.stats.totalClicks || 0) + 1;
    
    db.apps[slug] = appData;
    saveDatabase(db);

    // Issue instant redirect
    res.writeHead(302, { 'Location': targetUrl });
    res.end();
});

// Start Server
app.listen(PORT, () => {
    console.log(`Redirect Server running at http://localhost:${PORT}`);
    console.log(`Admin Dashboard available at http://localhost:${PORT}/admin`);
});
