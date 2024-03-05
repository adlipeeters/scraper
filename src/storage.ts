import { diskStorage } from 'multer';

export const storage = diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
        const filename: string = file.originalname;
        cb(null, filename);
    },
});