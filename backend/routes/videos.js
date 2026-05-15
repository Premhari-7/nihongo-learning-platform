const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const Video = require('../models/Video');
const Notification = require('../models/Notification');
const Progress = require('../models/Progress');
const { adminAuth } = require('../middleware/auth-middleware');

// ─── Cloudinary configuration ────────────────────────────────────────────────
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure:     true
});

console.log('[videos.js] Cloudinary config loaded:',
    'cloud_name=', process.env.CLOUDINARY_CLOUD_NAME || 'MISSING',
    'api_key=', process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING',
    'api_secret=', process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING'
);

// ─── Multer: memory storage ONLY ─────────────────────────────────────────────
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 500 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only video files are allowed.'), false);
        }
    }
});

// ─── Cloudinary stream upload using stream.end(buffer) ───────────────────────
const streamUpload = (buffer) => {
    return new Promise((resolve, reject) => {
        console.log('[streamUpload] Starting upload_stream, buffer size:', buffer.length, 'bytes');
        const stream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'video',
                folder: 'nihongo_videos'
            },
            (error, result) => {
                if (result) {
                    console.log('[streamUpload] SUCCESS:', JSON.stringify({
                        secure_url: result.secure_url,
                        public_id: result.public_id,
                        format: result.format,
                        bytes: result.bytes
                    }));
                    resolve(result);
                } else {
                    console.error('[streamUpload] FAILED:', error);
                    reject(error);
                }
            }
        );
        stream.end(buffer);
    });
};

// Helper: harden Cloudinary URLs for browser mp4 playback
const getTransformedUrl = (url) => {
    if (url && url.includes('res.cloudinary.com') && url.includes('/upload/') && !url.includes('/upload/f_mp4,vc_auto/')) {
        return url.replace('/upload/', '/upload/f_mp4,vc_auto/');
    }
    return url;
};

// ════════════════════════════════════════════════════════════════════════════════
// IMPORTANT: Static path routes MUST come before /:id wildcard
// ════════════════════════════════════════════════════════════════════════════════

// ─── POST /api/videos/upload ─────────────────────────────────────────────────
router.post('/upload', adminAuth, upload.single('video'), async (req, res) => {
    try {
        // 1. Validate file exists
        if (!req.file) {
            return res.status(400).json({ msg: 'No video file provided' });
        }

        console.log('[Upload] File received:', req.file.originalname, '| size:', req.file.size, '| mime:', req.file.mimetype);
        console.log('[Upload] Buffer exists:', !!req.file.buffer, '| Buffer length:', req.file.buffer ? req.file.buffer.length : 0);

        // 2. Validate form fields
        const { title, description, jlptLevel, section, uploadedBy, order } = req.body;

        if (!title || !jlptLevel || !section) {
            return res.status(400).json({ msg: 'Please enter all required fields' });
        }

        if (!['N5', 'N4', 'N3', 'N2', 'N1'].includes(jlptLevel)) {
            return res.status(400).json({ msg: 'Invalid JLPT level' });
        }

        if (!['Kanji', 'Vocabulary'].includes(section)) {
            return res.status(400).json({ msg: 'Invalid section' });
        }

        // 3. Validate Cloudinary config
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            console.error('[Upload] FATAL: Cloudinary env vars missing!');
            return res.status(500).json({ msg: 'Server misconfiguration: Cloudinary credentials missing.' });
        }

        // 4. Upload to Cloudinary using stream.end(buffer)
        console.log('[Upload] Calling streamUpload...');
        let result;
        try {
            result = await streamUpload(req.file.buffer);
        } catch (uploadErr) {
            console.error('[Upload] Cloudinary upload error:', uploadErr);
            return res.status(500).json({ msg: 'Cloudinary upload failed: ' + (uploadErr.message || uploadErr) });
        }

        // 5. Validate Cloudinary response
        if (!result || !result.secure_url || !result.public_id) {
            console.error('[Upload] Cloudinary returned incomplete result:', JSON.stringify(result));
            return res.status(500).json({ msg: 'Cloudinary returned invalid response. Please retry.' });
        }

        console.log('[Upload] Cloudinary upload success:', result.secure_url);

        // 6. Prepare MongoDB document
        let videoOrder = parseInt(order) || 0;
        if (!videoOrder) {
            const count = await Video.countDocuments({ jlptLevel, section });
            videoOrder = count + 1;
        }

        const sanitizedFilename = req.file.originalname
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .substring(0, 100);

        const videoDoc = {
            title,
            description: description || '',
            filename: Date.now() + '_' + sanitizedFilename,
            url: getTransformedUrl(result.secure_url),
            cloudinaryPublicId: result.public_id,
            jlptLevel,
            section,
            order: videoOrder,
            uploadedBy: uploadedBy || 'admin'
        };

        console.log('[Upload] MongoDB payload:', JSON.stringify(videoDoc));

        // 7. Save to MongoDB
        const newVideo = new Video(videoDoc);
        const savedVideo = await newVideo.save();

        console.log('[Upload] MongoDB SAVED! id:', savedVideo._id, 'url:', savedVideo.url, 'cloudinaryPublicId:', savedVideo.cloudinaryPublicId);

        // 8. Create notification
        const newNotification = new Notification({
            message: `New ${jlptLevel} ${section} video available: ${title}`,
            type: 'video_upload',
            recipientRole: 'user',
            videoId: savedVideo._id
        });
        await newNotification.save();

        res.json(savedVideo);
    } catch (err) {
        console.error('[Upload] UNHANDLED ERROR:', err);
        res.status(500).json({ msg: 'Server error: ' + err.message });
    }
});

// ─── GET /api/videos ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const { level, section } = req.query;
        let query = {};
        if (level) query.jlptLevel = level;
        if (section) query.section = section;

        const videos = await Video.find(query)
            .sort({ jlptLevel: 1, section: 1, order: 1 })
            .lean();

        // Apply f_mp4 transformation for backward compatibility
        const transformedVideos = videos.map(v => ({
            ...v,
            url: getTransformedUrl(v.url)
        }));

        res.json(transformedVideos);
    } catch (err) {
        console.error('Error fetching videos:', err);
        res.status(500).send('Server error');
    }
});

// ─── PUT /api/videos/reorder/batch ───────────────────────────────────────────
router.put('/reorder/batch', adminAuth, async (req, res) => {
    try {
        const { updates } = req.body;

        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ msg: 'Invalid reorder data' });
        }

        const bulkOps = updates.map(item => ({
            updateOne: {
                filter: { _id: item.id },
                update: { $set: { order: item.order } }
            }
        }));

        await Video.bulkWrite(bulkOps, { ordered: false });

        const firstVideo = await Video.findById(updates[0].id).lean();
        let updatedVideos = [];
        if (firstVideo) {
            updatedVideos = await Video.find({
                jlptLevel: firstVideo.jlptLevel,
                section: firstVideo.section
            }).sort({ order: 1 }).lean();
        }

        res.json({ msg: 'Videos reordered successfully', videos: updatedVideos });
    } catch (err) {
        console.error('Error reordering videos:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// ─── PUT /api/videos/normalize/:level/:section ──────────────────────────────
router.put('/normalize/:level/:section', adminAuth, async (req, res) => {
    try {
        const { level, section } = req.params;
        const videos = await Video.find({ jlptLevel: level, section }).sort({ order: 1 });

        const bulkOps = videos.map((v, i) => ({
            updateOne: {
                filter: { _id: v._id },
                update: { $set: { order: i + 1 } }
            }
        }));

        if (bulkOps.length > 0) {
            await Video.bulkWrite(bulkOps, { ordered: false });
        }

        const normalized = await Video.find({ jlptLevel: level, section }).sort({ order: 1 }).lean();
        res.json({ msg: 'Order normalized', videos: normalized });
    } catch (err) {
        console.error('Error normalizing order:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// ════════════════════════════════════════════════════════════════════════════════
// Wildcard /:id routes LAST
// ════════════════════════════════════════════════════════════════════════════════

// ─── PUT /api/videos/:id ─────────────────────────────────────────────────────
router.put('/:id', adminAuth, async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        if (!video) {
            return res.status(404).json({ msg: 'Video not found' });
        }

        const { title, description, jlptLevel, section, order } = req.body;
        const oldLevel = video.jlptLevel;
        const oldSection = video.section;

        if (jlptLevel) {
            if (!['N5', 'N4', 'N3', 'N2', 'N1'].includes(jlptLevel)) {
                return res.status(400).json({ msg: 'Invalid JLPT level' });
            }
        }

        if (section) {
            if (!['Kanji', 'Vocabulary'].includes(section)) {
                return res.status(400).json({ msg: 'Invalid section' });
            }
        }

        if (title) video.title = title;
        if (description !== undefined) video.description = description;
        if (jlptLevel) video.jlptLevel = jlptLevel;
        if (section) video.section = section;
        if (order !== undefined) video.order = parseInt(order);

        const sectionChanged = (jlptLevel && jlptLevel !== oldLevel) || (section && section !== oldSection);
        if (sectionChanged && order === undefined) {
            const count = await Video.countDocuments({
                jlptLevel: video.jlptLevel,
                section: video.section,
                _id: { $ne: video._id }
            });
            video.order = count + 1;
        }

        const updatedVideo = await video.save();

        if (sectionChanged) {
            const oldVideos = await Video.find({ jlptLevel: oldLevel, section: oldSection }).sort({ order: 1 });
            const bulkOps = oldVideos.map((v, i) => ({
                updateOne: { filter: { _id: v._id }, update: { $set: { order: i + 1 } } }
            }));
            if (bulkOps.length > 0) await Video.bulkWrite(bulkOps, { ordered: false });
        }

        res.json(updatedVideo);
    } catch (err) {
        console.error('Error updating video:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// ─── DELETE /api/videos/:id ──────────────────────────────────────────────────
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        if (!video) {
            return res.status(404).json({ msg: 'Video not found' });
        }

        // Delete from Cloudinary
        if (video.cloudinaryPublicId) {
            try {
                await cloudinary.uploader.destroy(video.cloudinaryPublicId, { resource_type: 'video' });
                console.log('[Delete] Cloudinary asset deleted:', video.cloudinaryPublicId);
            } catch (cloudErr) {
                console.error('[Delete] Cloudinary deletion error (non-fatal):', cloudErr.message);
            }
        }

        // Cascade delete progress
        const deletedProgress = await Progress.deleteMany({ videoId: req.params.id });
        console.log('[Delete] Cascade removed', deletedProgress.deletedCount, 'progress records');

        await Video.findByIdAndDelete(req.params.id);
        await Notification.deleteMany({ videoId: req.params.id });

        // Normalize remaining order
        const remaining = await Video.find({
            jlptLevel: video.jlptLevel,
            section: video.section
        }).sort({ order: 1 });

        const bulkOps = remaining.map((v, i) => ({
            updateOne: { filter: { _id: v._id }, update: { $set: { order: i + 1 } } }
        }));
        if (bulkOps.length > 0) await Video.bulkWrite(bulkOps, { ordered: false });

        res.json({ msg: 'Video removed and references cleaned', cascadeDeleted: deletedProgress.deletedCount });
    } catch (err) {
        console.error('Error deleting video:', err);
        res.status(500).send('Server error');
    }
});

module.exports = router;
