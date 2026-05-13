const { Jimp } = require('jimp');
const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, 'assets', 'images');
const images = ['icon.png', 'adaptive-icon.png'];

async function convertIcons() {
    for (const imgName of images) {
        const imgPath = path.join(imagesDir, imgName);
        if (fs.existsSync(imgPath)) {
            try {
                console.log(`Processing ${imgName}...`);
                const image = await Jimp.read(imgPath);
                const newPath = path.join(imagesDir, imgName.replace('.png', '_new.png'));
                await image.write(newPath);
                
                // Replace old with new
                fs.unlinkSync(imgPath);
                fs.renameSync(newPath, imgPath);
                console.log(`Successfully converted ${imgName} to proper PNG.`);
            } catch (err) {
                console.error(`Error processing ${imgName}:`, err);
            }
        }
    }
}

convertIcons();
