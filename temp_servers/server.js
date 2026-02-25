import express from "express";
import dns from "dns";

dns.setServers([
    "8.8.8.8",
    "1.1.1.1"
]);

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.get("/err", (req, res) => {
    return 100 / 0
});

app.get("/crash", (req, res) => {

    const randomNo = Math.floor(
        Math.random() * (5 - 0) + 5
    )

    console.log(randomNo);

    if (randomNo % 2 == 0) {
        process.exit(1);
    } else {
        res.send("Server is running");
    }
});



app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
