// import mongoose, { Schema } from 'mongoose'

// const postModel = mongoose.Schema ({

//     user: String,
//     imgName: String,
//     text: String,
//     avatar: String,
//     timestamp: String

// })

// export default mongoose.model('posts', postModel)

import mongoose from 'mongoose';

const { Schema } = mongoose;

const postSchema = new Schema({
    user: String,
    imgName: String,
    text: String,
    avatar: String,
    timestamp: String
});

const PostModel = mongoose.model('Post', postSchema);

export default PostModel;