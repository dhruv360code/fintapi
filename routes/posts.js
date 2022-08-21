const router = require("express").Router();
const Post = require("../models/Post");
const User = require("../models/User");
const multer = require("multer");
const path = require('path');
const fs = require("fs");
const AWS = require('aws-sdk');
const dotenv = require("dotenv");
const { v4: uuidv4 } = require("uuid");
const { verifyToken } = require("./verifyToken");
AWS.config.update({ region: 'ap-south-1' });
dotenv.config();





const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});


// define storage for the images
let Ifile;

var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'routes/uploads')
    },
    filename: (req, file, cb) => {
        Ifile = Date.now() + file.originalname;
        cb(null, Ifile);
    }
});

var upload = multer({ storage: storage });


// create a post

router.post("/upload", upload.single('img'), async (req, res) => {
    console.log("request made");
    try {

        console.log(req)

        let myFile = Ifile.split(".");
        const fileType = myFile[myFile.length - 1];
        const file = fs.readFileSync(req.file.path, (err, data) => {
            if (err) {
                console.error(err);
                return;
            }
            console.log(data);
        });

        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `/${uuidv4()}.${fileType}`,
            user: file,
            ACL: "public-read"
        }

        s3.upload(params, (error, data) => {
            if (error) {
                res.status(500).send(error);
            } else {

                const post = new Post({
                    userId: req.user.userId,
                    desc: req.user.desc,
                    img: data.Location
                });


                post.save().then(() => {

                    res.status(200).json(post);
                })
                    .catch(err => res.status(400).json('Error: ' + err));
            }
        })

    } catch (err) {
        console.log(err);
        res.status(400).json({
            status: "error occured",
            message: "not able to create the post",
            err: err
        })
    }

})




// // like a post and dislike
router.put("/:id/like", verifyToken, async (req, res) => {
    console.log("request nade");
    try {
        const post = await Post.findById(req.params.id);
        const user = await User.findById(req.user.userId);
        console.log(post.likes);
        console.log(user);
        console.log(post);

        if (user.followings.includes(post.userId)) {
            if (!post.likes.includes(req.user.userId)) {
                await post.updateOne({ $push: { likes: req.user.userId } });
                res.status(200).json("the post has been liked");
            } else {
                await post.updateOne({ $pull: { likes: req.user.userId } });
                res.status(200).json("the post has been disliked");
            }
        }
        else {
            throw "you do not follow this user";
        }
    } catch (err) {
        console.log("error occurred");
        console.log(err);
        res.status(500).json(err);
    }
});



// // get liked post

router.get("/allpost", verifyToken, async (req, res) => {


    try {

        const page = req.query.p || 0;
        const postPerpage = 5;

        const all = await Post
            .find({ likes: { $in: [req.user.userId] } })
            .sort({ createdAt: -1 })
            .skip(page * postPerpage)
            .limit(postPerpage);
        // console.log(posts);
        res.status(200).json(all);

    }
    catch (err) {
        console.log(err);
        res.status(500).json("could not fetch all the documents")
    }

});



module.exports = router;