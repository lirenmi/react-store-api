const path = require('path');
const fs = require('fs');
const jsonServer = require('json-server');
const jwt = require('jsonwebtoken');
const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'db.json'));
const middleWares = jsonServer.defaults();
server.use(jsonServer.bodyParser);
server.use(middleWares);

const getUsersDb = () => {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, 'users.json'), 'UTF-8')
  );
};

const isAuthenticated = ({ email, password }) => {
  return (
    getUsersDb().users.findIndex(
      user => user.email === email && user.password === password
    ) !== -1
  );
};
const isExist = email => {
  return getUsersDb().users.findIndex(user => user.email === email) !== -1;
};

const SECRET = '12321JKLSJKLSDFJK23423432';
const expiresIn = '1h';
const createToken = payload => {
  return jwt.sign(payload, SECRET, { expiresIn });
};

server.post('/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (isAuthenticated({ email, password })) {
    const user = getUsersDb().users.find(
      u => u.email === email && u.password === password
    );
    const { nickname, type } = user;
    // jwt
    const jwToken = createToken({ nickname, type, email });
    return res.status(200).json(jwToken);
  } else {
    const status = 401;
    const message = 'Incorrect email or password';
    return res.status(status).json({ status, message });
  }
});

// Register New User
server.post('/auth/register', (req, res) => {
  const { email, password, nickname, type } = req.body;

  // ----- 1 step
  if (isExist(email)) {
    const status = 401;
    const message = 'Email already exist';
    return res.status(status).json({ status, message });
  }

  // ----- 2 step
  fs.readFile(path.join(__dirname, 'users.json'), (err, _data) => {
    if (err) {
      const status = 401;
      const message = err;
      return res.status(status).json({ status, message });
    }
    // Get current users data
    const data = JSON.parse(_data.toString());
    // Get the id of last user
    const last_item_id = data.users[data.users.length - 1].id;
    //Add new user
    data.users.push({ id: last_item_id + 1, email, password, nickname, type }); //add some data
    fs.writeFile(
      path.join(__dirname, 'users.json'),
      JSON.stringify(data),
      (err, result) => {
        // WRITE
        if (err) {
          const status = 401;
          const message = err;
          res.status(status).json({ status, message });
          return;
        }
      }
    );
  });

  // Create token for new user
  const jwToken = createToken({ nickname, type, email });
  res.status(200).json(jwToken);
});

/**
request headers --> Authorization
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
.eyJuaWNrbmFtZSI6ImFkbWluIiwidHlwZSI6MSwiZW1haWwiOiJhZG1pbkAxNjMuY29tIiwiaWF0IjoxNTcyNzU3MjAzLCJleHAiOjE1NzI3NjA4MDN9
.f4hfN1IjU4E23Lo44N-2VLzc1qoyNu1oZg2iQreZTfU
*/

// server.use(/^(?!\/auth).*$/, (req, res, next) => {
// server.use(['/carts'], (req, res, next) => {
server.use('/carts', (req, res, next) => {
  if (
    req.headers.authorization === undefined ||
    req.headers.authorization.split(' ')[0] !== 'Bearer'
  ) {
    const status = 401;
    const message = 'Error in authorization format';
    res.status(status).json({ status, message });
    return;
  }
  try {
    const verifyTokenResult = verifyToken(
      req.headers.authorization.split(' ')[1]
    );
    if (verifyTokenResult instanceof Error) {
      const status = 401;
      const message = 'Access token not provided';
      res.status(status).json({ status, message });
      return;
    }
    next();
  } catch (err) {
    const status = 401;
    const message = 'Error token is revoked';
    res.status(status).json({ status, message });
  }
});
// Verify the token
const verifyToken = token => {
  return jwt.verify(token, SECRET, (err, decode) =>
    decode !== undefined ? decode : err
  );
};

server.use(router);
server.listen(3003, () => {
  console.log('JSON Server is running');
});
