const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const _ = require("lodash");
const app = express();
const day = require(__dirname + "/date-gen.js");
const port = process.env.PORT || 3000;
require("dotenv").config();

var url = process.env.MONGODB_URI;

mongoose.connect(url, {
  useNewUrlParser: true,
});

const itemsSchema = new mongoose.Schema({
  name: String,
});

const NormalItem = mongoose.model("normalItem", itemsSchema);
const item1 = new NormalItem({
  name: "Welcome to your To Do List",
});
const item2 = new NormalItem({
  name: "Hit the '+' button to add a new item",
});

const item3 = new NormalItem({
  name: "Click the check box to cross the item",
});
const defaultNormalItemsList = [item1, item2, item3];

const listSchema = {
  name: String,
  items: [itemsSchema],
};

const List = mongoose.model("List", listSchema);

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  NormalItem.find()
    .exec()
    .then((defaultItemDB) => {
      if (defaultItemDB.length === 0) {
        // If the database is empty, insert the default items first
        NormalItem.insertMany(defaultNormalItemsList)
          .then(() => {
            // After inserting the default items, fetch them again
            return NormalItem.find().exec();
          })
          .then((defaultItems) => {
            res.render("list", {
              listTitile: day.getDate(),
              newListItem: defaultItems,
            });
          })
          .catch((err) => {
            console.log(err);
            res.status(500).send("Error inserting default items.");
          });
      } else {
        // If the database already has items, render the list directly
        res.render("list", {
          listTitile: day.getDate(),
          newListItem: defaultItemDB,
        });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send("Error fetching items from the database.");
    });
});

app.post("/", (req, res) => {
  var newI = req.body.newItem;
  const listName = req.body.List;
  const newItem = new NormalItem({
    name: newI,
  });

  if (listName === day.getDate()) {
    newItem.save();
    res.redirect("/");
  } else {
    List.findOne({ name: listName }).then((foundList) => {
      foundList.items.push(newItem);
      foundList.save();
      res.redirect("/" + listName);
    });
  }
});

app.post("/delete", async (req, res) => {
  const toDeleteID = req.body.checkedItem;
  const list_name = req.body.list_name;

  try {
    if (list_name === day.getDate()) {
      await NormalItem.deleteOne({ _id: toDeleteID });
      res.redirect("/");
    } else {
      await List.findOneAndUpdate(
        { name: list_name },
        { $pull: { items: { _id: toDeleteID } } }
      ).exec();
      res.redirect("/" + list_name);
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Error deleting items from the database.");
  }
});

app.get("/about", (req, res) => {
  res.render("about");
});

app.get("/:typeName", (req, res) => {
  const title = _.capitalize(req.params.typeName);

  List.findOne({ name: title }).then((foundList) => {
    if (!foundList) {
      const list = new List({
        name: title,
        items: defaultNormalItemsList,
      });

      list.save();
      res.redirect("/" + title);
    } else {
      res.render("list", { listTitile: title, newListItem: foundList.items });
    }
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server is listening on port ${port}`);
});
