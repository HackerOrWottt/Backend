//to upload the files on our local server
import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    //console.log("📁 Multer Received:", file.fieldname, file.originalname);
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

export const upload = multer({
  storage
});
