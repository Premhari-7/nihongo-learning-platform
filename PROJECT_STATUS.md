# Nihongo Learning Platform - Project Status

## Production Environment
- **Backend Deployment**: Render
- **Database**: MongoDB Atlas
- **Storage**: Cloudinary CDN
- **Current Production Backend URL**: `https://nihongo-backend.onrender.com`

## Technical Architecture & State
- **Cloudinary Integration**: Fully operational. Admin video uploads stream directly to Cloudinary using `multer.memoryStorage()` and `cloudinary.uploader.upload_stream()`.
- **Database Schema**: Secure and optimized. MongoDB exclusively stores `url` and `cloudinaryPublicId`. Legacy `filename` fields have been fully eliminated. No local filesystem storage is utilized.
- **Client Playback**: Web and Android platforms natively consume the Cloudinary `url`. Backward compatibility with browser cross-origin requirements (`f_mp4,vc_auto` transformations) and CORS headers have been resolved.
- **Rate Limiting**: Operational. The `express-rate-limit` proxy issues behind Render's load balancers have been resolved by implementing `app.set('trust proxy', 1)`.
- **Admin Management**: Administrators can upload, modify, and delete videos seamlessly from both their local laptops and the Android application.
- **Student Progression**: Users can consume uploaded videos natively, which accurately triggers quiz unlocking and certificate generation.

## Critical Environment Variables Required
The following environment variables are necessary for the backend to function:
- `MONGODB_URI`
- `JWT_SECRET`
- `ADMIN_CODE`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `PORT` (Provided by Render)
- `GROQ_API_KEY`

---
*Snapshot branch:* `stable-cloudinary-production`
*Status:* Fully deployable and stable production build.
