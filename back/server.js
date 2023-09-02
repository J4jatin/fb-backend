


import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import multer from 'multer';
import Grid from 'gridfs-stream';
import bodyParser from 'body-parser';
import path from 'path';

// GridFsStorage is not directly destructured from 'multer-gridfs-storage'
import { GridFsStorage } from 'multer-gridfs-storage';
import { MongoClient } from 'mongodb'; // Removed unnecessary import of ServerApiVersion
import Pusher from 'pusher';
import mongoPosts from './mongoPosts.js'
//import PostModel from './mongoPosts';

Grid.mongo = mongoose.mongo;

const app = express();
const port = process.env.PORT || 9000;

const pusher = new Pusher({
  appId: "1654469",
  key: "f72453431f6a51ab997e",
  secret: "1f93eca668259752fac2",
  cluster: "ap2",
  useTLS: true
});


app.use(bodyParser.json());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const mongoURI = 'mongodb+srv://admin:EQl1MPyckGfCnZ4J@cluster0.pb8gvjt.mongodb.net/fbdb?retryWrites=true&w=majority';

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const conn = mongoose.createConnection(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.once('open', () => {
  console.log('DB connected')

  const changeStream = mongoose.connection.collection('posts').watch()

  changeStream.on('change', (change) => {
    console.log(change)

    if (change.operationType === 'insert') {
      console.log('Triggering Pusher')
      pusher.trigger('posts', 'inserted',{
        change:change
      })
    } else {
      console.log('Error triggering Pusher')
    }
  })


})

let gfs;
let gridfsBucket

conn.once('open', () => {
  console.log('DB Connected');
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('images');
  gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: 'images',
  });
});

const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      const filename = `image-${Date.now()}${path.extname(file.originalname)}`;
      console.log(filename);
      const fileInfo = {
        filename: filename,
        bucketName: 'images',
      };
      resolve(fileInfo);
    });
  },
});

const upload = multer({ storage });

app.get('/', (req, res) => res.status(200).send('hello world'));



app.post('/upload/image', upload.single('file'), (req, res) => {
  res.status(201).json({ message: 'Image uploaded successfully!', file: req.file });
});





// app.post('/upload/post',(req, res)=>{
//   const dbPost = req.body
//   mongoPosts.create(dbPost, (err, data) => {

//     if (err) {
//       res.status(500).send(err)
//     } else {
//       res.status(201).send(data)
//     }

//   }) 


// })
  



// app.get('/retrieve/posts', (req, res) => {
//   mongoPosts.find((err, data) => {
//     if (err) {
//       res.status(500).send(err);
//     } else {
//       data.sort((a, b) => {
//         return a.timestamp - b.timestamp;
//       });
//       res.status(200).send(data);
//     }
//   });
// });


app.post('/upload/post', async (req, res) => {
  const dbPost = req.body;
  try {
    const data = await mongoPosts.create(dbPost);
    res.status(201).send(data);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get('/retrieve/posts', async (req, res) => {
  try {
    const data = await mongoPosts.find().sort({ timestamp: 1 }); // Sort in ascending order
    res.status(200).send(data);
  } catch (err) {
    res.status(500).send(err);
  }
});




// app.get('/retrieve/image/single', (req, res)=>{
//     gfs.files.findOne({filename: req.query.name}, (err, file)=>{
//         if (err) {
//             res.status(500).send(err)

//         } else{
//             if( !file || file.length === 0){
//                 res.status(404).json({ err: 'file not found'})
//             } else{
//                 console.log(975378)
//                 const readstream = gfs.createReadStream(file.filename);
//                 readstream.pipe(res);


//             }

//         } 

        
//     })
// })

app.get('/retrieve/image/single', async (req, res) => {
  try {
    const filename = req.query.name;
    if (!filename) {
      return res.status(400).json({ error: 'Filename not provided' });
    }

    const file = await gfs.files.findOne({ filename });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Open a read stream from the GridFS bucket using gridfsBucket
    const readStream = gridfsBucket.openDownloadStreamByName(filename);

    readStream.on('error', (error) => {
      console.error('Error while streaming:', error);
      res.status(500).json({ error: 'Internal server error' });
    });

    readStream.pipe(res);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.listen(port, () => console.log(`Listening on localhost:${port}`));
