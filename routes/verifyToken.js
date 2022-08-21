const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {

    const authHeader = req.headers.token;
    console.log("here is the header");
    console.log(authHeader);
    if (authHeader) {
        jwt.verify(authHeader, process.env.JWT_SEC, (err, user) => {
            if (err) res.status(403).json("Token is not valid !");

            req.user = user;
            console.log(req.user);
            next();
        })
    } else {
        return res.status(401).json(" you are not authorized");
    }
};

const verifyTokenAndAuthorization = (req, res, next) => {
    // console.log(req);
    verifyToken(req, res, () => {

        // console.log(req);
        console.log("nhsoihdodhodi");
        console.log(req.user.userId);


        if (req.body.userId === req.user.userId.toString()) {
            next();
        } else {
            res.status(403).json("You are not allowwed to do that!");
        }
    })
};



module.exports = { verifyToken, verifyTokenAndAuthorization };