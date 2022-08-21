require('./config/db');
const Authrouter = require('./routes/auth');
const Postrouter = require('./routes/posts');
const Userrouter = require('./routes/users');
const app = require('express')();
const port = process.env.PORT || 3000;



// for accepting post from data
const bodyParser = require('express').json();

app.use(bodyParser);
app.use('/auth', Authrouter);
app.use('/user', Userrouter);
app.use('/post', Postrouter);
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});


