// This is where the app starts

// Load external libraries
const express = require("express");
const collection = require("postman-collection").Collection;

// Setup API
const app = express();
app.use(express.json());

var validUrl = require("valid-url");

//generic base endpoint for app overview page
app.get("/", function(request, response) {
  response.send(
    "Hi! This is an API that uses the Postman collection runner Newman to check training submissions for completeness!"
  );
});

// Status endpoint
app.get("/status", function(request, response) {
  response.send("OK");
});

app.get("/verify", function(request, response) {
  if (!request.query.collectionUrl) {
    response.status(400);
    response.send({ error: "collectionUrl param not found" });
  }

  const req = require("request");

  let url = request.query.collectionUrl;
  if (!validUrl.isUri(url))
    response.status(400).json({ message: "No collection URL provided" });

  let options = { json: true };
  req(url, options, (error, res, body) => {
    if (error) {
      return console.log(error);
    }

    if (!error && res.statusCode == 200) {
      let myCollection = new collection(body);
      let requests = myCollection.toJSON().item;
      console.log(requests);
      let tests = [],
        pre = false,
        fails = [];
      for (const apireq of requests) {
        if (apireq.event.length > 1) pre = true;
        if (apireq.name.indexOf("Complete training") < 0)
          for (const ev of apireq.event) {
            tests.push(ev.script.exec.join(" "));
            if (ev.listen === "prerequest") {
              let hasPre = false;
              for (const ln of ev.script.exec)
                if (!ln.startsWith("//")) {
                  hasPre = true;
                  break;
                }
              if (!hasPre) pre = false;
            }
          }
      }
      let scriptText = tests.join(" ");

      //TODO accommodate variations so we can accept varied syntax
      if (!pre) fails.push("No pre-request script included");
      if (tests.length < 4) fails.push("Not all tests included");
      let scriptElements = [
        {
          elem: "pm.response.json",
          message:
            "No script parsing response body with pm.response.json syntax (each request)"
        },
        {
          elem: "pm.globals.set",
          message: "No script setting a global variable (requests 1-3)"
        },
        {
          elem: "sku",
          message: "Assignment 1: Save sku variable - not completed"
        },
        {
          elem: "orderId",
          message: "Assignment 2: Save orderId - not completed"
        },
        {
          elem: "201",
          message: "Assignment 3: Check for 201 status - not completed"
        },
        {
          elem: "created",
          message: "Assignment 4: Check created property - not completed"
        },
        {
          elem: "true",
          message: "Assignment 4: Check for true value - not completed"
        },
        {
          elem: "number",
          message: "Assignment 4: Check for number - not completed"
        },
        {
          elem: "to.have.status",
          message: "No to.have.status test (requests 1, 3)"
        },
        {
          elem: "to.have.property",
          message: "No to.have.property test (request 1)"
        },
        {
          elem: "to.be.a",
          message: "No to.be.a type check (requests 1-3)"
        },
        {
          elem: "to.eql",
          message: "No to.eql property value equality check (request 2)"
        },
        {
          elem: "setNextRequest",
          message: "No script setting request execution order (request 4)"
        },
        {
          elem: "to.have.jsonSchema",
          message: "No to.have.jsonSchema validation test (request 4)"
        }
      ];
      for (const el of scriptElements) {
        if (scriptText.indexOf(el.elem) < 0) fails.push(el.message);
      }
      let result = {};
      if (fails.length > 0) {
        result.completed = false;
        result.message =
          "Oops! Your collection is still missing some parts. Check out what's missing below and go back through the steps " +
          "in the request documentation. 🙂";
        result.fails = fails;
      } else {
        result.completed = true;
        result.message =
          "Your collection is complete! Fill out the form at go.pstmn.io/submit-badge to get your badge! 🏆";
      }
      response.send(result);
    }
  });
});

// Listen for incoming requests
const listener = app.listen(process.env.PORT || 3000, function() {
  console.log("Your app is listening on port " + listener.address().port);
});
