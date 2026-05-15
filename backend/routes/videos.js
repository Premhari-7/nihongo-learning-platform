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
    'cloud_name=', process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING',
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
        const stream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'video',
                folder: 'nihongo_videos'
            },
            (error, result) => {
                if (result) {
                    resolve(result);
                } else {
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
        console.log('[Upload] Upload started');
        if (!req.file) {
            return res.status(400).json({ msg: 'No video file provided' });
        }

        console.log('[Upload] File received:', req.file.originalname, '| size:', req.file.size, 'bytes');

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

        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            console.error('[Upload] FATAL: Cloudinary env vars missing!');
            return res.status(500).json({ msg: 'Server misconfiguration: Cloudinary credentials missing.' });
        }

        console.log('[Upload] Cloudinary upload started');
        let result;
        try {
            result = await streamUpload(req.file.buffer);
            console.log('Cloudinary upload success:', result);
        } catch (uploadErr) {
            console.error('[Upload] Cloudinary upload failed:', uploadErr);
            return res.status(500).json({ msg: 'Cloudinary upload failed: ' + (uploadErr.message || uploadErr) });
        }

        if (!result || !result.secure_url || !result.public_id) {
            console.error('[Upload] Cloudinary returned incomplete result');
            return res.status(500).json({ msg: 'Cloudinary returned invalid response. Please retry.' });
        }

        let videoOrder = parseInt(order) || 0;
        if (!videoOrder) {
            const count = await Video.countDocuments({ jlptLevel, section });
            videoOrder = count + 1;
        }

        const videoDoc = {
            title,
            description: description || '',
            url: getTransformedUrl(result.secure_url),
            cloudinaryPublicId: result.public_id,
            jlptLevel,
            section,
            order: videoOrder,
            uploadedBy: uploadedBy || 'admin'
        };

        const newVideo = new Video(videoDoc);
        const savedVideo = await newVideo.save();

        console.log('[Upload] MongoDB save success. Saved Video:', savedVideo);

        const newNotification = new Notification({
            message: `New ${jlptLevel} ${section} video available: ${title}`,
            type: 'video_upload',
            recipientRole: 'user',
            videoId: savedVideo._id
        });
        await newNotification.save();

        res.json(savedVideo);
    } catch (err) {
        console.error('[Upload] Unhandled error:', err);
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

        const transformedVideos = videos.map(v => ({
            title: v.title,
            description: v.description,
            url: getTransformedUrl(v.url),
            cloudinaryPublicId: v.cloudinaryPublicId,
            jlptLevel: v.jlptLevel,
            section: v.section,
            order: v.order,
            _id: v._id,
            uploadedBy: v.uploadedBy
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
