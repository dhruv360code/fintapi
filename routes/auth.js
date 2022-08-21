const express = require('express');
const router = express.Router();

const User = require('../models/User');
const UserVerification = require("../models/UserVerification");
const PasswordReset = require("../models/PasswordReset");
const bcrypt = require('bcrypt');
const { response } = require('express');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const multer = require("multer");
const path = require('path');
const fs = require("fs");
const AWS = require('aws-sdk');
const dotenv = require("dotenv");
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



let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS,
    }
});

// testing success
transporter.verify((error, success) => {
    if (error) {
        console.log("error occurred");
        console.log(error);
    } else {
        console.log("Ready for messages");
        console.log(success);
    }
})



// update user


router.put("/update", upload.single('img'), async (req, res) => {
    // console.log(req);
    try {


        console.log(Ifile);

        let myFile = Ifile.split(".");
        const fileType = myFile[myFile.length - 1];
        const file = fs.readFileSync(req.file.path, (err, data) => {
            if (err) {
                throw err;
            }
            console.log(data);
        });

        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `profile/${uuidv4()}.${fileType}`,
            Body: file,
            ACL: "public-read"
        };

        s3.upload(params, (error, data) => {
            if (error) {
                res.status(500).send(error);
            } else {

                const newUser = {

                    profilePicture: data.Location,
                    name: req.body.name,
                    desc: req.body.desc,
                    city: req.body.city,
                    dateOfBirth: req.body.dateOfBirth.toString()
                };

                User.findByIdAndUpdate(req.body.userId, newUser).then(result => {
                    console.log(result);
                    res.status(200).json(result);
                }).catch(err => {
                    console.log(err);
                    res.status(400).json(err);
                })
            }
        })


    } catch (err) {
        console.log(err);
        res.status(400).json({
            status: "FAILED",
            message: "not able to update the user",
            err: err
        });
    }

})


// sign up

router.post('/signup', (req, res) => {


    let { name, email, password, dateOfBirth } = req.body;
    name = name.trim();
    email = email.trim();
    password = password.trim();
    dateOfBirth = dateOfBirth.trim();
    try {
        if (name == "" || email == "" || password == "" || dateOfBirth == "") {
            res.json({
                status: "FAILED",
                message: "Empty input fields!"
            });
        } else if (!/^[a-zA-Z ]*$/.test(name)) {
            throw {
                status: "FAILED",
                message: "Invalid name entered"
            }
        } else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
            throw {
                status: "FAILED",
                message: "Invalid  email entered"
            }
        } else if (!new Date(dateOfBirth).getTime()) {
            throw {
                status: "FAILED",
                message: "Invalid date of Birth"
            }
        } else if (password.length < 8) {
            throw {
                status: "FAILED",
                message: " Password is too short!"
            }
        } else {

            User.find({ email }).then(result => {

                if (result.length) {
                    // a user  already exists
                    res.json({
                        status: "FAILED",
                        message: "User with the provided email already exists"
                    })
                } else {
                    // try to create new user

                    const saltRounds = 10;
                    bcrypt.hash(password, saltRounds).then(hashedPassword => {
                        const newUser = new User({
                            name,
                            email,
                            password: hashedPassword,
                            dateOfBirth,
                            verified: true
                        });

                        newUser.save().then(result => {
                            // handle account verification
                            console.log("user created");

                            // sendVerificationEmail(result, res);
                            res.status(200).json(result);

                        }).catch(err => {
                            res.json({
                                status: "FAILED",
                                message: " An error occurred while saving the account",
                                err: err
                            })
                        })
                    }).catch(err => {
                        console.log(err);
                        res.json({
                            status: "FAILED",
                            message: "An error occurred while hashing password",
                            err: err
                        })
                    })

                }

            }).catch(err => {
                console.log(err);
                res.json({
                    status: "FAILED",
                    message: " Password is too short!",
                    err: err

                });
            })
        }
    }
    catch (error) {
        res.status(400).json({
            status: "FAILED",
            message: error
        })
    }
});


// send verification email
const sendVerificationEmail = ({ _id, email }, res) => {
    const currenturl = "http://localhost:3000/";
    const uniqueString = uuidv4() + _id;

    // mail options
    const mailOptions = {
        from: process.env.AUTH_EMAIL,
        to: email,
        subject: "Verify you email",
        html: `<p>verify you email address to complete the sign up and login into your account.</p>
              <p> This link <b>expires in 6 hours</b>.</p>
              <p>Press <a href=${currenturl + "user/verify/" + _id + "/" + uniqueString}> this link </a> to proceed.</p>`
    };

    const saltround = 10;
    bcrypt
        .hash(uniqueString, saltround)
        .then((hashedUniqueString) => {
            // set values in userverification collection

            const newVerification = new UserVerification({

                userId: _id,
                uniqueString: hashedUniqueString,
                createdAt: Date.now(),
                expiresAt: Date.now() + 21600000,
            });

            newVerification
                .save()
                .then(() => {
                    transporter
                        .sendMail(mailOptions)
                        .then(() => {
                            // email sent and verification record saved
                            res.json({
                                status: "PENDING",
                                message: "verification email sent"
                            })
                        })
                        .catch((error) => {
                            console.log(error);
                            res.json({
                                starus: "FAILED",
                                message: "Verification email failed"
                            })
                        })
                })
                .catch((error) => {
                    console.log(error);
                    res.json({
                        status: "FAILED",
                        message: "Coundn't save verification email data!"
                    })
                })
        })
        .catch((error) => {
            console.log(error);
            console.log("2");
            res.json({
                status: "FAILED",
                message: "Invalid password entered!"
            });
        })
        .catch((error) => {
            console.log(error);
            res.json({
                status: "FAILED",
                message: "An error occurred  while hashing email data!"
            });
        })
}

// verify email
router.get("/verify/:userId/:uniqueString", async (req, res) => {
    console.log("hi requeste made");
    // console.log(req);
    let { userId, uniqueString } = req.params;
    console.log(req.params);

    // console.log(detail);
    // 6300625599a15303e2ba5b45
    // 63006a8f99465d0b722cf763
    UserVerification
        .find({ userId })
        .then((result) => {

            if (result.length > 0) {
                // user verification record exists so we proceed
                console.log("user find");
                const { expiresAt } = result[0];
                const hashedUniqueString = result[0].uniqueString;

                if (expiresAt < Date.now()) {

                    UserVerification
                        .deleteOne({ userId })
                        .then(result => {
                            User
                                .deleteOne({ _id: userId })
                                .then(() => {
                                    let message = "link has expired. please sign up again.";
                                    res.redirect(`user/verified/error=true&message=${message}`);
                                })
                                .catch(error => {
                                    let message = "Clearing user with expired unique string failed";
                                    res.redirect(`user/verified/error=true&message=${message}`);
                                })
                        })
                        .catch((error) => {
                            console.log(error);
                            let message = " An error occurred while clearing expired user verification record";
                            res.redirect(`user/verified/error=true&message=${message}`);
                        });


                } else {
                    // valid record exists so we validate the user string
                    // first compare the hashed unique string

                    bcrypt
                        .compare(uniqueString, hashedUniqueString)
                        .then(result => {
                            if (result) {
                                // strings matches

                                User
                                    .updateOne({ _id: userId }, { verified: true })
                                    .then(() => {
                                        UserVerification
                                            .deleteOne({ userId })
                                            .then(() => {
                                                res.status(200).json("user verified");
                                            })
                                            .catch(error => {
                                                console.log(error);
                                                let message = "An error occurred while updating user record to show verified";
                                                res.redirect(`/user/verified/error=true&message=${message}`);
                                            })
                                    })
                                    .catch(error => {
                                        console.log(error);
                                        let message = "An error occured while updating user record to show verified";
                                        res.redirect('/user/verified/error=true&message=${message}');
                                    })


                            } else {
                                // existing record but incorrect verification detailles passed
                                let message = "Invalid verification details ppassed . check your inbox";
                                res.redirect(`/user/verified/error=true&message=${message}`);

                            }
                        })
                        .catch(error => {
                            let message = "An error occurred while comparing unique string";
                            res.redirect(`/user/verified/error=true&message=${message}`);
                        })

                }
            }
            else {// user verification record exists so we proceed
                let message = "Account record doesn't exist or has been verified already. please sign up or login";
                res.redirect(`/user/verified/error=true&message=${message}`);
            }
        })
        .catch((error) => {
            console.log(error);
        })
});



// Signin

router.post('/signin', (req, res) => {
    let { email, password } = req.body;
    email = email.trim();
    password = password.trim();

    if (email == "" || password == "") {
        res.json({
            status: "FAILED",
            message: "empty credentials supplied"
        })
    } else {
        User.find({ email })
            .then(data => {
                if (data.length) {
                    // User exists

                    if (!data[0].verified) {
                        res.json({
                            status: "FAILED",
                            message: "Email hasn't beem verified yet. check your inbox"
                        })
                    } else {
                        const hashedPassword = data[0].password;
                        bcrypt.compare(password, hashedPassword).then(result => {
                            if (result) {

                                const accessToken = jwt.sign({
                                    userId: data[0]._id,
                                    verified: data[0].verified,
                                    name: data[0].name,
                                    followers: data[0].followers,
                                    followings: data[0].followings
                                },
                                    process.env.JWT_SEC,
                                    { expiresIn: "1d" }
                                );

                                res.status(200).json({
                                    status: "SUCCESS",
                                    message: "Signin Successful",
                                    ...data[0],
                                    accessToken,


                                });

                            } else {
                                console.log("1");
                                res.json({
                                    status: "FAILED",
                                    message: "Invalid password entered!"
                                })
                            }
                        })
                            .catch(err => {
                                res.json({
                                    status: "FAILED",
                                    message: " An error occured while comparing passwords"
                                })
                            })
                    }


                } else {
                    throw {
                        status: "FAILED",
                        message: "Invalid credentials entered!"
                    }
                }
            })
            .catch(err => {
                res.json({
                    status: "FAILED",
                    message: "An error occured while checking for existing user"
                })
            })

    }


});


// password reset stuff
router.post("/requestPasswordReset", (req, res) => {
    const { email, redirectUrl } = req.body;

    // check if mail exists
    User
        .find({ email })
        .then((data) => {
            if (data.length) {
                // user exists
                //check if user is verified

                if (!data[0].verified) {
                    res.json({
                        status: "FAILED",
                        message: "Email hasn't been verified yet. check your inbox"
                    });
                } else {
                    // proceed with email to proceed to reset the password
                    sendResetEmail(data[0], redirectUrl, res);
                }
            } else {
                res.json({
                    status: "FAILED",
                    message: "No account with the supplied email exists!"
                });
            }
        })
        .catch(error => {
            console.log(error);
            res.json({
                status: "FAILED",
                message: "an error while chceking for existing user"
            });
        })

});


// send password reset email
const sendResetEmail = ({ _id, email }, redirectUrl, res) => {
    const resetString = uuidv4() + _id;

    // First, we clear all existing reset records
    PasswordReset
        .deleteMany({ userId: _id })
        .then(result => {
            // reset records deleted successfully
            // now we send the email

            // mail options 
            const mailOptions = {
                from: process.env.AUTH_EMAIL,
                to: email,
                subject: "Password Reset",
                html: `<p>We heard that you lost the  password. press the below link below to reset it.</p>
            <p> This link <b>expires in 60 minutes</b>.</p>
            <p>Press <a href=${redirectUrl + "/" + _id + "/" + resetString}> this link </a> to proceed.</p>`

            };

            const saltRound = 10;
            bcrypt
                .hash(resetString, saltRound)
                .then(hashedResetString => {


                    const newPasswordReset = new PasswordReset({
                        userId: _id,
                        resetString: hashedResetString,
                        createdAt: Date.now(),
                        expiresAt: Date.now() + 3600000
                    });

                    newPasswordReset
                        .save()
                        .then(() => {
                            transporter
                                .sendMail(mailOptions)
                                .then(() => {
                                    res.json({
                                        status: "PENDING",
                                        message: "Password reset email sent "
                                    })
                                })
                        })
                        .catch(error => {
                            console.log(error);
                            res.json({
                                status: "FAILED",
                                message: "Couldn't save password reset data!"
                            });
                        })
                })
                .catch(error => {
                    console.log(error);
                    res.json({
                        status: "FAILED",
                        message: "An error occurred while hashing the password reset data!"
                    });
                })



        })
        .catch((error) => {
            console.log(error);
            res.json({
                status: "FAILED",
                message: "Clearing existing password reset records failed"
            })
        })
}

// actual rest the password
router.post("/resetPassword", (req, res) => {
    let { userId, resetString, newPassword } = req.body;
    PasswordReset.find({ userId })
        .then(result => {
            console.log(result);
            if (result.length > 0) {

                const { expiresAt } = result[0];
                const hashedResetString = result[0].resetString;


                if (expiresAt < Date.now()) {
                    PasswordReset
                        .deleteOne({ userId })
                        .then(() => {
                            res.json({
                                status: "FAILED",
                                message: "Password reset link has expired."
                            })
                        })
                        .catch(error => {
                            res.json({
                                status: "FAILED",
                                message: "Clearing password reset record failed."
                            })
                        })
                } else {
                    bcrypt
                        .compare(resetString, hashedResetString)
                        .then((result) => {
                            if (result) {
                                const saltRounds = 10;
                                bcrypt.hash(newPassword, saltRounds)
                                    .then(hashedNewPassword => {
                                        User
                                            .updateOne({ _id: userId }, { password: hashedNewPassword })
                                            .then(() => {
                                                res.json({
                                                    status: "SUCCESS",
                                                    message: "Password has been reset successfully"
                                                })
                                            })
                                            .catch(error => {
                                                console.log(error);
                                                res.json({
                                                    status: "FAILED",
                                                    message: "An error occurred while finalizing password reset."
                                                })
                                            })
                                    })
                                    .catch(error => {
                                        console.log(error);
                                        res.json({
                                            status: "FAILED",
                                            message: "An error occurred while hashing new password. "
                                        })
                                    })
                            } else {
                                res.json({
                                    status: "FAILED",
                                    message: "Invalid password reset details passed"
                                })
                            }
                        })
                        .catch(error => {
                            console.log(error);
                            res.json({
                                status: "FAILED",
                                message: "comparing password reset strings failed."
                            })
                        })

                }

            } else {

                res.json({
                    status: "FAILED",
                    message: "Password reset request not found."
                })
            }
        })
        .catch(error => {
            console.log(error);
            res.json({
                status: "FAILED",
                message: "Checkinn for existing password reset record failed"
            })
        })
})



module.exports = router;
