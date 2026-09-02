import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const bucketName = 'game-assets';

async function setupStorage() {
  console.log(`Checking if bucket "${bucketName}" exists...`);
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error("Error listing buckets:", listError.message);
    return;
  }

  const exists = buckets.some(b => b.name === bucketName);
  if (!exists) {
    console.log(`Creating public bucket "${bucketName}"...`);
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      allowedMimeTypes: ['image/webp', 'image/svg+xml', 'image/png', 'image/jpeg'],
    });
    if (createError) {
      console.error("Error creating bucket:", createError.message);
      return;
    }
  } else {
    console.log(`Bucket "${bucketName}" already exists.`);
  }

  // Upload directories
  await uploadDirectory(path.resolve(__dirname, '../public/resonators'), 'resonators');
  await uploadDirectory(path.resolve(__dirname, '../public/echoes'), 'echoes');
  await uploadDirectory(path.resolve(__dirname, '../public/icons'), 'icons');
  
  console.log("Asset migration complete!");
}

async function uploadDirectory(dirPath, bucketPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`Directory ${dirPath} does not exist. Skipping.`);
    return;
  }

  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isFile()) {
      const extension = path.extname(file).toLowerCase();
      let contentType = 'application/octet-stream';
      if (extension === '.webp') contentType = 'image/webp';
      if (extension === '.svg') contentType = 'image/svg+xml';
      if (extension === '.png') contentType = 'image/png';
      if (extension === '.jpg' || extension === '.jpeg') contentType = 'image/jpeg';

      const destination = `${bucketPath}/${file}`;
      console.log(`Uploading ${file} to ${destination}...`);
      
      const fileBuffer = fs.readFileSync(filePath);
      
      const { error } = await supabase.storage.from(bucketName).upload(destination, fileBuffer, {
        contentType,
        upsert: true
      });
      
      if (error) {
        console.error(`Error uploading ${file}:`, error.message);
      }
    }
  }
}

setupStorage();
