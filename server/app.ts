import * as bodyParser from "body-parser";
import * as cookieParser from "cookie-parser";
import * as cors from "cors";
import * as express from "express";
import * as helmet from "helmet";
import * as http from "http";
import * as compression from "compression";
import restRouter from "./routes/rest/router";
import tokenRouter from "./routes/token/router";

// Creates and configures an ExpressJS web server.
class App {

  // ref to Express instance
  public express: express.Application;

  // Run configuration methods on the Express instance.
  constructor() {
    this.express = express();
    this.middleware();
    this.routes();
  }

  // Configure Express middleware.
  private middleware(): void {
    this.express.use(compression());
    this.express.use(cookieParser());
    this.express.use(cors());
    this.express.use(helmet());
    this.express.use(bodyParser.json());
    this.express.use(bodyParser.urlencoded({ extended: true }));
  }

  // Configure API endpoints.
  private routes(): void {
    this.express.use("/api", tokenRouter);
    this.express.use("/api/rest", restRouter);
  }

}

const app = new App().express;
const port = process.env.PORT || 8080;
app.set("port", port);

const server: http.Server = app.listen(app.get("port"), () => {
  console.log("app listening on port: ", port);
});

export { server };
