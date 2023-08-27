const jwt = require("express-jwt");
var jwtBase = require('jsonwebtoken');
const { secret } = require("config.json");
const db = require("_helpers/db");

module.exports = { authorize, authorizeAdmin, authorizeSocket };

function authorize() {
  return [
    // authenticate JWT token and attach decoded token to request as req.user
    jwt({ secret, algorithms: ["HS256"] }),

    // attach full user record to request object
    async (req, res, next) => {
      // get user with id from token 'sub' (subject) property
      const user = await db.User.findByPk(req.user.sub);

      // check user still exists
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      // authorization successful
      req.user = user.get();
      next();
    },
  ];
}

async function authorizeSocket(socket) {
  let token = socket.handshake.headers["authorization"].replace("Bearer ", "");
  // verify JWT token with verify function and attach decoded token to socket
  const payload = await jwtBase.verify(token, secret);

  // get user with id from token 'sub' (subject) property
  const user = await db.User.findByPk(payload.sub);

  // check user still exists
  if (!user) return socket.emit("unauthorized");

  // authorization successful
  socket.user = user.get();
}

function authorizeAdmin() {
  return [
    // authenticate JWT token and attach decoded token to request as req.user
    jwt({ secret, algorithms: ["HS256"] }),
    // attach full user record to request object
    async (req, res, next) => {
      // get user with id from token 'sub' (subject) property
      const user = await db.User.findByPk(req.user.sub);

      // check user still exists
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      } else if (user.role != "Admin") {
        return res.status(401).json({ message: "Insufficient Privileges" });
      }

      // authorization successful
      req.user = user.get();
      // advance to the next admin function
      next();
    },
  ];
}
