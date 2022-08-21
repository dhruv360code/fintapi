const User = require("../models/User");
const Post = require("../models/Post");
const router = require("express").Router();
const bcrypt = require("bcrypt");
const { verifyToken } = require('./verifyToken');


// update user
// router.put("/", verifyTokenAndAuthorization, async (req, res) => {
//     console.log(req);
//     try {

//         // password validation
//         if (req.body.password) {
//             const p = req.body.password;
//             errors = [];
//             if (p.length < 8) {
//                 errors.push("Your password must be at least 8 characters");
//             }
//             if (!(p[0] >= 'A' && p[0] <= 'Z')) {
//                 errors.push("Your password must first letter must be capital.");

//             }
//             if (p.search(/[@#$%^&+=]/) < 0) {
//                 errors.push("Your password must contain at least one letter.");
//             }
//             if (p.search(/[0-9]/) < 0) {
//                 errors.push("Your password must contain at least one digit.");
//             }
//             if (errors.length > 0) {
//                 res.status(406).json(errors);

//             }
//         }

//         // validate email
//         if (req.body.email) {
//             if (!emailvalidator.validate(req.body.email)) {
//                 res.status(400).send('Invalid Email');
//             }
//         }

//         // validate gender
//         if (req.body.gender) {
//             req.body.gender = req.body.gender.toLowerCase();
//             if (!((req.body.gender === "male") || (req.body.gender === "female") || (req.body.gender === "other"))) {
//                 res.status(400).json("not a valid gender");

//             }
//         }
//         // validate phone number
//         if (req.body.mobile) {
//             const result = validatePhoneNumber.validate(req.body.mobile);
//             if (!result) {
//                 res.status(400).json("your mobile number is required");
//             }

//         }


//         let hashedPassword;

//         // encrypt the password
//         if (req.body.password) {
//             const salt = bcrypt.genSaltSync(10);
//             hashedPassword = bcrypt.hashSync(req.body.password, salt);
//         }
//         // create a new user
//         const newUser = {
//             name: req.body.name,
//             email: req.body.email,
//             password: hashedPassword,
//             mobile: req.body.mobile,
//             gender: req.body.gender,

//         };

//         const user = await User.findOneAndUpdate(
//             req.user.userId, {
//             $set: newUser
//         });

//         res.status(200).json("Account has been updated");

//     } catch (err) {
//         console.log(err);
//         res.status(400).json({
//             status: "FAILED",
//             message: "not able to update the user",
//             err: err
//         });
//     }

// })



// delete user
// router.delete("/:id", verifyTokenAndAuthorization, async (req, res) => {


//     try {
//         await User.findOneAndDelete({ userId: req.params.id });
//         res.status(200).json("Account has been deleted");
//     } catch (err) {
//         console.log("error occured");
//         return res.status(500).json(err);
//     }

// })



// get user
router.get("/getusers", async (req, res) => {

    try {
        let all = [];
        const user = await User.find();

        user.forEach(result => {
            if (req.query.name.toLowerCase() === result.name.toLowerCase().substring(0, req.query.name.length)) {
                all.push(result);
            }

        })

        console.log(all);
        res.status(200).json(all);

    } catch (err) {
        res.status(500).json(err);
    }

});


// follow user

router.put("/:id/follow", verifyToken, async (req, res) => {
    if (req.user.userId !== req.params.id) {
        try {
            console.log(req);

            const user = await User.findById(req.params.id);
            const currentUser = await User.findById(req.user.userId);
            // console.log(user);
            console.log(user);
            console.log(currentUser);

            if (!user.followers.includes( req.user.userId )) {
                await user.updateOne({ $push: { followers: req.user.userId } });
                await currentUser.updateOne({ $push: { followings: req.params.id } });
                res.status(200).json('user has been followed');
            } else {
                res.status(403).json("you already follow this user");
            }
        } catch (err) {
            console.log("error occured");
            console.log(err);
            res.status(403).json(err);
        }
    } else {
        res.status(403).json("you cant follow yourself");
    }
})

// unfollow user

router.put("/:id/unfollow", verifyToken, async (req, res) => {
    console.log("request made");
    if (req.user.userId !== req.params.id) {
        try {

            const user = await User.findById(req.params.id);
            const currentUser = await User.findById(req.user.userId);
           console.log(user.followers.includes(req.user.userId))
           console.log(user);
        //    console.log(user.followings);
            if (user.followers.includes(req.user.userId)) {
                await user.updateOne({ $pull: { followers: req.user.userId } });
                await currentUser.updateOne({ $pull: { followings: req.params.id } });
                res.status(200).json('user has been unfollowed');
            } else {
                res.status(403).json("you dont follow this user");
            }
        } catch (err) {
            console.log("error occured");
            console.log(err);
            res.status(403).json(err);
        }
    } else {
        res.status(403).json("you cant unfollow yourself");
    }
})



module.exports = router;