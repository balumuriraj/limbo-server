import * as express from "express";
import { findUserByAuthId } from "../../services/user/service";
import { verifyToken } from "../../support/firebaseUtils";

const router = express.Router();

router.use("/", async (req, res, next) => {
  const token = req.body.token || req.query.token || req.headers["authorization"];

  if (!token) {
    next();
    return;
  }

  try {
    const result = await verifyToken(token);

    if (!result) {
      throw new Error("invalid_token");
    }

    const user = await findUserByAuthId(result.uid);
    req.body.isAdmin = result.admin;
    req.body.authId = result.uid;
    req.body.userId = user && user.id;

    next();
  } catch (err) {
    // handle err
    // console.log("err!!", err);
    res.status(403).json(err.message || "invalid_token");
  }
});

export default router;
