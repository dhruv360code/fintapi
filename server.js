require('./config/db');
const Userrouter = require('./api/User');
const app = require('express')();
const port = 3000;



// for accepting post from data
const bodyParser = require('express').json();

app.use(bodyParser);
app.use('/user', Userrouter);
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});


