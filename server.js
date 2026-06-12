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

// Bot Detection Helper
const isBot = (userAgent) => {
    if (!userAgent) return true;
    return /bot|crawler|spider|crawling|facebookexternalhit|slurp|wget|curl|ping|preview|instagram|whatsapp|telegram|discord/i.test(userAgent);
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

// 6. Root Directory Link: "/" (Redirect to first available app)
app.get('/', (req, res) => {
    const db = getDatabase();
    const apps = db.apps || {};
    const appSlugs = Object.keys(apps);
    
    // If no apps exist, redirect to admin
    if (appSlugs.length === 0) {
        return res.redirect('/admin');
    }
    
    // Use the first app configured as the default for the root URL
    const defaultSlug = appSlugs[0];
    const appData = apps[defaultSlug];

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
    if (!isBot(userAgent)) {
        appData.stats[category] = (appData.stats[category] || 0) + 1;
        appData.stats.totalClicks = (appData.stats.totalClicks || 0) + 1;
        db.apps[defaultSlug] = appData;
        saveDatabase(db);
    }

    // Issue instant redirect
    res.writeHead(302, { 'Location': targetUrl });
    res.end();
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
    if (!isBot(userAgent)) {
        appData.stats[category] = (appData.stats[category] || 0) + 1;
        appData.stats.totalClicks = (appData.stats.totalClicks || 0) + 1;
        db.apps[slug] = appData;
        saveDatabase(db);
    }

    // Issue instant redirect
    res.writeHead(302, { 'Location': targetUrl });
    res.end();
});

// Start Server
app.listen(PORT, () => {
    console.log(`Redirect Server running at http://localhost:${PORT}`);
    console.log(`Admin Dashboard available at http://localhost:${PORT}/admin`);
});
