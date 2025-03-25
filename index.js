import express from "express";
import cors from "cors";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();


const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to Neon PostgreSQL Database
const db = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: true // Changed for Neon Postgres
    },
});


// Connect to the database
db.connect()
    .then(() => console.log("Connected to PostgreSQL"))
    .catch(err => console.error("Connection error:", err));

// POST route to handle form submission
app.post("/register", async (req, res) => {
    try {
        const { name, password } = req.body;

        if (!name || !password) {
            return res.status(400).json({ message: "Username and password are required." });
        }

        // Check if user already exists
        const userCheck = await db.query("SELECT * FROM register WHERE name = $1", [name]);

        if (userCheck.rows.length > 0) {
            return res.status(409).json({ message: "User already exists. Please log in." });
        }

        // Insert new user
        await db.query("INSERT INTO register (name, password) VALUES ($1, $2)", [name, password]);
        res.status(201).json({ message: "Registration successful!" });

    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});

app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: "Username and password are required." });
        }

        // Check if the username and password match
        const result = await db.query(
            "SELECT * FROM register WHERE name = $1 AND password = $2",
            [username, password]
        );

        if (result.rows.length > 0) {
            res.status(200).json({ message: "Login successful!" });
        } else {
            res.status(401).json({ message: "Incorrect username or password." });
        }

    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ message: "Internal server error. Please try again." });
    }
});
app.post("/orders", async (req, res) => {
    try {
        console.log("Received order request:", req.body); // ✅ Debugging

        const { username, productId, productName, price, image } = req.body;

        if (!username || !productId || !productName || !price || !image) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const query = "INSERT INTO orders (username, product_id, product_name, price, image) VALUES ($1, $2, $3, $4, $5)";
        await db.query(query, [username, productId, productName, price, image]);

        res.status(201).json({ message: "Order placed successfully" });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});



app.get("/orders", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM orders ORDER BY id DESC");
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
app.get("/customers", async (req, res) => {
    try {
        const result = await db.query("SELECT name FROM register ");
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});




app.post("/admin/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: "Username and password are required." });
        }

        // Check if the username and password match
        const result = await db.query(
            "SELECT * FROM adminlogin WHERE username = $1 AND password = $2",
            [username, password]
        );

        if (result.rows.length > 0) {
            res.status(200).json({ message: "Login successful!" });
        } else {
            res.status(401).json({ message: "Incorrect username or password." });
        }

    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ message: "Internal server error. Please try again." });
    }
});


app.get("/orders/:username", async (req, res) => {
    try {
        const { username } = req.params;

        if (!username) {
            return res.status(400).json({ error: "Username is required" });
        }

        const result = await db.query("SELECT * FROM orders WHERE username = $1", [username]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "No orders found for this user" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
app.post("/add-to-cart", async (req, res) => {
    const { username, productId, title, price, image } = req.body;

    if (!username) {
        return res.status(400).json({ message: "Username is required" });
    }

    try {
        await db.query(
            "INSERT INTO cart (username, product_id, title, price, image) VALUES ($1, $2, $3, $4, $5)",
            [username, productId, title, price, image]
        );
        res.status(200).json({ message: "Product added to cart" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error adding to cart" });
    }
});
app.get("/cart/:username", async (req, res) => {
    const { username } = req.params;

    if (!username) {
        return res.status(400).json({ message: "Username is required" });
    }

    try {
        const result = await db.query("SELECT * FROM cart WHERE username = $1", [username]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Error fetching cart:", error);
        res.status(500).json({ message: "Error retrieving cart items" });
    }
});


app.post("/details", async (req, res) => {
    const { name, mobile, address } = req.body;

    // Validation
    if (!name || !/^[A-Za-z\s]+$/.test(name)) {
        return res.status(400).json({ error: "Invalid or missing name" });
    }
    if (!mobile || !/^\d{10}$/.test(mobile)) {
        return res.status(400).json({ error: "Invalid or missing mobile number" });
    }
    if (!address.trim()) {
        return res.status(400).json({ error: "Address is required" });
    }

    try {
        // Insert into database
        const result = await db.query(
            "INSERT INTO details (name, mobile, address) VALUES ($1, $2, $3) RETURNING *",
            [name, mobile, address]
        );

        console.log("Received Name From React:", name);
        res.status(201).json({ message: "Details stored successfully", user: result.rows[0] });
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ error: "Database error" });
    }
});
app.post("/product",async (req,res)=>{
    const { name, description, image, price } = req.body;
    try {
        const result = await db.query(
            "INSERT INTO products (name, description, image, price) VALUES ($1, $2, $3, $4) RETURNING *",
            [name, description, image, price]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
app.get("/products", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM products");
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
app.get("/products/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query("SELECT * FROM products WHERE id = $1", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Product not found" });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log("🚀 Server is running on port", process.env.PORT || 3000);
});
