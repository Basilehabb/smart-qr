import { Request, Response } from 'express';
import cloudinary from '../config/cloudinary';
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });

export const uploadImage = async (req: Request, res: Response) => {
  try {
    // multer should have attached file
    // but for simplicity, accept base64 or file buffer in req.file
    const file = (req as any).file;
    if (!file) return res.status(400).json({ message: 'No file' });
    const result = await cloudinary.uploader.upload_stream({ resource_type: 'image', folder: 'smartqr' }, (error:any, result:any) => {
      if (error) return res.status(500).json({ error });
      return res.json({ url: result.secure_url });
    });
    // Note: in this scaffold we didn't wire stream; recommend using direct upload on client in prod
  } catch (err) {
    res.status(500).json({ error: err });
  }
};

export const simpleUpload = async (req:any, res:Response) => {
  try {
    const { image } = req.body; // expect image as data URL
    if (!image) return res.status(400).json({ message: 'No image' });
    const uploaded = await cloudinary.uploader.upload(image, { folder: 'smartqr' });
    res.json({ url: uploaded.secure_url });
  } catch (err) {
    res.status(500).json({ error: err });
  }
};
