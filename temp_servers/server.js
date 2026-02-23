import express from "express";

const app = express();
const PORT = 3000;

app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.get("/err", (req, res) => {
    process.exit(1);
})

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
