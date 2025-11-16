import { Router } from 'express';
import { simpleUpload } from '../controllers/uploadController';

const router = Router();

router.post('/image', simpleUpload);

export default router;
